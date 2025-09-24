import { db, storage } from "@/lib/firebase";
import { Warranty } from "@/types";
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { getLogger } from "@/lib/logger";
const log = getLogger("warrantyService");

const WARRANTIES_COLLECTION = "warranties";

const warrantyFromDoc = (doc: QueryDocumentSnapshot<DocumentData>): Warranty => {
    const data = doc.data();
    return {
        id: doc.id,
        saleId: data.saleId,
        productId: data.productId,
        productName: data.productName,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        reason: data.reason,
        status: data.status,
        reportedAt: data.reportedAt.toDate(),
        resolutionDetails: data.resolutionDetails,
        resolvedAt: data.resolvedAt ? data.resolvedAt.toDate() : undefined,
        imageUrls: data.imageUrls || [],
    };
}

export const getWarranties = async (): Promise<Warranty[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, WARRANTIES_COLLECTION));
        const warranties = querySnapshot.docs.map(warrantyFromDoc);
        return warranties.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());
    } catch (error) {
        log.error("Error fetching warranties:", error);
        return [];
    }
};

export const addWarranty = async (warrantyData: Omit<Warranty, 'id' | 'reportedAt' | 'status' | 'imageUrls'>, images: File[]): Promise<Warranty> => {
    try {
        const imageUrls = await uploadWarrantyImages(images);

        const docRef = await addDoc(collection(db, WARRANTIES_COLLECTION), {
            ...warrantyData,
            status: 'Pendiente',
            reportedAt: serverTimestamp(),
            imageUrls: imageUrls,
        });

        return {
            id: docRef.id,
            ...warrantyData,
            status: 'Pendiente',
            reportedAt: new Date(),
            imageUrls: imageUrls,
        };

    } catch (error) {
        log.error("Error adding warranty: ", error);
        throw new Error("Failed to add warranty.");
    }
};

export const updateWarranty = async (warrantyId: string, dataToUpdate: Partial<Warranty>): Promise<void> => {
    try {
        const warrantyRef = doc(db, WARRANTIES_COLLECTION, warrantyId);
        const updateData: Partial<Warranty> & { resolvedAt?: any } = { ...dataToUpdate };

        if (dataToUpdate.status === 'Resuelta' || dataToUpdate.status === 'Rechazada') {
            updateData.resolvedAt = serverTimestamp();
        }

        await updateDoc(warrantyRef, updateData as any);
    } catch (error) {
        log.error("Error updating warranty:", error);
        throw new Error("Failed to update warranty.");
    }
};


const uploadWarrantyImages = async (images: File[]): Promise<string[]> => {
    const uploadPromises = images.map(async (image) => {
        const imageRef = ref(storage, `warranties/${uuidv4()}-${image.name}`);
        await uploadBytes(imageRef, image);
        const downloadURL = await getDownloadURL(imageRef);
        return downloadURL;
    });

    return Promise.all(uploadPromises);
};
