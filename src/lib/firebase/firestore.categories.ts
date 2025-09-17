
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, limit, DocumentData, QueryDocumentSnapshot, orderBy, serverTimestamp, getDoc, doc } from "firebase/firestore";

const CATEGORIES_COLLECTION = "product_categories";

type CategoryOption = { id: string; label: string };

/**
 * Searches for categories matching a term.
 * If the term is empty, it returns the most recently used/created categories.
 * 
 * Firestore Index Requirement:
 * This query may require a composite index on `isActive` and `name`. If Firestore throws an error,
 * create the index using the URL provided in the error message.
 * Example URL: https://console.firebase.google.com/project/[YOUR_PROJECT_ID]/firestore/indexes/composite-create
 * Collection ID: product_categories
 * Fields to index:
 *   1. isActive (Ascending)
 *   2. name (Ascending)
 * 
 * @param term The search term.
 * @param max The maximum number of results to return.
 * @returns A promise that resolves to an array of category options.
 */
export async function searchCategories(term: string, max = 20): Promise<CategoryOption[]> {
  const col = collection(db, CATEGORIES_COLLECTION);
  const t = (term ?? '').trim();
  
  let q;
  if (t) {
    const end = `${t}\uf8ff`;
    q = query(
      col, 
      where('name', '>=', t), 
      where('name', '<=', end), 
      limit(max)
    );
  } else {
    // If no search term, fetch some default/recent categories
    q = query(col, orderBy('name'), limit(max));
  }
  
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, label: String((d.data() as any).name ?? '') }));
}

/**
 * Retrieves a single category by its document ID.
 * @param id The document ID of the category.
 * @returns A promise that resolves to the category data or null if not found.
 */
export async function getCategoryById(id: string) {
    if (!id) return null;
    const d = await getDoc(doc(db, CATEGORIES_COLLECTION, id));
    return d.exists() ? { id: d.id, ...d.data() } : null;
}

/**
 * Creates a new category document in Firestore.
 * @param name The name of the new category.
 * @returns A promise that resolves to the new document's ID.
 */
export async function createCategory(name: string): Promise<string> {
  const newCategoryData = {
    name: name.trim(),
    isActive: true, // Default to active
    createdAt: serverTimestamp(),
  };
  const d = await addDoc(collection(db, CATEGORIES_COLLECTION), newCategoryData);
  return d.id;
}
