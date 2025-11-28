import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function GET() {
    try {
        const supabase = getSupabaseServerClient();

        // Get all November sales
        const { data: allSales, error } = await supabase
            .from("sales")
            .select("saleId, createdAt, totalAmount, status");

        if (error) throw error;

        // Group by date and convert Firestore timestamps
        const salesByDate: Record<string, any[]> = {};

        allSales?.forEach((sale: any) => {
            let saleDate: Date;

            // Handle Firestore timestamp
            if (sale.createdAt?._seconds) {
                saleDate = new Date(sale.createdAt._seconds * 1000);
            } else {
                saleDate = new Date(sale.createdAt);
            }

            // Format as YYYY-MM-DD
            const dateKey = saleDate.toISOString().split('T')[0];

            if (!salesByDate[dateKey]) {
                salesByDate[dateKey] = [];
            }

            salesByDate[dateKey].push({
                saleId: sale.saleId,
                localDate: saleDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
                amount: sale.totalAmount,
                status: sale.status
            });
        });

        // Calculate totals per day
        const dailyTotals = Object.entries(salesByDate)
            .map(([date, sales]) => ({
                date,
                count: sales.length,
                total: sales.reduce((sum, s) => sum + (s.amount || 0), 0),
                sales: sales.slice(0, 3) // Show first 3 sales as sample
            }))
            .sort((a, b) => b.date.localeCompare(a.date));

        return NextResponse.json({
            success: true,
            totalSales: allSales?.length || 0,
            dailyTotals,
            november21_23: dailyTotals.filter(d =>
                d.date >= '2025-11-21' && d.date <= '2025-11-23'
            )
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
