import { db } from "@/lib/firebase";
import { RepairOrder, RepairPart, Product } from "@/types";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, DocumentData, QueryDocumentSnapshot, runTransaction, writeBatch, increment } from "firebase/firestore";

const REPAIRS_COLLECTION = "repair_orders";
const PRODUCTS_COLLECTION = "products";
const INVENTORY_LOGS_COLLECTION = "inventory_logs";

const repairOrderFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): RepairOrder => {
    const data = doc.data();
    return {
        id: doc.id,
        orderId: data.orderId,
        status: data.status,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deviceBrand: data.deviceBrand,
        deviceModel: data.deviceModel,
        deviceSerialIMEI: data.deviceSerialIMEI,
        reportedIssue: data.reportedIssue,
        technicianNotes: data.technicianNotes,
        partsUsed: data.partsUsed || [],
        laborCost: data.laborCost || 0,
        totalCost: data.totalCost || 0,
        totalPrice: data.totalPrice || 0,
        profit: data.profit || 0,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
    };
}

export const getRepairOrders = async (): Promise<RepairOrder[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, REPAIRS_COLLECTION));
        const orders = querySnapshot.docs.map(repairOrderFromDoc);
        return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error("Error fetching repair orders:", error);
        return [];
    }
};

const getNextOrderId = async (): Promise<string> => {
    const querySnapshot = await getDocs(collection(db, REPAIRS_COLLECTION));
    const count = querySnapshot.size;
    return `REP-${(count + 1).toString().padStart(4, '0')}`;
}

export const addRepairOrder = async (orderData: Omit<RepairOrder, 'id' | 'orderId' | 'createdAt' | 'status' | 'partsUsed' | 'laborCost' | 'totalCost' | 'totalPrice' | 'profit'>): Promise<RepairOrder> => {
    try {
        const orderId = await getNextOrderId();
        const docRef = await addDoc(collection(db, REPAIRS_COLLECTION), {
            ...orderData,
            orderId: orderId,
            status: 'Recibido',
            partsUsed: [],
            laborCost: 0,
            totalCost: 0,
            totalPrice: 0,
            profit: 0,
            createdAt: serverTimestamp(),
        });

        const newOrder: RepairOrder = {
            id: docRef.id,
            orderId: orderId,
            status: 'Recibido',
            partsUsed: [],
            laborCost: 0,
            totalCost: 0,
            totalPrice: 0,
            profit: 0,
            createdAt: new Date(),
            ...orderData,
        };
        
        return newOrder;

    } catch (error) {
        console.error("Error adding repair order: ", error);
        throw new Error("Failed to add repair order.");
    }
};

export const updateRepairOrder = async (orderId: string, dataToUpdate: Partial<RepairOrder>): Promise<void> => {
    try {
        const orderRef = doc(db, REPAIRS_COLLECTION, orderId);
        await updateDoc(orderRef, dataToUpdate);
    } catch (error) {
        console.error("Error updating repair order:", error);
        throw new Error("Failed to update repair order.");
    }
}

export const addPartToRepairOrder = async (
    order: RepairOrder,
    part: Product,
    quantity: number,
    userId: string
  ): Promise<RepairOrder> => {
    const productRef = doc(db, PRODUCTS_COLLECTION, part.id);
    const orderRef = doc(db, REPAIRS_COLLECTION, order.id);
  
    return runTransaction(db, async (transaction) => {
      // --- READ PHASE ---
      const productDoc = await transaction.get(productRef);
      
      if (!productDoc.exists() || productDoc.data().stock < quantity) {
        throw new Error("Stock insuficiente o producto no encontrado.");
      }
      
      // --- WRITE PHASE ---
      const newStock = productDoc.data().stock - quantity;
      transaction.update(productRef, { stock: newStock });
  
      const logRef = doc(collection(db, INVENTORY_LOGS_COLLECTION));
      transaction.set(logRef, {
        productId: part.id,
        productName: part.name,
        change: -quantity,
        reason: "Uso en Reparación",
        updatedBy: userId,
        createdAt: serverTimestamp(),
        metadata: { repairOrderId: order.orderId, cost: part.cost }
      });
  
      const existingPartIndex = order.partsUsed.findIndex(p => p.productId === part.id);
      let newPartsUsed = [...order.partsUsed];
  
      if (existingPartIndex > -1) {
        newPartsUsed[existingPartIndex].quantity += quantity;
      } else {
        newPartsUsed.push({
          productId: part.id,
          name: part.name,
          quantity: quantity,
          cost: part.cost,
          price: part.price,
        });
      }
      
      const newTotalCost = newPartsUsed.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
      const newTotalPrice = newPartsUsed.reduce((sum, p) => sum + (p.price * p.quantity), 0) + order.laborCost;
      const newProfit = newTotalPrice - newTotalCost;
  
      const updatedOrderData: Partial<RepairOrder> = {
        partsUsed: newPartsUsed,
        totalCost: newTotalCost,
        totalPrice: newTotalPrice,
        profit: newProfit
      };
      
      transaction.update(orderRef, updatedOrderData);
  
      return { ...order, ...updatedOrderData };
    });
  };

