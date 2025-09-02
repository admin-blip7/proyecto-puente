import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { collection, getDocs, addDoc, serverTimestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

const PRODUCTS_COLLECTION = "products";

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
    };
}

export const getProducts = async (): Promise<Product[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
        const products = querySnapshot.docs.map(productFromDoc);
        return products;
    } catch (error) {
        console.error("Error fetching products:", error);
        // In a real app, you might want to throw the error or handle it gracefully
        return [];
    }
};


export const addProduct = async (productData: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    try {
        const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
            ...productData,
            createdAt: serverTimestamp(),
        });

        // We return the complete product object, simulating the `createdAt` for immediate use in the UI
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
