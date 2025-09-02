import { db } from "@/lib/firebase";
import { Warranty } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

const WARRANTIES_COLLECTION = "warranties";

const warrantyFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Warranty => {
    const data = doc.data();
    return {
        id: doc.id,
        saleId: data.saleId,
        productId: data.productId,
        productName: data.productName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        reason: data.reason,
        status: data.status,
        reportedAt: data.reportedAt.toDate(),
        resolutionDetails: data.resolutionDetails,
        resolvedAt: data.resolvedAt ? data.resolvedAt.toDate() : undefined,
    };
}

export const getWarranties = async (): Promise<Warranty[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, WARRANTIES_COLLECTION));
        const warranties = querySnapshot.docs.map(warrantyFromDoc);
        // sort by reportedAt descending
        return warranties.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    } catch (error) {
        console.error("Error fetching warranties:", error);
        return [];
    }
};

export const addWarranty = async (warrantyData: Omit<Warranty, 'id' | 'reportedAt' | 'status'>): Promise<Warranty> => {
    try {
        const docRef = await addDoc(collection(db, WARRANTIES_COLLECTION), {
            ...warrantyData,
            status: 'Pendiente',
            reportedAt: serverTimestamp(),
        });

        return {
            id: docRef.id,
            ...warrantyData,
            status: 'Pendiente',
            reportedAt: new Date(),
        };

    } catch (error) {
        console.error("Error adding warranty: ", error);
        throw new Error("Failed to add warranty.");
    }
};
