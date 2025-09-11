import { db, storage } from "@/lib/firebase";
import { DebtPayment } from "@/types";
import {
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
  doc,
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const DEBT_PAYMENTS_COLLECTION = "debt_payments";
const DEBTS_COLLECTION = "debts";
const ACCOUNTS_COLLECTION = "accounts";
const STORAGE_DEBT_PROOFS_PATH = "debt_proofs";


const uploadProof = async (file: File, debtId: string, paymentId: string): Promise<string> => {
    const filePath = `${STORAGE_DEBT_PROOFS_PATH}/${debtId}/${paymentId}-${file.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};


export const addDebtPayment = async (
    paymentData: Omit<DebtPayment, 'id' | 'paymentId' | 'paymentDate' | 'proofUrl'>,
    proofFile?: File
) => {
    const paymentId = `DPMT-${uuidv4().split('-')[0].toUpperCase()}`;
    const { debtId, amountPaid, paidFromAccountId } = paymentData;

    if (!debtId || !paidFromAccountId) {
        throw new Error("Debt ID and Account ID are required.");
    }

    try {
        let proofUrl: string | undefined = undefined;
        if (proofFile) {
            proofUrl = await uploadProof(proofFile, debtId, paymentId);
        }

        await runTransaction(db, async (transaction) => {
            const debtRef = doc(db, DEBTS_COLLECTION, debtId);
            const accountRef = doc(db, ACCOUNTS_COLLECTION, paidFromAccountId);
            const paymentRef = doc(collection(db, DEBT_PAYMENTS_COLLECTION));

            // --- READ PHASE ---
            const accountDoc = await transaction.get(accountRef);
            if (!accountDoc.exists() || accountDoc.data().currentBalance < amountPaid) {
                throw new Error("Saldo insuficiente en la cuenta de origen.");
            }

            // --- WRITE PHASE ---
            // 1. Create the payment record
            transaction.set(paymentRef, {
                ...paymentData,
                paymentId,
                proofUrl,
                paymentDate: serverTimestamp(),
            });

            // 2. Decrement the debt's balance
            transaction.update(debtRef, {
                currentBalance: increment(-amountPaid)
            });

            // 3. Decrement the source account's balance
            transaction.update(accountRef, {
                currentBalance: increment(-amountPaid)
            });
        });

    } catch (error) {
        console.error("Error processing debt payment: ", error);
        if (error instanceof Error) {
            throw error; // Re-throw the original error to be caught by the UI
        }
        throw new Error("Failed to process payment.");
    }
};
