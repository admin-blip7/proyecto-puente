import { NextRequest, NextResponse } from 'next/server';
import { getConsignors, addConsignor } from '@/lib/services/consignorService';

export async function GET() {
  try {
    const consignors = await getConsignors();
    return NextResponse.json(consignors);
  } catch (error) {
    console.error('Error fetching consignors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consignors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, contactInfo } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const newConsignor = await addConsignor({
      name,
      contactInfo: contactInfo || ''
    });

    return NextResponse.json(newConsignor, { status: 201 });
  } catch (error) {
    console.error('Error adding consignor:', error);
    return NextResponse.json(
      { error: 'Failed to add consignor' },
      { status: 500 }
    );
  }
}