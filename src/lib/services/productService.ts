import { db } from "@/lib/firebase";
import { Product, StockEntryItem } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot, writeBatch, doc, runTransaction } from "firebase/firestore";
import { useAuth } from "../hooks";

const PRODUCTS_COLLECTION = "products";
const INVENTORY_LOGS_COLLECTION = "inventory_logs";


const productFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Product => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        sku: data.sku,
        price: data.price,
        cost: data.cost,
        stock: data.stock,
        category: data.category,
        imageUrl: data.imageUrl,
        createdAt: data.createdAt.toDate(),
        type: data.type || 'Venta', // Default to 'Venta' if not specified
    };
}

export const getProducts = async (): Promise<Product[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
        const products = querySnapshot.docs.map(productFromDoc);
        // Sort by name by default
        return products.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
};


export const addProduct = async (productData: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    try {
        const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
            ...productData,
            createdAt: serverTimestamp(),
        });

        return {
            id: docRef.id,
            ...productData,
            createdAt: new Date(),
        };

    } catch (error) {
        console.error("Error adding product: ", error);
        throw new Error("Failed to add product.");
    }
};


export const processStockEntry = async (entryItems: StockEntryItem[], userId: string): Promise<StockEntryItem[]> => {
    const batch = writeBatch(db);
    const processedItems: StockEntryItem[] = [];

    for (const item of entryItems) {
        if (item.isNew) {
            // Create new product and log it
            const newProductRef = doc(collection(db, PRODUCTS_COLLECTION));
            const newProductData = {
                name: item.name,
                sku: item.sku,
                price: item.price,
                cost: item.cost,
                stock: item.quantity,
                category: item.category,
                imageUrl: `https://picsum.photos/400/400?random=${Math.random()}`,
                createdAt: serverTimestamp(),
                type: 'Venta', // All new products from stock entry are for sale initially. Can be changed later.
            };
            batch.set(newProductRef, newProductData);

            const logRef = doc(collection(db, INVENTORY_LOGS_COLLECTION));
            batch.set(logRef, {
                productId: newProductRef.id,
                productName: item.name,
                change: item.quantity,
                reason: "Creación de Producto",
                updatedBy: userId,
                createdAt: serverTimestamp(),
                metadata: { cost: item.cost }
            });
            processedItems.push({ ...item, productId: newProductRef.id });

        } else {
            // Update existing product and log it
            if (!item.productId) continue;
            const productRef = doc(db, PRODUCTS_COLLECTION, item.productId);

            // Use a transaction to safely read and update the stock
            await runTransaction(db, async (transaction) => {
                const productDoc = await transaction.get(productRef);
                if (!productDoc.exists()) {
                    throw `Product with ID ${item.productId} does not exist!`;
                }
                const currentStock = productDoc.data().stock || 0;
                const newStock = currentStock + item.quantity;
                
                transaction.update(productRef, {
                    stock: newStock,
                    cost: item.cost, // Update cost as well
                });
            });


            const logRef = doc(collection(db, INVENTORY_LOGS_COLLECTION));
            batch.set(logRef, {
                productId: item.productId,
                productName: item.name,
                change: item.quantity,
                reason: "Ingreso de Mercancía",
                updatedBy: userId,
                createdAt: serverTimestamp(),
                metadata: { cost: item.cost }
            });
            processedItems.push(item);
        }
    }

    await batch.commit();
    return processedItems;
};
