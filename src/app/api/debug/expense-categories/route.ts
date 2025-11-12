import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    
    // Check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'expense_categories')
      .maybeSingle();
    
    if (tablesError) {
      return NextResponse.json({
        success: false,
        error: "Error checking table existence",
        details: tablesError.message,
        code: tablesError.code
      }, { status: 500 });
    }
    
    if (!tables) {
      return NextResponse.json({
        success: false,
        error: "Table 'expense_categories' does not exist",
        solution: "Run the setup script: scripts/setup-expense-categories-table.sql",
        sqlCommand: "See SOLUCION_INMEDIATA_GASTOS.md for SQL to execute"
      }, { status: 404 });
    }
    
    // Try to fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('expense_categories')
      .select('*')
      .limit(10);
    
    if (categoriesError) {
      return NextResponse.json({
        success: false,
        error: "Error fetching categories",
        details: categoriesError.message,
        code: categoriesError.code,
        hint: categoriesError.hint
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Expense categories table exists and is accessible",
      categoriesCount: categories?.length || 0,
      sampleCategories: categories?.slice(0, 5) || []
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
