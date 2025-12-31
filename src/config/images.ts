export const IMAGE_CONFIG = {
    // Standard size for all product images
    width: parseInt(process.env.PRODUCT_IMAGE_SIZE || '1024'),
    height: parseInt(process.env.PRODUCT_IMAGE_SIZE || '1024'),
    quality: parseInt(process.env.PRODUCT_IMAGE_QUALITY || '90'),

    // Output format
    format: 'jpeg' as const,

    // Max file size (5MB)
    maxFileSize: 5 * 1024 * 1024,

    // Search results count
    searchResults: 10,
} as const;

export type ImageSize = {
    width: number;
    height: number;
};

export const STANDARD_IMAGE_SIZE: ImageSize = {
    width: IMAGE_CONFIG.width,
    height: IMAGE_CONFIG.height,
};
