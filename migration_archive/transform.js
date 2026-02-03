/**
 * ETL Script: Firestore JSON -> Postgres Clean JSON
 * Este script transforma los datos exportados de Firestore al formato 
 * requerido por las nuevas tablas de Postgres.
 */

const fs = require('fs');
const path = require('path');

// Función para convertir timestamp de Firestore a ISO String
function transformTimestamp(ts) {
    if (!ts) return null;
    if (ts._seconds) {
        return new Date(ts._seconds * 1000 + (ts._nanoseconds || 0) / 1000000).toISOString();
    }
    if (typeof ts === 'string') return ts;
    return null;
}

// Ejemplo: Transformar Ventas
function transformSale(sale) {
    return {
        id: crypto.randomUUID(), // Generar nuevo UUID si no existe
        firestore_id: sale.id || sale.firestore_id,
        sale_number: sale.saleId,
        total_amount: sale.totalAmount || 0,
        payment_method: sale.paymentMethod,
        cashier_id: sale.cashierId,
        cashier_name: sale.cashierName,
        customer_name: sale.customerName,
        customer_phone: sale.customerPhone,
        customer_email: sale.customerEmail,
        status: sale.status || 'completed',
        amount_paid: sale.amountPaid || 0,
        change_given: sale.changeGiven || 0,
        discount_amount: sale.discountAmount || 0,
        created_at: transformTimestamp(sale.createdAt),
        updated_at: transformTimestamp(sale.updatedAt) || transformTimestamp(sale.createdAt),
        cancelled_at: transformTimestamp(sale.cancelledAt),
        cancel_reason: sale.cancelReason
    };
}

// Ejemplo: Extraer items de una venta para la tabla hija
function extractSaleItems(sale, newSaleId) {
    if (!sale.items || !Array.isArray(sale.items)) return [];

    return sale.items.map(item => ({
        id: crypto.randomUUID(),
        sale_id: newSaleId,
        product_id: item.productId, // Nota: Esto será un string ID de Firestore, debe mapearse a UUID después
        product_name: item.name,
        quantity: item.quantity || 1,
        price_at_sale: item.priceAtSale || 0,
        consignor_id: item.consignorId,
        metadata: {
            serials: item.serials,
            original_product_id: item.productId
        }
    }));
}

// Lógica de procesamiento de archivo (ejemplo con ndjson)
function processFile(inputFile, outputSalesFile, outputItemsFile) {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const sales = data.sales || []; // Asumiendo formato de exportación JSON

    const transformedSales = [];
    const transformedItems = [];

    sales.forEach(s => {
        const ts = transformSale(s);
        transformedSales.push(ts);

        const items = extractSaleItems(s, ts.id);
        transformedItems.push(...items);
    });

    fs.writeFileSync(outputSalesFile, transformedSales.map(s => JSON.stringify(s)).join('\n'));
    fs.writeFileSync(outputItemsFile, transformedItems.map(i => JSON.stringify(i)).join('\n'));

    console.log(`✅ Transformación completada: ${transformedSales.length} ventas y ${transformedItems.length} items.`);
}

console.log('🚀 Script de transformación listo.');
console.log('Uso: node migration/transform.js <archivo_origen>');
