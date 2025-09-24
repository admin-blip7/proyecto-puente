import { db } from "@/lib/firebase";
import { Consignor } from "@/types";
import { collection, getDocs, doc, DocumentData, QueryDocumentSnapshot, serverTimestamp, Transaction, updateDoc, increment, addDoc, deleteDoc } from "firebase/firestore";
import { getLogger } from "@/lib/logger";
const log = getLogger("consignorService");
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
        log.error("Error fetching consignors:", error);
        return [];
    }
}

export const addConsignor = async (data: Omit<Consignor, 'id' | 'balanceDue'>): Promise<Consignor> => {
    try {
        const docRef = await addDoc(collection(db, CONSIGNORS_COLLECTION), {
            ...data,
            balanceDue: 0
        });
        return {
            id: docRef.id,
            ...data,
            balanceDue: 0
        };
    } catch (error) {
        log.error("Error adding consignor:", error);
        throw new Error("Failed to add consignor.");
    }
};

export const updateConsignorInfo = async (consignorId: string, data: Partial<Omit<Consignor, 'id' | 'balanceDue'>>): Promise<void> => {
    try {
        const consignorRef = doc(db, CONSIGNORS_COLLECTION, consignorId);
        await updateDoc(consignorRef, data);
    } catch (error) {
        log.error("Error updating consignor:", error);
        throw new Error("Failed to update consignor.");
    }
}

export const deleteConsignor = async (consignorId: string): Promise<void> => {
    try {
        const consignorRef = doc(db, CONSIGNORS_COLLECTION, consignorId);
        await deleteDoc(consignorRef);
    } catch (error) {
        log.error("Error deleting consignor:", error);
        throw new Error("Failed to delete consignor.");
    }
}


export const updateConsignorBalance = async (transaction: Transaction, consignorId: string, amountToAdd: number) => {
    const consignorRef = doc(db, CONSIGNORS_COLLECTION, consignorId);
    // This function must be called within a transaction to ensure atomicity.
    // It will increment the balanceDue by the specified amount.
    transaction.update(consignorRef, { balanceDue: increment(amountToAdd) });
}
