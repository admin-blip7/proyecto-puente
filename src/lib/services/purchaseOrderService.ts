import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderHistoryEntry } from "@/types";
import { getLogger } from "@/lib/logger";
const log = getLogger("purchaseOrderService");

// Crear nueva orden de compra
export async function addPurchaseOrder(orderData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "purchase_orders"), {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    log.error("Error adding purchase order:", error);
    throw error;
  }
}

// Obtener orden de compra por ID
export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  try {
    const docRef = doc(db, "purchase_orders", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PurchaseOrder;
    }
    return null;
  } catch (error) {
    log.error("Error getting purchase order:", error);
    throw error;
  }
}

// Obtener todas las órdenes de compra
export async function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  try {
    const q = query(collection(db, "purchase_orders"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PurchaseOrder;
    });
  } catch (error) {
    log.error("Error getting purchase orders:", error);
    throw error;
  }
}

// Obtener órdenes de compra por proveedor
export async function getPurchaseOrdersBySupplier(supplierName: string): Promise<PurchaseOrder[]> {
  try {
    const q = query(
      collection(db, "purchase_orders"),
      where("supplier", "==", supplierName),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PurchaseOrder;
    });
  } catch (error) {
    log.error("Error getting purchase orders by supplier:", error);
    throw error;
  }
}

// Actualizar orden de compra
export async function updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<void> {
  try {
    const docRef = doc(db, "purchase_orders", id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    log.error("Error updating purchase order:", error);
    throw error;
  }
}

// Actualizar estado de orden de compra
export async function updatePurchaseOrderStatus(
  id: string, 
  status: PurchaseOrder['status'], 
  notes?: string,
  user: string = 'Usuario Actual'
): Promise<void> {
  try {
    const docRef = doc(db, "purchase_orders", id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error("Purchase order not found");
    }
    
    const currentData = docSnap.data() as PurchaseOrder;
    const newHistoryEntry: PurchaseOrderHistoryEntry = {
      action: `Estado cambiado a ${status}`,
      status,
      timestamp: new Date(),
      user,
      notes
    };
    
    await updateDoc(docRef, {
      status,
      history: [...(currentData.history || []), newHistoryEntry],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    log.error("Error updating purchase order status:", error);
    throw error;
  }
}

// Agregar entrada al historial
export async function addPurchaseOrderHistoryEntry(
  id: string, 
  entry: Omit<PurchaseOrderHistoryEntry, 'timestamp'>
): Promise<void> {
  try {
    const docRef = doc(db, "purchase_orders", id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error("Purchase order not found");
    }
    
    const currentData = docSnap.data() as PurchaseOrder;
    const newHistoryEntry: PurchaseOrderHistoryEntry = {
      ...entry,
      timestamp: new Date()
    };
    
    await updateDoc(docRef, {
      history: [...(currentData.history || []), newHistoryEntry],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    log.error("Error adding purchase order history entry:", error);
    throw error;
  }
}

// Eliminar orden de compra
export async function deletePurchaseOrder(id: string): Promise<void> {
  try {
    const docRef = doc(db, "purchase_orders", id);
    await deleteDoc(docRef);
  } catch (error) {
    log.error("Error deleting purchase order:", error);
    throw error;
  }
}

// Obtener estadísticas de órdenes de compra por proveedor
export async function getPurchaseOrderStatsBySupplier(supplierName: string): Promise<{
  totalOrders: number;
  totalAmount: number;
  pendingOrders: number;
  receivedOrders: number;
  cancelledOrders: number;
}> {
  try {
    const orders = await getPurchaseOrdersBySupplier(supplierName);
    
    const stats = {
      totalOrders: orders.length,
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      pendingOrders: orders.filter(order => order.status === 'pending').length,
      receivedOrders: orders.filter(order => order.status === 'received').length,
      cancelledOrders: orders.filter(order => order.status === 'cancelled').length,
    };
    
    return stats;
  } catch (error) {
    log.error("Error getting purchase order stats:", error);
    throw error;
  }
}

// Buscar órdenes de compra por número de orden
export async function searchPurchaseOrdersByNumber(orderNumber: string): Promise<PurchaseOrder[]> {
  try {
    const q = query(
      collection(db, "purchase_orders"),
      where("orderNumber", ">=", orderNumber),
      where("orderNumber", "<=", orderNumber + '\uf8ff'),
      orderBy("orderNumber"),
      limit(10)
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as PurchaseOrder;
    });
  } catch (error) {
    log.error("Error searching purchase orders:", error);
    throw error;
  }
}