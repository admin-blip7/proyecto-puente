'use server';

import { db, storage } from "@/lib/firebase";
import { Product, StockEntryItem, SuggestedProduct, BulkUpdateData } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot, writeBatch, doc, runTransaction, getDoc, updateDoc, where, query, limit, arrayUnion, arrayRemove, increment, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../hooks";
import { suggestProductTags } from "@/ai/flows/suggest-product-tags";

const PRODUCTS_COLLECTION = "products";
const INVENTORY_LOGS_COLLECTION = "inventory_logs";
const STORAGE_PRODUCT_IMAGES_PATH = "product-images";

const generateSearchKeywords = (name: string): string[] => {
    if (!name) return [];
    const lowerCaseName = name.toLowerCase();
    const parts = lowerCaseName.split(' ').filter(p => p);
    const keywords = new Set<string>(parts);

    // Add progressive combinations
    for (let i = 0; i < parts.length; i++) {
        let currentCombination = parts[i];
        for (let j = i + 1; j < parts.length; j++) {
            currentCombination += ` ${parts[j]}`;
            keywords.add(currentCombination);
        }
    }
    return Array.from(keywords);
}


const productFromDoc = (doc: QueryDocumentSnapshot<DocumentData> | DocumentData): Product => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        sku: data.sku,
        price: Number(data.price || 0),
        cost: Number(data.cost || 0),
        stock: Number(data.stock || 0),
        category: data.category,
        imageUrl: data.imageUrl,
        createdAt: data.createdAt?.toDate(),
        type: data.type || 'Venta',
        ownershipType: data.ownershipType || 'Propio',
        consignorId: data.consignorId,
        reorderPoint: Number(data.reorderPoint || 0),
        comboProductIds: data.comboProductIds || [],
        compatibilityTags: data.compatibilityTags || [],
        searchKeywords: data.searchKeywords || [],
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

const uploadProductImage = async (file: File, productId: string): Promise<string> => {
    const filePath = `${STORAGE_PRODUCT_IMAGES_PATH}/${productId}/${file.name}`;
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
};


export const addProduct = async (
    productData: Omit<Product, 'id' | 'createdAt' | 'imageUrl'>,
    imageFile?: File
): Promise<Product> => {
    
    const productDocRef = doc(collection(db, PRODUCTS_COLLECTION));
    let imageUrl = `https://placehold.co/400x400/E2E8F0/AAAAAA&text=Sin+Imagen`;

    if (imageFile) {
        imageUrl = await uploadProductImage(imageFile, productDocRef.id);
    }
    
    try {
        const searchKeywords = generateSearchKeywords(productData.name);
        const dataToSave = {
            ...productData,
            price: Number(productData.price) || 0,
            cost: Number(productData.cost) || 0,
            stock: Number(productData.stock) || 0,
            reorderPoint: Number(productData.reorderPoint) || 0,
            imageUrl: imageUrl,
            createdAt: serverTimestamp(),
            searchKeywords: searchKeywords,
        };

        await setDoc(productDocRef, dataToSave);

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
                        updateDoc(productDocRef, { compatibilityTags: result.suggestedTags });
                    }
                })
                .catch(error => console.error(`Error generating AI tags for ${productData.name}:`, error));
            }).catch(error => console.error("Error fetching existing products for AI tagging:", error));
        }

        const newProduct = {
            id: productDocRef.id,
            ...productData,
            imageUrl,
            searchKeywords,
            createdAt: new Date(),
        };

        // This is a workaround to return the full product object after creation, including the possibly modified properties.
        const finalProduct = await getDoc(productDocRef);

        return productFromDoc(finalProduct as DocumentData);

    } catch (error) {
        console.error("Error adding product: ", error);
        throw new Error("Failed to add product.");
    }
};

export const updateProduct = async (
    productId: string,
    productData: Partial<Omit<Product, 'id' | 'createdAt'>>,
    imageFile?: File
): Promise<Product> => {
    const productDocRef = doc(db, PRODUCTS_COLLECTION, productId);
    let dataToUpdate: Partial<Product> = { ...productData };

    if (imageFile) {
        dataToUpdate.imageUrl = await uploadProductImage(imageFile, productId);
    }

    if (productData.name) {
        dataToUpdate.searchKeywords = generateSearchKeywords(productData.name);
    }
    
    try {
        await updateDoc(productDocRef, dataToUpdate as DocumentData);
        const updatedDoc = await getDoc(productDocRef);
        if (!updatedDoc.exists()) {
            throw new Error("Product not found after update.");
        }
        return productFromDoc(updatedDoc as DocumentData);
    } catch (error) {
        console.error("Error updating product: ", error);
        throw new Error("Failed to update product.");
    }
};


export const getSuggestedProducts = async (tags: string[], excludeIds: string[]): Promise<SuggestedProduct[]> => {
    if (tags.length === 0 || tags.length > 10) {
        // Firestore limit for array-contains-any is 10
        return [];
    }

    const q = query(
        collection(db, PRODUCTS_COLLECTION),
        where('compatibilityTags', 'array-contains-any', tags),
        limit(10) // Limit the number of suggestions
    );

    try {
        const querySnapshot = await getDocs(q);
        const suggestedProducts = querySnapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    price: Number(data.price || 0),
                    imageUrl: data.imageUrl,
                };
            })
            .filter(p => !excludeIds.includes(p.id)); // Filter out items already in the cart

        return suggestedProducts;
    } catch (error) {
        console.error("Error fetching suggested products: ", error);
        return [];
    }
}


export const processStockEntry = async (entryItems: StockEntryItem[], userId: string): Promise<StockEntryItem[]> => {
    const processedItems: StockEntryItem[] = [];

    // The AI tag generation should happen outside any transaction.
    // We can run it after the transaction successfully commits.
    const newProductsForTagging: { id: string; name: string }[] = [];

    for (const item of entryItems) {
        const isNewProduct = !item.productId;
        const productRef = isNewProduct ? doc(collection(db, PRODUCTS_COLLECTION)) : doc(db, PRODUCTS_COLLECTION, item.productId!);

        await runTransaction(db, async (transaction) => {
            // --- READ PHASE ---
            const productDoc = !isNewProduct ? await transaction.get(productRef) : null;

            // --- WRITE PHASE ---
            if (productDoc && productDoc.exists()) {
                // UPDATE EXISTING PRODUCT
                transaction.update(productRef, {
                    stock: increment(item.quantity),
                    cost: item.cost,
                    price: item.price,
                    ownershipType: item.ownershipType,
                    consignorId: item.consignorId || null,
                });
            } else {
                // CREATE NEW PRODUCT
                const searchKeywords = generateSearchKeywords(item.name);
                const newProductData = {
                    name: item.name,
                    sku: item.sku,
                    price: item.price,
                    cost: item.cost,
                    stock: item.quantity,
                    category: item.category,
                    imageUrl: item.imageUrl || `https://placehold.co/400x400/E2E8F0/AAAAAA&text=Sin+Imagen`,
                    createdAt: serverTimestamp(),
                    type: 'Venta',
                    ownershipType: item.ownershipType,
                    consignorId: item.consignorId || null,
                    comboProductIds: [],
                    compatibilityTags: [],
                    searchKeywords: searchKeywords,
                };
                transaction.set(productRef, newProductData);
                item.productId = productRef.id;
                newProductsForTagging.push({ id: productRef.id, name: item.name });
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

        processedItems.push(item);
    }
    
    // Asynchronously generate tags for all new products after transactions are complete
    if (newProductsForTagging.length > 0) {
        try {
            const allProducts = await getProducts();
            const existingProductsForAI = allProducts.map(p => ({
                name: p.name,
                tags: p.compatibilityTags || [],
            }));

            for (const newProd of newProductsForTagging) {
                suggestProductTags({
                    productName: newProd.name,
                    existingProducts: existingProductsForAI
                })
                .then(result => {
                    if (result.suggestedTags.length > 0) {
                        const productRef = doc(db, PRODUCTS_COLLECTION, newProd.id);
                        updateDoc(productRef, { compatibilityTags: result.suggestedTags });
                    }
                })
                .catch(aiError => console.error(`Failed to generate AI tags for ${newProd.name}:`, aiError));
            }
        } catch (error) {
            console.error("Error fetching products for AI tagging:", error);
        }
    }

    return processedItems;
};

export const deleteProducts = async (productIds: string[]): Promise<void> => {
    try {
        const batch = writeBatch(db);
        productIds.forEach(id => {
            const productRef = doc(db, PRODUCTS_COLLECTION, id);
            batch.delete(productRef);
        });
        await batch.commit();
    } catch (error) {
        console.error("Error deleting products:", error);
        throw new Error("Failed to delete products.");
    }
};

export const bulkUpdateProducts = async (productIds: string[], updateData: BulkUpdateData): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const productDocs = await Promise.all(productIds.map(id => transaction.get(doc(db, PRODUCTS_COLLECTION, id))));

        // --- WRITE PHASE ---
        for (const productDoc of productDocs) {
            if (!productDoc.exists()) continue;

            const productRef = productDoc.ref;
            const currentData = productDoc.data();
            let newData: { [key: string]: any } = {};

            // Handle Price
            if (updateData.price) {
                let newPrice = currentData.price;
                if (updateData.price.mode === 'fixed') {
                    newPrice = updateData.price.value;
                } else if (updateData.price.mode === 'amount') {
                    newPrice += updateData.price.value;
                } else if (updateData.price.mode === 'percent') {
                    newPrice *= (1 + updateData.price.value / 100);
                }
                newData.price = Math.max(0, newPrice);
            }

            // Handle Cost
            if (updateData.cost) {
                 let newCost = currentData.cost;
                if (updateData.cost.mode === 'fixed') {
                    newCost = updateData.cost.value;
                } else if (updateData.cost.mode === 'amount') {
                    newCost += updateData.cost.value;
                } else if (updateData.cost.mode === 'percent') {
                    newCost *= (1 + updateData.cost.value / 100);
                }
                newData.cost = Math.max(0, newCost);
            }

            // Handle Tags
            if (updateData.tagsToAdd && updateData.tagsToAdd.length > 0) {
                newData.compatibilityTags = arrayUnion(...updateData.tagsToAdd);
            }
             if (updateData.tagsToRemove && updateData.tagsToRemove.length > 0) {
                 if (newData.compatibilityTags) {
                    // if we are already updating the tags, chain the update
                     newData.compatibilityTags = arrayRemove(...updateData.tagsToRemove);
                 } else {
                    newData.compatibilityTags = arrayRemove(...updateData.tagsToRemove);
                 }
            }
            
            if (Object.keys(newData).length > 0) {
                transaction.update(productRef, newData);
            }
        }
    });
};
