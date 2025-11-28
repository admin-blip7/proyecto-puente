import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Get total count
    const { count, error: countError } = await supabase
      .from("sales")
      .select("*", { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json({
        success: false,
        error: "Count error: " + countError.message,
        details: countError
      });
    }

    // Get recent sales
    const { data: recentSales, error: salesError } = await supabase
      .from("sales")
      .select("saleId, createdAt, totalAmount, paymentMethod, status")
      .order("createdAt", { ascending: false })
      .limit(10);

    if (salesError) {
      return NextResponse.json({
        success: false,
        error: "Sales error: " + salesError.message,
        details: salesError
      });
    }

    // Calculate November totals
    const novStart = new Date("2025-11-01T00:00:00.000Z");
    const novEnd = new Date("2025-12-01T00:00:00.000Z");

    const { data: novSales, error: novError } = await supabase
      .from("sales")
      .select("totalAmount, status")
      .gte("createdAt", novStart.toISOString())
      .lt("createdAt", novEnd.toISOString());

    const novTotal = novSales?.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + Number(s.totalAmount || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      totalSalesInDb: count,
      recentSales,
      november: {
        count: novSales?.length || 0,
        total: novTotal
      },
      message: "Connection to Supabase successful"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
