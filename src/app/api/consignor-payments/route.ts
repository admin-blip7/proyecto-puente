import { NextRequest, NextResponse } from 'next/server';
import { getAllConsignorPayments } from '@/lib/services/paymentService';
import { getConsignors } from '@/lib/services/consignorService';

export async function GET(request: NextRequest) {
    try {
        // Obtener todos los pagos
        const payments = await getAllConsignorPayments();
        
        // Obtener todos los consignadores para incluir sus nombres
        const consignors = await getConsignors();
        
        // Mapear pagos con información completa de consignadores
        const paymentsWithConsignorInfo = payments.map(payment => {
            const consignor = consignors.find(c => c.id === payment.consignorId);
            return {
                ...payment,
                consignorName: consignor?.name || 'Desconocido',
                consignorContact: consignor?.contactInfo || ''
            };
        });

        return NextResponse.json({
            success: true,
            data: paymentsWithConsignorInfo,
            total: paymentsWithConsignorInfo.length
        });

    } catch (error) {
        console.error('Error fetching consignor payments:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener los pagos de consignadores',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}