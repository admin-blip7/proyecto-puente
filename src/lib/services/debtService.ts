import { db } from "@/lib/firebase";
import { Debt } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const DEBTS_COLLECTION = "debts";

const debtFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Debt => {
    const data = doc.data();
    return {
        id: doc.id,
        creditorName: data.creditorName,
        debtType: data.debtType,
        currentBalance: data.currentBalance,
        createdAt: data.createdAt.toDate(),
        totalLimit: data.totalLimit,
        closingDate: data.closingDate,
        paymentDueDate: data.paymentDueDate,
        interestRate: data.interestRate,
        cat: data.cat,
    };
};

export const getDebts = async (): Promise<Debt[]> => {
  const q = query(collection(db, DEBTS_COLLECTION), orderBy("createdAt", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(debtFromDoc);
  } catch (error) {
    console.error("Error fetching debts: ", error);
    throw new Error("Failed to fetch debts.");
  }
};

export const addDebt = async (
  debtData: Omit<Debt, "id" | "createdAt">
): Promise<Debt> => {
  try {
    const docRef = await addDoc(collection(db, DEBTS_COLLECTION), {
        ...debtData,
        createdAt: serverTimestamp()
    });
    return {
      id: docRef.id,
      createdAt: new Date(),
      ...debtData,
    };
  } catch (error) {
    console.error("Error adding debt: ", error);
    throw new Error("Failed to add debt.");
  }
};

export const updateDebt = async (
  debtId: string,
  dataToUpdate: Partial<Omit<Debt, "id">>
): Promise<void> => {
  try {
    const debtRef = doc(db, DEBTS_COLLECTION, debtId);
    await updateDoc(debtRef, dataToUpdate);
  } catch (error) {
    console.error("Error updating debt: ", error);
    throw new Error("Failed to update debt.");
  }
};

export const deleteDebt = async (debtId: string): Promise<void> => {
    try {
        const debtRef = doc(db, DEBTS_COLLECTION, debtId);
        await deleteDoc(debtRef);
    } catch (error) {
        console.error("Error deleting debt:", error);
        throw new Error("Failed to delete debt.")
    }
}
