import { NextResponse } from 'next/server';
import { createProductFromDiagnostic } from '@/lib/services/productService';
import { z } from 'zod';

const CreateSeminuevoSchema = z.object({
    diagnosticId: z.string().min(1),
    price: z.coerce.number().min(0),
    cost: z.coerce.number().min(0),
    ownershipType: z.enum(['Propio', 'Consigna']),
    consignorId: z.string().optional(),
    notes: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const data = CreateSeminuevoSchema.parse(body);

        const newProduct = await createProductFromDiagnostic(data);

        return NextResponse.json({ success: true, product: newProduct });
    } catch (error) {
        console.error('Error in POST /api/seminuevo/create:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Datos inválidos', details: error.errors }, { status: 400 });
        }
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Error desconocido al crear seminuevo' },
            { status: 500 }
        );
    }
}
