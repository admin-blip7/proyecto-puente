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
} from "firebase/firestore";

const CATEGORIES_COLLECTION = "product_categories";

const categoryFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): ProductCategory => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
    }
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
        const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
            name: normalizedName,
        });
        return docRef.id;
    }
};
