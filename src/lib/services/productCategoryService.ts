
import { db } from "@/lib/firebase";
import { ProductCategory } from "@/types";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const CATEGORIES_COLLECTION = "product_categories";

const categoryFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): ProductCategory => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
    }
}

/**
 * Searches for categories matching a term.
 * Requires a composite index in Firestore if you add more constraints.
 * Firestore Index URL (example): https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore/indexes/composite-create
 * Collection ID: product_categories
 * Fields to index: name (Ascending), isActive (Ascending)
 * @param term The search term.
 * @param max The maximum number of results to return.
 * @returns A promise that resolves to an array of category options.
 */
export async function searchCategories(term: string, max = 20): Promise<ProductCategory[]> {
  const col = collection(db, CATEGORIES_COLLECTION);
  const start = term.trim() ?? '';
  const end = `${start}\uf8ff`;
  
  const q = query(
    col, 
    where('name', '>=', start), 
    where('name', '<=', end), 
    orderBy('name'), 
    limit(max)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, name: (d.data().name as string) ?? '' }));
}

export const getProductCategories = async (): Promise<ProductCategory[]> => {
    const q = query(
        collection(db, CATEGORIES_COLLECTION),
        orderBy("name")
    );
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(categoryFromDoc);
    } catch (error) {
        console.error("Error fetching product categories: ", error);
        throw new Error("Failed to fetch product categories.");
    }
}

export const createCategory = async (name: string): Promise<ProductCategory> => {
    const newCategoryData = {
        name: name.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), newCategoryData);
    return {
        id: docRef.id,
        name: newCategoryData.name,
    };
};

export const findOrCreateCategory = async (categoryName: string): Promise<string> => {
    if (!categoryName?.trim()) {
        return "";
    }
    
    const normalizedName = categoryName.trim();
    
    const q = query(
        collection(db, CATEGORIES_COLLECTION), 
        where("name", "==", normalizedName), 
        limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    } else {
        const newCategory = await createCategory(normalizedName);
        return newCategory.id;
    }
};
