import { db } from "@/lib/firebase";
import { Sale, CartItem, SaleItem } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';


const SALES_COLLECTION = "sales";
const PRODUCTS_COLLECTION = "products";

const saleFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Sale => {
    const data = doc.data();
    return {
        id: doc.id,
        saleId: data.saleId,
        items: data.items,
        totalAmount: data.totalAmount,
        paymentMethod: data.paymentMethod,
        cashierId: data.cashierId,
        cashierName: data.cashierName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        createdAt: data.createdAt.toDate(),
    };
}


export const getSales = async (): Promise<Sale[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, SALES_COLLECTION));
        return querySnapshot.docs.map(saleFromDoc);
    } catch (error) {
        console.error("Error fetching sales:", error);
        return [];
    }
};

export const addSaleAndUpdateStock = async (
    saleData: Omit<Sale, 'id' | 'saleId' | 'createdAt'>,
    cartItems: CartItem[]
): Promise<void> => {
    const batch = writeBatch(db);

    // 1. Add the sale document
    const saleRef = doc(collection(db, SALES_COLLECTION));
    batch.set(saleRef, {
        ...saleData,
        saleId: `SALE-${uuidv4().split('-')[0].toUpperCase()}`,
        createdAt: serverTimestamp(),
    });

    // 2. Update stock for each product in the sale
    for (const item of cartItems) {
        const productRef = doc(db, PRODUCTS_COLLECTION, item.id);
        const newStock = item.stock - item.quantity;
        batch.update(productRef, { stock: newStock });
    }

    try {
        await batch.commit();
    } catch (error) {
        console.error("Error processing sale and updating stock: ", error);
        throw new Error("Failed to process sale transaction.");
    }
};
