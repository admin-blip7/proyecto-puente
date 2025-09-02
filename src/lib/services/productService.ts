import { db } from "@/lib/firebase";
import { Product, StockEntryItem } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot, writeBatch, doc, runTransaction, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../hooks";
import { suggestProductTags } from "@/ai/flows/suggest-product-tags";

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
        compatibilityTags: data.compatibilityTags || [],
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
            price: Number(productData.price) || 0,
            cost: Number(productData.cost) || 0,
            stock: Number(productData.stock) || 0,
            reorderPoint: Number(productData.reorderPoint) || 0,
            createdAt: serverTimestamp(),
        });

        // Asynchronously generate tags without blocking the return
        if (productData.name) {
             getProducts().then(allProducts => {
                const existingProductsForAI = allProducts.map(p => ({
                    name: p.name,
                    tags: p.compatibilityTags || [],
                }));

                suggestProductTags({
                    productName: productData.name,
                    productDescription: "", // Optional: add description if available
                    existingProducts: existingProductsForAI,
                })
                .then(result => {
                    if (result.suggestedTags && result.suggestedTags.length > 0) {
                        updateDoc(docRef, { compatibilityTags: result.suggestedTags });
                    }
                })
                .catch(error => console.error(`Error generating AI tags for ${productData.name}:`, error));
            }).catch(error => console.error("Error fetching existing products for AI tagging:", error));
        }


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
        const isNewProduct = !item.productId;
        const productRef = isNewProduct ? doc(collection(db, PRODUCTS_COLLECTION)) : doc(db, PRODUCTS_COLLECTION, item.productId!);

        await runTransaction(db, async (transaction) => {
            const productDoc = !isNewProduct ? await transaction.get(productRef) : null;

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
                    compatibilityTags: [] // Start with empty tags
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
                reason: isNewProduct ? "Creación de Producto" : "Ingreso de Mercancía",
                updatedBy: userId,
                createdAt: serverTimestamp(),
                metadata: { cost: item.cost }
            });
        });

        // If it was a new product, now generate tags asynchronously
        if (isNewProduct && item.productId) {
             try {
                const allProducts = await getProducts(); // Get context of existing products
                const existingProductsForAI = allProducts.map(p => ({
                    name: p.name,
                    tags: p.compatibilityTags || [],
                }));

                const result = await suggestProductTags({
                    productName: item.name,
                    existingProducts: existingProductsForAI
                });

                if (result.suggestedTags.length > 0) {
                    await updateDoc(productRef, { compatibilityTags: result.suggestedTags });
                }
            } catch (aiError) {
                console.error(`Failed to generate AI tags for ${item.name}:`, aiError);
                // Don't block the process, just log the error
            }
        }

        processedItems.push(item);
    }
    return processedItems;
};
