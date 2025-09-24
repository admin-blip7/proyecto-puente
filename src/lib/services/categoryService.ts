import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { getLogger } from "@/lib/logger";
const log = getLogger("categoryService");

export interface Category {
  id: string;
  name: string;
  createdAt: Date;
}

export async function searchCategories(searchTerm: string): Promise<Category[]> {
  try {
    const categoriesRef = collection(db, 'categories');
    const q = query(
      categoriesRef,
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff'),
      orderBy('name'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    log.error('Error searching categories:', error);
    return [];
  }
}

export async function createCategory(name: string): Promise<string> {
  try {
    const categoriesRef = collection(db, 'categories');
    const docRef = await addDoc(categoriesRef, {
      name,
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    log.error('Error creating category:', error);
    throw error;
  }
}