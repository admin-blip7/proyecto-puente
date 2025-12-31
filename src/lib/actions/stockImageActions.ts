'use server';

import { generateImageForStockEntry, optimizeImageForStockEntry } from '../services/stockImageService';

export async function generateProductImageAction(productName: string, category?: string) {
    try {
        const imageUrl = await generateImageForStockEntry(productName, category);
        return { success: true, imageUrl };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export async function optimizeProductImageAction(formData: FormData) {
    try {
        // Validate file presence
        const file = formData.get('image') as File;
        if (!file) throw new Error('No image provided');

        const imageUrl = await optimizeImageForStockEntry(formData);
        return { success: true, imageUrl };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
