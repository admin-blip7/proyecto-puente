'use server';

import { searchProductImages, downloadAndStandardizeImage } from '@/lib/services/googleImageSearch';
import { IMAGE_CONFIG } from '@/config/images';

const MAX_BULK_IMAGE_PRODUCTS = 20;
const BULK_IMAGES_PER_PRODUCT = 3;

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

interface BulkImageSearchRequestItem {
    productId: string;
    query: string;
}

interface BulkImageSearchResponseItem {
    productId: string;
    query: string;
    success: boolean;
    results: Array<{
        original: string;
        thumbnail: string;
        title: string;
        source?: string;
        width?: number;
        height?: number;
    }>;
    error?: string;
}

export async function searchProductImagesBulkAction(items: BulkImageSearchRequestItem[]) {
    try {
        if (!Array.isArray(items) || items.length === 0) {
            return {
                success: false,
                error: 'At least one product is required'
            };
        }

        if (items.length > MAX_BULK_IMAGE_PRODUCTS) {
            return {
                success: false,
                error: `Bulk image search supports up to ${MAX_BULK_IMAGE_PRODUCTS} products at a time`
            };
        }

        const normalizedItems = items
            .map(item => ({
                productId: String(item.productId || '').trim(),
                query: String(item.query || '').trim()
            }))
            .filter(item => item.productId.length > 0 && item.query.length >= 2);

        if (normalizedItems.length === 0) {
            return {
                success: false,
                error: 'No valid products to search. Each product needs an id and a query with at least 2 characters.'
            };
        }

        const settled = await Promise.allSettled(
            normalizedItems.map(async (item): Promise<BulkImageSearchResponseItem> => {
                const searchResult = await searchProductImages(item.query);

                if (!searchResult.success) {
                    return {
                        productId: item.productId,
                        query: item.query,
                        success: false,
                        results: [],
                        error: searchResult.error || 'Search error'
                    };
                }

                return {
                    productId: item.productId,
                    query: item.query,
                    success: true,
                    results: (searchResult.results || []).slice(0, BULK_IMAGES_PER_PRODUCT)
                };
            })
        );

        const results: BulkImageSearchResponseItem[] = settled.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }

            const fallback = normalizedItems[index];
            return {
                productId: fallback?.productId || '',
                query: fallback?.query || '',
                success: false,
                results: [],
                error: result.reason instanceof Error ? result.reason.message : 'Search error'
            };
        });

        return {
            success: true,
            items: results,
            maxProducts: MAX_BULK_IMAGE_PRODUCTS,
            imagesPerProduct: BULK_IMAGES_PER_PRODUCT
        };
    } catch (error) {
        console.error('Error in searchProductImagesBulkAction:', error);
        return {
            success: false,
            error: (error as Error).message || 'Error searching images in bulk'
        };
    }
}

export async function downloadAndSaveImageAction(
    imageUrl: string,
    productName: string,
    fallbackImageUrl?: string
) {
    try {
        const fallbackUrls = fallbackImageUrl ? [fallbackImageUrl] : [];
        const { buffer, filename, mimeType } = await downloadAndStandardizeImage(imageUrl, productName, fallbackUrls);

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
