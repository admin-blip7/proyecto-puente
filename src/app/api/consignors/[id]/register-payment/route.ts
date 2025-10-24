import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import { nowIso } from '@/lib/supabase/utils';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';

interface PaymentRequestBody {
  amount: number;
  paymentMethod: 'Transferencia Bancaria' | 'Efectivo' | 'Depósito';
  notes?: string;
}

interface ConsignorData {
  id: string;
  firestore_id?: string;
  name: string;
  contactInfo: string;
  balanceDue: number;
  created_at?: string;
  updated_at?: string;
}

interface PaymentTransaction {
  id: string;
  firestore_id: string;
  consignorId: string; // Corrected to match database schema
  consignorName: string; // Fixed capitalization to match DB schema
  amount: number;
  paymentMethod: string; // Fixed capitalization to match DB schema
  notes?: string;
  previousBalance: number; // Fixed capitalization to match DB schema
  newBalance: number; // Fixed capitalization to match DB schema
  transactionType: 'payment'; // Fixed capitalization to match DB schema
  createdAt: string; // Fixed capitalization to match DB schema
  processedBy?: string; // Fixed capitalization to match DB schema
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();

  try {
    const supabase = getSupabaseServerClient();

    // Await params as required by Next.js 15
    const { id: consignorId } = await params;
    if (!consignorId || typeof consignorId !== 'string') {
      return NextResponse.json(
        { 
          error: 'ID de consignador inválido',
          code: 'INVALID_CONSIGNOR_ID',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: PaymentRequestBody;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'Formato de datos inválido. Debe ser JSON válido.',
          code: 'INVALID_JSON',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    const { amount, paymentMethod, notes } = body;

    // Enhanced input validation
    const validationErrors: string[] = [];

    // Amount validation
    if (typeof amount !== 'number') {
      validationErrors.push('El monto debe ser un número');
    } else if (isNaN(amount) || !isFinite(amount)) {
      validationErrors.push('El monto debe ser un número válido');
    } else if (amount <= 0) {
      validationErrors.push('El monto debe ser mayor a cero');
    } else if (amount > 999999.99) {
      validationErrors.push('El monto no puede exceder $999,999.99');
    } else if (Number(amount.toFixed(2)) !== amount) {
      validationErrors.push('El monto solo puede tener hasta 2 decimales');
    }

    // Payment method validation
    const validPaymentMethods = ['Transferencia Bancaria', 'Efectivo', 'Depósito'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      validationErrors.push('Método de pago inválido');
    }

    // Notes validation
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== 'string') {
        validationErrors.push('Las notas deben ser texto');
      } else if (notes.length > 500) {
        validationErrors.push('Las notas no pueden exceder 500 caracteres');
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Errores de validación',
          details: validationErrors,
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Get consignor document by id
    let consignorData: ConsignorData | null = null;

    try {
      // Query the consignor with all columns
      const { data: consignorRecord, error: fetchError } = await supabase
        .from('consignors')
        .select('*')
        .eq('id', consignorId)
        .maybeSingle();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      if (consignorRecord) {
        consignorData = consignorRecord as ConsignorData;
        console.log('Consignor found:', {
          id: consignorData.id,
          name: consignorData.name,
          balanceDue: consignorData.balanceDue
        });
      }
    } catch (supabaseError) {
        console.error('Error fetching consignor:', {
        error: supabaseError,
        consignorId,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(
        {
          error: 'Error al acceder a la base de datos',
          code: 'DATABASE_ERROR',
          details: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    if (!consignorData) {
      return NextResponse.json(
        { 
          error: 'Consignador no encontrado',
          code: 'CONSIGNOR_NOT_FOUND',
          consignorId,
          timestamp: new Date().toISOString()
        },
        { status: 404 }
      );
    }

    const currentBalance = consignorData.balanceDue || 0;

    // Business logic validation
    if (currentBalance <= 0) {
      return NextResponse.json(
        { 
          error: 'No hay saldo pendiente para registrar pagos',
          code: 'NO_BALANCE_DUE',
          currentBalance,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    if (amount > currentBalance) {
      return NextResponse.json(
        { 
          error: 'El pago no puede exceder el saldo pendiente',
          code: 'PAYMENT_EXCEEDS_BALANCE',
          paymentAmount: amount,
          currentBalance,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Calculate new balance
    const newBalance = Math.max(0, currentBalance - amount);
    const roundedNewBalance = Math.round(newBalance * 100) / 100;
    const timestamp = nowIso();

    // Prepare transaction data
    const transactionData: PaymentTransaction = {
      id: randomUUID(),
      firestore_id: uuidv4(),
      consignorId: consignorData.id, // Use the UUID id from Supabase
      consignorName: consignorData.name, // Fixed capitalization to match DB schema
      amount: Math.round(amount * 100) / 100,
      paymentMethod: paymentMethod, // Fixed capitalization to match DB schema
      notes: notes?.trim() || undefined,
      previousBalance: Math.round(currentBalance * 100) / 100,
      newBalance: roundedNewBalance,
      transactionType: 'payment', // Fixed capitalization to match DB schema
      createdAt: timestamp, // Fixed capitalization to match DB schema
    };

    // Execute database operations
    try {
      console.log('=== STARTING DATABASE OPERATIONS ===');
      
      // Simple approach: try to insert and let Supabase handle table creation if needed
      // In Supabase, tables are typically created via migrations, not dynamically
      console.log('Attempting to record transaction directly...');
      console.log('Updating consignor balance:', {
        consignorId: consignorData.id,
        currentBalance,
        newBalance: roundedNewBalance,
        timestamp
      });

      // Update consignor balance using the id
      const { error: updateError } = await supabase
        .from('consignors')
        .update({
          balanceDue: roundedNewBalance,
        })
        .eq('id', consignorData.id);

      if (updateError) {
        console.error('Consignor update error:', updateError);
        throw updateError;
      }

      console.log('Consignor balance updated successfully');

      // Record the transaction in the database
      console.log('Recording transaction:', {
        transactionData
      });

      const { data: insertedTransaction, error: transactionError } = await supabase
        .from('consignor_transactions')
        .insert({
          firestore_id: transactionData.firestore_id,
          consignorid: transactionData.consignorId,
          consignorname: transactionData.consignorName,
          amount: transactionData.amount,
          paymentmethod: transactionData.paymentMethod,
          notes: transactionData.notes,
          previousbalance: transactionData.previousBalance,
          newbalance: transactionData.newBalance,
          transactiontype: transactionData.transactionType,
          createdat: transactionData.createdAt,
          processedby: transactionData.processedBy
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction recording error:', transactionError);
        throw transactionError;
      }

      console.log('Transaction recorded successfully:', insertedTransaction);

      // Log successful operation
      console.log(`Payment registered successfully:`, {
        consignorId: consignorData.id,
        consignorName: consignorData.name,
        amount,
        paymentMethod,
        previousBalance: currentBalance,
        newBalance: roundedNewBalance,
        transactionId: insertedTransaction?.id || 'unknown',
        processingTime: Date.now() - startTime,
      });

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: 'Pago registrado exitosamente',
          data: {
            transactionId: insertedTransaction?.id || 'unknown',
            consignorId: consignorData.id,
            consignorName: consignorData.name,
            paymentAmount: Math.round(amount * 100) / 100,
            paymentMethod,
            previousBalance: Math.round(currentBalance * 100) / 100,
            newBalance: roundedNewBalance,
            notes: notes?.trim() || undefined,
            timestamp: new Date().toISOString(),
          },
          processingTime: Date.now() - startTime,
        },
        { status: 200 }
      );

    } catch (updateError) {
      console.error('=== PAYMENT PROCESSING ERROR ===');
      console.error('Error updating consignor or recording transaction:', {
        error: updateError,
        errorMessage: updateError instanceof Error ? updateError.message : 'Unknown error',
        errorStack: updateError instanceof Error ? updateError.stack : undefined,
        consignorId: consignorData.id,
        amount,
        paymentMethod,
        timestamp: new Date().toISOString()
      });

      // Try to determine if it's a permission or network issue
      const errorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';

      return NextResponse.json(
        {
          error: 'Error al procesar el pago. Intente nuevamente.',
          code: 'PROCESSING_ERROR',
          details: errorMessage,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

  } catch (error) {
    // Catch-all error handler
    console.error('Unexpected error in payment registration:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Método no permitido. Use POST para registrar pagos.',
      code: 'METHOD_NOT_ALLOWED',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Método no permitido. Use POST para registrar pagos.',
      code: 'METHOD_NOT_ALLOWED',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Método no permitido. Use POST para registrar pagos.',
      code: 'METHOD_NOT_ALLOWED',
      timestamp: new Date().toISOString()
    },
    { status: 405 }
  );
}