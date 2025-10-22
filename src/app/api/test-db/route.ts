import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function GET() {
  try {
    console.log("Testing database connection...");
    
    const supabase = getSupabaseServerClient();
    
    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from("products")
      .select("count")
      .limit(1);
    
    if (connectionError) {
      console.error("Connection test failed:", connectionError);
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: connectionError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test 2: Check sales table
    const { data: salesTest, error: salesError } = await supabase
      .from("sales")
      .select("count")
      .limit(1);

    if (salesError) {
      console.error("Sales table test failed:", salesError);
      return NextResponse.json({
        success: false,
        error: "Sales table access failed",
        details: salesError.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test 3: Environment variables check
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      tests: {
        connection: "✅ Connected",
        salesTable: "✅ Accessible",
        environment: envCheck
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected error during database test",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "testSale") {
      const supabase = getSupabaseServerClient();
      
      // Test inserting a dummy sale
      const testSale = {
        firestore_id: `test-${Date.now()}`,
        saleId: `TEST-${Date.now()}`,
        items: [{ name: "Test Product", quantity: 1, price: 10 }],
        totalAmount: 10,
        paymentMethod: "Test",
        cashierId: "test-user",
        cashierName: "Test User",
        customerName: null,
        customerPhone: null,
        createdAt: new Date().toISOString(),
        sessionId: null,
      };

      const { data, error } = await supabase
        .from("sales")
        .insert(testSale)
        .select()
        .single();

      if (error) {
        return NextResponse.json({
          success: false,
          error: "Failed to insert test sale",
          details: error.message,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      // Clean up test sale
      await supabase
        .from("sales")
        .delete()
        .eq("firestore_id", testSale.firestore_id);

      return NextResponse.json({
        success: true,
        message: "Test sale insertion successful",
        testData: data,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action",
      timestamp: new Date().toISOString()
    }, { status: 400 });

  } catch (error) {
    console.error("POST test error:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected error during POST test",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}