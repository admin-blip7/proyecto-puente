"use server";

import { SalesChange, SaleItem, Product } from "@/types";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";

const log = getLogger("salesChangeService");

export interface CreateProductChangeParams {
    saleId: string;
    originalItem: SaleItem;
    newProduct: Product;
    newQuantity: number;
    reason: string;
    performedBy: string;
    performedByName: string;
}

export const createProductChange = async (params: CreateProductChangeParams): Promise<{ success: boolean; changeId?: string; error?: string }> => {
    try {
        const supabase = getSupabaseServerClient();
        log.info(`Processing product change for sale ${params.saleId}`);

        // Call the RPC
        const { data, error } = await supabase.rpc('process_product_change', {
            p_sale_id: params.saleId,
            p_original_item_id: params.originalItem.productId, // Assuming productId is the firestore_id/id used in DB
            p_original_quantity: params.originalItem.quantity,
            p_new_item_id: params.newProduct.id,
            p_new_quantity: params.newQuantity,
            p_reason: params.reason,
            p_user_id: params.performedBy,
            p_user_name: params.performedByName
        });

        if (error) {
            log.error("Error calling process_product_change RPC", error);
            throw new Error(error.message);
        }

        if (data && !data.success) {
            log.warn("RPC returned unsuccessfull result", data);
            return { success: false, error: data.error };
        }

        log.info("Product change processed successfully", data);
        return { success: true, changeId: data.change_id };

    } catch (error) {
        log.error("Error in createProductChange", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
};

export const getSaleChanges = async (saleId: string): Promise<SalesChange[]> => {
    try {
        const supabase = getSupabaseServerClient();

        // Map snake_case DB fields to camelCase TS interface
        const { data, error } = await supabase
            .from('sales_changes')
            .select('*')
            .eq('sale_id', saleId)
            .order('created_at', { ascending: false });

        if (error) {
            log.error(`Error fetching changes for sale ${saleId}`, error);
            return [];
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            saleId: row.sale_id,
            originalProductId: row.original_product_id,
            originalProductName: row.original_product_name,
            originalPrice: Number(row.original_price),
            originalQuantity: Number(row.original_quantity),
            newProductId: row.new_product_id,
            newProductName: row.new_product_name,
            newPrice: Number(row.new_price),
            newQuantity: Number(row.new_quantity),
            priceDifference: Number(row.price_difference),
            changeReason: row.change_reason,
            performedBy: row.performed_by,
            performedByName: row.performed_by_name,
            createdAt: new Date(row.created_at)
        }));

    } catch (error) {
        log.error("Error in getSaleChanges", error);
        return [];
    }
};
