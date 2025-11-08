import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Fetch all label_design_* records from settings table
    const { data: labelRecords, error } = await supabase
      .from('settings')
      .select('id, data, last_updated')
      .ilike('id', 'label_design_%');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch label designs' },
        { status: 500 }
      );
    }

    // Map the records to label list format
    const labels = (labelRecords || [])
      .map((record: any) => {
        // Extract label type from id (label_design_product -> product)
        const labelType = record.id.replace('label_design_', '') as 'product' | 'repair';
        
        // Get name from data if available, otherwise use type
        const labelName = record.data?.name || 
          (labelType === 'product' ? 'Diseño de Producto' : 'Diseño de Reparación');

        return {
          id: record.id,
          name: labelName,
          type: labelType,
          lastUpdated: record.last_updated,
        };
      })
      .sort((a, b) => a.type.localeCompare(b.type));

    return NextResponse.json({ labels });
  } catch (error) {
    console.error('Error listing label designs:', error);
    return NextResponse.json(
      { error: 'Failed to list label designs' },
      { status: 500 }
    );
  }
}
