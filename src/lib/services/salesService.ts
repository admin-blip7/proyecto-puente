
import { db } from "@/lib/firebase";
import { Sale, CartItem, Product, CashSession } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc, DocumentData, QueryDocumentSnapshot, getDoc, runTransaction, query, where, limit, orderBy, increment } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { getProductById } from "./productService";
import { getLogger } from "@/lib/logger";
const log = getLogger("salesService");
const SALES_COLLECTION = "sales";
const PRODUCTS_COLLECTION = "products";
const INVENTORY_LOGS_COLLECTION = "inventory_logs";
const CASH_SESSIONS_COLLECTION = "cash_sessions";
const CONSIGNORS_COLLECTION = "consignors";


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
        log.error("Error fetching sales:", error);
        return [];
    }
};

export const addSaleAndUpdateStock = async (
    saleData: Omit<Sale, 'id' | 'saleId' | 'createdAt'>,
    cartItems: CartItem[]
): Promise<Sale> => {
    const saleId = `SALE-${uuidv4().split('-')[0].toUpperCase()}`;

    // Get active session outside transaction, as queries are not allowed inside.
    const activeSessionQuery = query(
        collection(db, CASH_SESSIONS_COLLECTION),
        where("status", "==", "Abierto"),
        where("openedBy", "==", saleData.cashierId),
        orderBy("openedAt", "desc"),
        limit(1)
    );
    const activeSessionSnapshot = await getDocs(activeSessionQuery);
    const activeSessionRef = activeSessionSnapshot.empty ? null : activeSessionSnapshot.docs[0].ref;

    let finalSale: Sale | null = null;

    await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const productsToUpdate = [];

        for (const item of cartItems) {
            const productRef = doc(db, PRODUCTS_COLLECTION, item.id);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) {
                throw new Error(`Producto ${item.name} no encontrado.`);
            }

            const productData = productDoc.data() as Product;
            const newStock = productData.stock - item.quantity;
            if (newStock < 0) {
                throw new Error(`Stock insuficiente para ${item.name}.`);
            }
            
            productsToUpdate.push({
                ref: productRef,
                id: item.id,
                name: item.name,
                newStock: newStock,
                quantity: item.quantity,
                cost: productData.cost,
                ownershipType: productData.ownershipType,
                consignorId: productData.consignorId,
            });
        }
        
        // --- WRITE PHASE ---
        const saleRef = doc(collection(db, SALES_COLLECTION));
        const newSaleData = {
            ...saleData,
            saleId: saleId,
            createdAt: serverTimestamp(),
            sessionId: activeSessionRef ? activeSessionRef.id : null,
        }
        transaction.set(saleRef, newSaleData);
        finalSale = { ...saleData, id: saleRef.id, saleId, createdAt: new Date() };

        for (const product of productsToUpdate) {
            transaction.update(product.ref, { stock: product.newStock });
            
            const logRef = doc(collection(db, INVENTORY_LOGS_COLLECTION));
            transaction.set(logRef, {
                productId: product.id,
                productName: product.name,
                change: -product.quantity,
                reason: 'Venta',
                updatedBy: saleData.cashierId,
                createdAt: serverTimestamp(),
                metadata: { saleId: saleId, cost: product.cost }
            });

            if (product.ownershipType === 'Consigna' && product.consignorId) {
                const amountDue = product.cost * product.quantity;
                const consignorRef = doc(db, CONSIGNORS_COLLECTION, product.consignorId);
                transaction.update(consignorRef, { balanceDue: increment(amountDue) });
            }
        }
        
        if (activeSessionRef) {
            if (saleData.paymentMethod === 'Efectivo') {
                transaction.update(activeSessionRef, { totalCashSales: increment(saleData.totalAmount) });
            } else {
                transaction.update(activeSessionRef, { totalCardSales: increment(saleData.totalAmount) });
            }
        }
    });

    if (!finalSale) {
        throw new Error("Failed to create sale object after transaction.");
    }

    return finalSale;
};
