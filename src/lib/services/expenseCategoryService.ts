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
import { getLogger } from "@/lib/logger";
const log = getLogger("expenseCategoryService");
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
        where("isActive", "==", true)
    );
    try {
        const querySnapshot = await getDocs(q);
        const categories = querySnapshot.docs.map(categoryFromDoc);
        // Sort client-side to avoid composite index requirement
        return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        log.error("Error fetching expense categories: ", error);
        throw error;
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
        log.error("Error adding expense category: ", error);
        throw error;
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
        log.error("Error updating expense category: ", error);
        throw error;
    }
}
