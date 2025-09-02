import { db } from "@/lib/firebase";
import { ExpenseCategory } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

const CATEGORIES_COLLECTION = "expense_categories";

const categoryFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): ExpenseCategory => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        isActive: data.isActive,
    }
}

export const getExpenseCategories = async (): Promise<ExpenseCategory[]> => {
    const q = query(
        collection(db, CATEGORIES_COLLECTION),
        where("isActive", "==", true),
        orderBy("name", "asc")
    );
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(categoryFromDoc);
    } catch (error) {
        console.error("Error fetching expense categories: ", error);
        throw new Error("Failed to fetch expense categories.");
    }
}

export const addExpenseCategory = async (
    categoryData: Omit<ExpenseCategory, 'id'>
): Promise<ExpenseCategory> => {
    try {
        const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), categoryData);
        return {
            id: docRef.id,
            ...categoryData,
        };
    } catch (error) {
        console.error("Error adding expense category: ", error);
        throw new Error("Failed to add expense category.");
    }
};

export const updateExpenseCategory = async (
    categoryId: string,
    dataToUpdate: Partial<Omit<ExpenseCategory, 'id'>>
): Promise<void> => {
    try {
        const categoryRef = doc(db, CATEGORIES_COLLECTION, categoryId);
        await updateDoc(categoryRef, dataToUpdate);
    } catch (error) {
        console.error("Error updating expense category: ", error);
        throw new Error("Failed to update expense category.");
    }
}
