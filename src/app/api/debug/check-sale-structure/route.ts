import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function GET() {
    try {
        const supabase = getSupabaseServerClient();

        // Get a sample sale with items
        const { data: sale, error } = await supabase
            .from("sales")
            .select("saleId, items, totalAmount")
            .limit(1)
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            sampleSale: sale,
            itemsType: typeof sale?.items,
            firstItem: Array.isArray(sale?.items) ? sale.items[0] : null
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
