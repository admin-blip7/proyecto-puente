'use server';

import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { generateProductImage, optimizeProductImage } from "./deapiService";

export async function uploadStockEntryImage(file: File, userId: string): Promise<string> {
    const supabase = getSupabaseServerClient();
    const fileName = `stock-entry/${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;

    // Upload image to 'products' bucket (or a temporary/stock one if preferred, but products is fine)
    const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, file, {
            contentType: file.type,
            upsert: false
        });

    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

    return publicUrl;
}

// Wrapper for deapiService to keep Stock Entry context clean
export async function generateImageForStockEntry(productName: string, category?: string): Promise<string> {
    return await generateProductImage(productName, category);
}

export async function optimizeImageForStockEntry(formData: FormData): Promise<string> {
    return await optimizeProductImage(formData);
}
