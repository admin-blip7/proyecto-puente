import { db } from "@/lib/firebase";
import { Product, StockEntryItem } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot, writeBatch, doc, runTransaction, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../hooks";

const PRODUCTS_COLLECTION = "products";
const INVENTORY_LOGS_COLLECTION = "inventory_logs";


const productFromDoc = (doc: QueryDocumentSnapshot<DocumentData> | DocumentData): Product => {
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
        type: data.type || 'Venta',
        ownershipType: data.ownershipType || 'Propio',
        consignorId: data.consignorId,
        reorderPoint: data.reorderPoint,
        comboProductIds: data.comboProductIds || [],
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

export const getProductById = async (productId: string): Promise<Product | null> => {
    try {
        const docRef = doc(db, PRODUCTS_COLLECTION, productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return productFromDoc(docSnap as DocumentData);
        }
        return null;
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        return null;
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
    const processedItems: StockEntryItem[] = [];

    for (const item of entryItems) {
        const productRef = item.productId ? doc(db, PRODUCTS_COLLECTION, item.productId) : doc(collection(db, PRODUCTS_COLLECTION));

        await runTransaction(db, async (transaction) => {
            const productDoc = item.productId ? await transaction.get(productRef) : null;

            if (productDoc && productDoc.exists()) {
                // UPDATE EXISTING PRODUCT
                const currentStock = productDoc.data().stock || 0;
                const newStock = currentStock + item.quantity;
                
                transaction.update(productRef, {
                    stock: newStock,
                    cost: item.cost,
                    price: item.price,
                    ownershipType: item.ownershipType,
                    consignorId: item.consignorId || null,
                });
            } else {
                // CREATE NEW PRODUCT
                const newProductData = {
                    name: item.name,
                    sku: item.sku,
                    price: item.price,
                    cost: item.cost,
                    stock: item.quantity,
                    category: item.category,
                    imageUrl: `https://picsum.photos/400/400?random=${Math.random()}`,
                    createdAt: serverTimestamp(),
                    type: 'Venta',
                    ownershipType: item.ownershipType,
                    consignorId: item.consignorId || null,
                    comboProductIds: [],
                };
                transaction.set(productRef, newProductData);
                item.productId = productRef.id; // Assign new ID back to item
            }

            // INVENTORY LOG for both new and existing
            const logRef = doc(collection(db, INVENTORY_LOGS_COLLECTION));
            transaction.set(logRef, {
                productId: item.productId,
                productName: item.name,
                change: item.quantity,
                reason: item.isNew ? "Creación de Producto" : "Ingreso de Mercancía",
                updatedBy: userId,
                createdAt: serverTimestamp(),
                metadata: { cost: item.cost }
            });
        });
        processedItems.push(item);
    }
    return processedItems;
};
