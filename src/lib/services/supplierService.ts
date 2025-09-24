import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { Supplier } from "@/types";
import { getLogger } from "@/lib/logger";
const log = getLogger("supplierService");

// Crear un nuevo proveedor
export async function addSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchasedYTD'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "suppliers"), {
      ...supplierData,
      totalPurchasedYTD: 0, // Inicializar en 0
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    log.error("Error adding supplier:", error);
    throw error;
  }
}

// Obtener todos los proveedores
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const q = query(collection(db, "suppliers"), orderBy("name"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Supplier[];
  } catch (error) {
    log.error("Error getting suppliers:", error);
    throw error;
  }
}

// Obtener un proveedor por ID
export async function getSupplierById(supplierId: string): Promise<Supplier | null> {
  try {
    const docRef = doc(db, "suppliers", supplierId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
      } as Supplier;
    }
    return null;
  } catch (error) {
    log.error("Error getting supplier:", error);
    throw error;
  }
}

// Actualizar información del proveedor
export async function updateSupplier(supplierId: string, updates: Partial<Omit<Supplier, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const docRef = doc(db, "suppliers", supplierId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    log.error("Error updating supplier:", error);
    throw error;
  }
}

// Eliminar proveedor
export async function deleteSupplier(supplierId: string): Promise<void> {
  try {
    const docRef = doc(db, "suppliers", supplierId);
    await deleteDoc(docRef);
  } catch (error) {
    log.error("Error deleting supplier:", error);
    throw error;
  }
}

// Actualizar el total de compras del año (YTD)
export async function updateSupplierPurchaseTotal(supplierId: string, purchaseAmount: number): Promise<void> {
  try {
    const docRef = doc(db, "suppliers", supplierId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const currentTotal = docSnap.data().totalPurchasedYTD || 0;
      await updateDoc(docRef, {
        totalPurchasedYTD: currentTotal + purchaseAmount,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    log.error("Error updating supplier purchase total:", error);
    throw error;
  }
}

// Buscar proveedores por nombre
export async function searchSuppliers(searchTerm: string): Promise<Supplier[]> {
  try {
    const suppliers = await getSuppliers();
    const normalizedSearch = searchTerm.toLowerCase().trim();
    
    return suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(normalizedSearch) ||
      supplier.contactInfo.toLowerCase().includes(normalizedSearch)
    );
  } catch (error) {
    log.error("Error searching suppliers:", error);
    throw error;
  }
}