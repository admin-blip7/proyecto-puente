'use server';

import { searchProductImages, downloadAndStandardizeImage } from '@/lib/services/googleImageSearch';
import { IMAGE_CONFIG } from '@/config/images';

export async function searchProductImagesAction(query: string, pageToken?: string) {
    try {
        const result = await searchProductImages(query, pageToken);

        if (!result.success) {
            return {
                success: false,
                error: result.error || 'Search error'
            };
        }

        return {
            success: true,
            results: result.results || [],
            nextPageToken: result.nextPageToken
        };
    } catch (error) {
        console.error('Error in searchProductImagesAction:', error);
        return {
            success: false,
            error: (error as Error).message || 'Error searching images'
        };
    }
}

export async function downloadAndSaveImageAction(imageUrl: string, productName: string) {
    try {
        const { buffer, filename, mimeType } = await downloadAndStandardizeImage(imageUrl, productName);

        // Convert to base64 to pass to client
        const base64 = buffer.toString('base64');

        return {
            success: true,
            file: {
                name: filename,
                type: mimeType,
                size: buffer.length,
                base64
            },
            originalUrl: imageUrl,
            imageSize: {
                width: IMAGE_CONFIG.width,
                height: IMAGE_CONFIG.height
            }
        };
    } catch (error) {
        console.error('Error downloading image:', error);
        return {
            success: false,
            error: (error as Error).message || 'Error downloading image'
        };
    }
}
