import { db } from "@/lib/firebase";
import { Repair } from "@/types";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

const REPAIRS_COLLECTION = "repairs";

const repairFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Repair => {
    const data = doc.data();
    return {
        id: doc.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deviceModel: data.deviceModel,
        deviceImei: data.deviceImei,
        reportedIssue: data.reportedIssue,
        status: data.status,
        technicianNotes: data.technicianNotes,
        cost: data.cost,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
    };
}

export const getRepairs = async (): Promise<Repair[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, REPAIRS_COLLECTION));
        const repairs = querySnapshot.docs.map(repairFromDoc);
        return repairs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error("Error fetching repairs:", error);
        return [];
    }
};

export const addRepair = async (repairData: Omit<Repair, 'id' | 'createdAt' | 'status' | 'cost'>): Promise<Repair> => {
    try {
        const docRef = await addDoc(collection(db, REPAIRS_COLLECTION), {
            ...repairData,
            status: 'Ingresado',
            cost: 0,
            createdAt: serverTimestamp(),
        });

        return {
            id: docRef.id,
            ...repairData,
            status: 'Ingresado',
            cost: 0,
            createdAt: new Date(),
        };

    } catch (error) {
        console.error("Error adding repair: ", error);
        throw new Error("Failed to add repair.");
    }
};

export const updateRepair = async (repairId: string, dataToUpdate: Partial<Repair>): Promise<void> => {
    try {
        const repairRef = doc(db, REPAIRS_COLLECTION, repairId);
        const updateData: Partial<Repair> & { completedAt?: any } = { ...dataToUpdate };

        if (dataToUpdate.status === 'Entregado') {
            updateData.completedAt = serverTimestamp();
        }

        await updateDoc(repairRef, updateData as any);
    } catch (error) {
        console.error("Error updating repair:", error);
        throw new Error("Failed to update repair.");
    }
};
