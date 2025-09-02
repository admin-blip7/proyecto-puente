import { db, storage } from "@/lib/firebase";
import { ConsignorPayment, PaymentMethod } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  runTransaction,
  doc,
  query,
  where,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
  increment,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

const CONSIGNOR_PAYMENTS_COLLECTION = "consignor_payments";
const CONSIGNORS_COLLECTION = "consignors";
const STORAGE_PAYMENT_PROOFS_PATH = "payment_proofs";

const paymentFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): ConsignorPayment => {
    const data = doc.data();
    return {
        id: doc.id,
        paymentId: data.paymentId,
        consignorId: data.consignorId,
        amountPaid: data.amountPaid,
        paymentDate: data.paymentDate.toDate(),
        paymentMethod: data.paymentMethod,
        proofOfPaymentUrl: data.proofOfPaymentUrl,
        notes: data.notes,
    }
}

export const getConsignorPayments = async (consignorId: string): Promise<ConsignorPayment[]> => {
    const q = query(
        collection(db, CONSIGNOR_PAYMENTS_COLLECTION),
        where("consignorId", "==", consignorId),
        orderBy("paymentDate", "desc")
    );

    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(paymentFromDoc);
    } catch (error) {
        console.error("Error fetching payment history: ", error);
        throw new Error("Failed to fetch payment history.");
    }
}


const uploadProofOfPayment = async (file: File, consignorId: string, paymentId: string): Promise<string> => {
    const filePath = `${STORAGE_PAYMENT_PROOFS_PATH}/${consignorId}/${paymentId}-${file.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};


export const addConsignorPayment = async (
    paymentData: Omit<ConsignorPayment, 'id' | 'paymentId' | 'paymentDate' | 'proofOfPaymentUrl'>,
    proofFile: File
) => {
    const paymentId = `PAY-${uuidv4().split('-')[0].toUpperCase()}`;
    const { consignorId, amountPaid } = paymentData;

    if (!consignorId) {
        throw new Error("Consignor ID is required.");
    }
    if (!proofFile) {
        throw new Error("Proof of payment file is required.");
    }

    try {
        const proofOfPaymentUrl = await uploadProofOfPayment(proofFile, consignorId, paymentId);

        await runTransaction(db, async (transaction) => {
            const consignorRef = doc(db, CONSIGNORS_COLLECTION, consignorId);
            const paymentRef = doc(collection(db, CONSIGNOR_PAYMENTS_COLLECTION));

            // 1. Create the payment record
            transaction.set(paymentRef, {
                ...paymentData,
                paymentId,
                proofOfPaymentUrl,
                paymentDate: serverTimestamp(),
            });

            // 2. Decrement the consignor's balance
            transaction.update(consignorRef, {
                balanceDue: increment(-amountPaid)
            });
        });

    } catch (error) {
        console.error("Error processing consignor payment: ", error);
        throw new Error("Failed to process payment.");
    }
};
