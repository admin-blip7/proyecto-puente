import { db, storage } from "@/lib/firebase";
import { ClientPayment } from "@/types";
import {
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
  doc,
  increment,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

const CLIENT_PAYMENTS_COLLECTION = "client_payments";
const CREDIT_ACCOUNTS_COLLECTION = "credit_accounts";
const ACCOUNTS_COLLECTION = "accounts";


export const addClientPayment = async (
    paymentData: Omit<ClientPayment, 'id' | 'paymentId' | 'paymentDate'>,
    depositAccountId: string
) => {
    const paymentId = `CPAY-${uuidv4().split('-')[0].toUpperCase()}`;
    const { accountId, amountPaid } = paymentData;

    if (!accountId || !depositAccountId) {
        throw new Error("Credit Account ID and Deposit Account ID are required.");
    }

    try {
        await runTransaction(db, async (transaction) => {
            const creditAccountRef = doc(db, CREDIT_ACCOUNTS_COLLECTION, accountId);
            const depositAccountRef = doc(db, ACCOUNTS_COLLECTION, depositAccountId);
            const paymentRef = doc(collection(db, CLIENT_PAYMENTS_COLLECTION));

            // --- READ PHASE ---
            const creditAccountDoc = await transaction.get(creditAccountRef);
            const depositAccountDoc = await transaction.get(depositAccountRef);

            if (!creditAccountDoc.exists()) {
                throw new Error("La cuenta de crédito del cliente no existe.");
            }
             if (!depositAccountDoc.exists()) {
                throw new Error("La cuenta de depósito no existe.");
            }

            // --- WRITE PHASE ---
            // 1. Create the payment record
            transaction.set(paymentRef, {
                ...paymentData,
                paymentId,
                paymentDate: serverTimestamp(),
            });

            // 2. Decrement the client's credit balance
            transaction.update(creditAccountRef, {
                currentBalance: increment(-amountPaid)
            });

            // 3. Increment the store's deposit account balance
            transaction.update(depositAccountRef, {
                currentBalance: increment(amountPaid)
            });
        });

    } catch (error) {
        console.error("Error processing client payment: ", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error("Failed to process payment.");
    }
};
