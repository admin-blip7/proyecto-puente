import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productName = searchParams.get('name');

  if (!productName) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('name', productName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ exists: false, message: 'Product not found' });
      }
      throw error;
    }

    return NextResponse.json({ exists: true, product: data });
  } catch (error) {
    console.error('Error checking product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}