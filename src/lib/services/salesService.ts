import { db } from "@/lib/firebase";
import { Sale, CartItem, Product } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc, DocumentData, QueryDocumentSnapshot, getDoc, runTransaction } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { getProductById } from "./productService";
import { updateConsignorBalance } from "./consignorService";


const SALES_COLLECTION = "sales";
const PRODUCTS_COLLECTION = "products";
const INVENTORY_LOGS_COLLECTION = "inventory_logs";

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
        const sales = querySnapshot.docs.map(saleFromDoc);
        return sales.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error("Error fetching sales:", error);
        return [];
    }
};

export const addSaleAndUpdateStock = async (
    saleData: Omit<Sale, 'id' | 'saleId' | 'createdAt'>,
    cartItems: CartItem[]
): Promise<string> => {
    const saleId = `SALE-${uuidv4().split('-')[0].toUpperCase()}`;

    await runTransaction(db, async (transaction) => {
        // 1. Add the sale document
        const saleRef = doc(collection(db, SALES_COLLECTION));
        transaction.set(saleRef, {
            ...saleData,
            saleId: saleId,
            createdAt: serverTimestamp(),
        });

        // 2. Process each item in the cart
        for (const item of cartItems) {
            const productRef = doc(db, PRODUCTS_COLLECTION, item.id);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) {
                throw new Error(`Producto ${item.name} no encontrado.`);
            }

            const productData = productDoc.data() as Product;

            // Update stock
            const newStock = productData.stock - item.quantity;
            if (newStock < 0) {
                throw new Error(`Stock insuficiente para ${item.name}.`);
            }
            transaction.update(productRef, { stock: newStock });
            
            // Add inventory log
            const logRef = doc(collection(db, INVENTORY_LOGS_COLLECTION));
            transaction.set(logRef, {
                productId: item.id,
                productName: item.name,
                change: -item.quantity,
                reason: 'Venta',
                updatedBy: saleData.cashierId,
                createdAt: serverTimestamp(),
                metadata: { saleId: saleId, cost: productData.cost }
            });


            // Handle consignation logic
            if (productData.ownershipType === 'Consigna' && productData.consignorId) {
                const amountDue = productData.cost * item.quantity;
                await updateConsignorBalance(transaction, productData.consignorId, amountDue);
            }
        }
    });

    return saleId;
};
