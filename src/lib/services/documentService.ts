'use server';

import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";


/**
 * Uploads a file to a specified path in Firebase Storage.
 * @param file The file to upload.
 * @param path The destination path in the storage bucket (e.g., 'receipts/some-id.jpg').
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export const uploadFile = async (
    file: File,
    path: string
): Promise<string> => {
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        return downloadURL;
    } catch (error) {
        console.error(`Error uploading file to ${path}:`, error);
        throw new Error("File upload failed.");
    }
}
