import { db } from "@/lib/firebase";
import { Consignor } from "@/types";
import { collection, getDocs, doc, DocumentData, QueryDocumentSnapshot, serverTimestamp, Transaction, updateDoc, increment } from "firebase/firestore";

const CONSIGNORS_COLLECTION = "consignors";

const consignorFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Consignor => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        contactInfo: data.contactInfo,
        balanceDue: data.balanceDue,
    };
}

export const getConsignors = async (): Promise<Consignor[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, CONSIGNORS_COLLECTION));
        const consignors = querySnapshot.docs.map(consignorFromDoc);
        return consignors.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching consignors:", error);
        return [];
    }
}

export const updateConsignorBalance = async (transaction: Transaction, consignorId: string, amountToAdd: number) => {
    const consignorRef = doc(db, CONSIGNORS_COLLECTION, consignorId);
    // This function must be called within a transaction to ensure atomicity.
    // It will increment the balanceDue by the specified amount.
    transaction.update(consignorRef, { balanceDue: increment(amountToAdd) });
}
