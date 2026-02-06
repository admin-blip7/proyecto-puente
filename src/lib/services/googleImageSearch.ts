import { IMAGE_CONFIG } from '@/config/images';
import sharp from 'sharp';

interface GoogleSearchResponse {
    items: Array<{
        link: string;
        image?: {
            contextLink?: string;
            thumbnailLink: string;
            width: number;
            height: number;
            byteSize: number;
        };
        title: string;
        pagemap?: {
            cse_image?: Array<{
                src: string;
            }>;
        };
    }>;
    queries?: {
        nextPage?: Array<{
            startIndex: number;
        }>;
    };
}

export interface SearchResult {
    original: string;
    thumbnail: string;
    title: string;
    source?: string;
    width?: number;
    height?: number;
}

interface SearchResultsResponse {
    success: boolean;
    results?: SearchResult[];
    error?: string;
    nextPageToken?: string;
}

/**
 * Searches for images using Google Custom Search API
 */
export async function searchProductImages(
    query: string,
    pageToken?: string
): Promise<SearchResultsResponse> {
    try {
        if (!query || query.trim().length < 2) {
            return {
                success: false,
                error: 'Search query must be at least 2 characters'
            };
        }

        const apiKey = process.env.GOOGLE_CSE_API_KEY;
        const cx = process.env.GOOGLE_CSE_CX;

        if (!apiKey || !cx) {
            return {
                success: false,
                error: 'Google CSE configuration not found'
            };
        }

        // Build API URL
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.append('key', apiKey);
        url.searchParams.append('cx', cx);
        url.searchParams.append('q', query.trim());
        url.searchParams.append('searchType', 'image');
        url.searchParams.append('num', IMAGE_CONFIG.searchResults.toString());
        url.searchParams.append('imgSize', 'large'); // Search large images
        url.searchParams.append('imgType', 'photo'); // Photos only
        url.searchParams.append('safe', 'active');  // Safe search

        if (pageToken) {
            url.searchParams.append('start', pageToken);
        }

        const response = await fetch(url.toString(), {
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.error?.message || 'Error searching images'
            };
        }

        const data: GoogleSearchResponse = await response.json();

        if (!data.items || data.items.length === 0) {
            return {
                success: true,
                results: [],
                nextPageToken: data.queries?.nextPage?.[0]?.startIndex?.toString()
            };
        }

        // Process results
        const results: SearchResult[] = data.items
            .filter(item => item.link) // Only items with links
            .map(item => {
                // Try to get thumbnail from different sources
                let thumbnail = item.image?.thumbnailLink || item.link;

                // Use cse_image if available as it often has better thumbnails
                if (item.pagemap?.cse_image?.[0]?.src) {
                    thumbnail = item.pagemap.cse_image[0].src;
                }

                return {
                    original: item.link,
                    thumbnail: thumbnail,
                    title: item.title?.substring(0, 80) || 'Image',
                    source: item.image?.contextLink,
                    width: item.image?.width,
                    height: item.image?.height
                };
            });

        return {
            success: true,
            results,
            nextPageToken: data.queries?.nextPage?.[0]?.startIndex?.toString()
        };

    } catch (error) {
        console.error('Error searching images:', error);
        return {
            success: false,
            error: (error as Error).message || 'Error searching images'
        };
    }
}

/**
 * Downloads, resizes and optimizes an image using Sharp
 */
export async function downloadAndStandardizeImage(
    imageUrl: string,
    productName: string,
    fallbackImageUrls: string[] = []
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {

    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 10000;
    const candidateUrls = Array.from(
        new Set([imageUrl, ...fallbackImageUrls].filter(url => typeof url === 'string' && url.trim().length > 0))
    );

    if (candidateUrls.length === 0) {
        throw new Error('No image URL provided');
    }

    let downloadedBuffer: Buffer | null = null;
    let lastError: Error | null = null;

    for (const candidateUrl of candidateUrls) {
        const userAgentHeaders = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'
        ];
        const candidateOrigin = (() => {
            try {
                return new URL(candidateUrl).origin;
            } catch {
                return '';
            }
        })();

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

                const response = await fetch(candidateUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': userAgentHeaders[(attempt - 1) % userAgentHeaders.length],
                        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                        ...(candidateOrigin ? { 'Referer': candidateOrigin } : {})
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    lastError = new Error(`Failed to download image (${response.status} ${response.statusText})`);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(resolve => setTimeout(resolve, 800 * attempt));
                    }
                    continue;
                }

                const contentType = response.headers.get('content-type') || '';
                if (contentType && !contentType.toLowerCase().includes('image')) {
                    lastError = new Error(`Downloaded content is not an image (${contentType})`);
                    break;
                }

                const arrayBuffer = await response.arrayBuffer();
                downloadedBuffer = Buffer.from(arrayBuffer);
                break;
            } catch (error: any) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`Image download attempt ${attempt}/${MAX_RETRIES} failed for ${candidateUrl}:`, lastError.message);
                if (attempt < MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, 800 * attempt));
                }
            }
        }

        if (downloadedBuffer) {
            break;
        }
    }

    if (!downloadedBuffer) {
        throw lastError || new Error('Failed to download image after trying all candidate URLs');
    }

    const arrayBuffer = downloadedBuffer.buffer.slice(
        downloadedBuffer.byteOffset,
        downloadedBuffer.byteOffset + downloadedBuffer.byteLength
    );
    const inputBuffer = Buffer.from(arrayBuffer);

    // Resize and standardize using Sharp
    const processedBuffer = await sharp(inputBuffer)
        .resize(IMAGE_CONFIG.width, IMAGE_CONFIG.height, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .jpeg({ quality: IMAGE_CONFIG.quality })
        .toBuffer();

    const filename = `${productName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;

    return {
        buffer: processedBuffer,
        filename: filename,
        mimeType: 'image/jpeg'
    };
}
