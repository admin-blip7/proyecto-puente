import { NextRequest, NextResponse } from 'next/server';
import { getLabelSettings, saveLabelSettings } from '@/lib/services/settingsService';
import { LabelSettingsSchema } from '@/types';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const labelType = searchParams.get('labelType') as 'product' | 'repair' || 'product';
    
    const settings = await getLabelSettings(labelType);
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching label settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch label settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validatedData = LabelSettingsSchema.parse(body);
    
    // Add labelType if not present (default to 'product')
    const settingsToSave = {
      ...validatedData,
      labelType: validatedData.labelType || 'product'
    };
    
    await saveLabelSettings(settingsToSave);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving label settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to save label settings' },
      { status: 500 }
    );
  }
}