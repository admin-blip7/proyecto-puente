import { PDF, rgb, StandardFonts, Standard14Font } from '@libpdf/core';
import { format } from 'date-fns';
import { CashSession, Income, Expense, Sale } from '@/types/index';
import { calculateNetCashSales } from '@/lib/utils/cashCalculations';
import { formatCurrencyWithPreferences, getDateFnsLocale } from '@/lib/appPreferences';

const MM_TO_PT = 72 / 25.4; // Precise conversion: 1 inch = 72 pt, 1 inch = 25.4 mm

interface CashClosePdfOptions {
    session: CashSession;
    sales: any[]; // Using existing type looseness from original component
    expenses: any[];
    incomes: any[];
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    storeRFC?: string;
}

const defaultStoreInfo = {
    name: "Mi Tienda",
    address: "Dirección de la Tienda",
    phone: "555-123-4567",
    rfc: "RFC-123456789",
};

export const generateCashClosePdf = async (options: CashClosePdfOptions): Promise<Blob> => {
    const { session, sales = [], expenses = [], incomes = [] } = options;
    const storeName = options.storeName || defaultStoreInfo.name;
    const storeAddress = options.storeAddress || defaultStoreInfo.address;
    const storePhone = options.storePhone || defaultStoreInfo.phone;
    const storeRFC = options.storeRFC || defaultStoreInfo.rfc;

    // Filter display incomes logic from existing component
    const displayIncomes = incomes.filter((inc: any) =>
        inc.category !== 'Corte de Caja' &&
        !inc.description?.toLowerCase().includes('depósito de corte de caja')
    );

    const pdf = await PDF.create();
    const font = Standard14Font.of(StandardFonts.Helvetica);
    const fontBold = Standard14Font.of(StandardFonts.HelveticaBold);

    // Estimates
    const receiptWidthMm = 80;
    const receiptWidthPt = receiptWidthMm * MM_TO_PT;
    const marginMm = 10;
    const marginPt = marginMm * MM_TO_PT;
    const contentWidth = receiptWidthPt - (marginPt * 2);

    // Helper calculation logic (grouped products)
    const soldProducts: Record<string, { name: string; quantity: number; total: number }> = {};
    sales.forEach((sale: any) => {
        if (sale.status !== 'cancelled' && sale.items) {
            sale.items.forEach((item: any) => {
                const key = item.name;
                if (!soldProducts[key]) {
                    soldProducts[key] = { name: item.name, quantity: 0, total: 0 };
                }
                soldProducts[key].quantity += item.quantity;
                soldProducts[key].total += (item.priceAtSale * item.quantity);
            });
        }
    });
    const soldList = Object.values(soldProducts);

    // Estimated height calculation
    // Base header/footer: ~200pt
    // Sales lines: soldList.length * 12pt
    // Expenses lines: expenses.length * 12pt
    // Incomes lines: displayIncomes.length * 12pt
    // Summary/Totals: ~200pt
    // Bags: 3 * 30pt ~ 90pt
    let estimatedHeightPt = 600 + (soldList.length * 15) + (expenses.length * 15) + (displayIncomes.length * 15);

    // Create single long page for receipt
    // Create single long page for receipt
    // Create single long page for receipt
    // Create single long page for receipt
    const page = pdf.addPage({ width: receiptWidthPt, height: estimatedHeightPt });

    let y = estimatedHeightPt - marginPt;
    const fontSize = 9;
    const lineHeight = 11;

    const drawText = (text: string, x: number, align: 'left' | 'center' | 'right' = 'left', customFont = font, customSize = fontSize) => {
        let drawX = x;
        const textWidth = customFont.widthOfTextAtSize(text, customSize);

        if (align === 'center') {
            drawX = (receiptWidthPt / 2) - (textWidth / 2);
        } else if (align === 'right') {
            drawX = receiptWidthPt - marginPt - textWidth;
        }

        page.drawText(text, {
            x: drawX,
            y,
            size: customSize,
            font: customFont.name,
            color: rgb(0, 0, 0)
        });
    };

    const drawLine = () => {
        y -= 5;
        drawText('--------------------------------', marginPt, 'center');
        y -= 8;
    };

    // --- Header ---
    if (storeName) {
        drawText(storeName, marginPt, 'center', fontBold, 12);
        y -= 15;
    }
    if (storeAddress) {
        drawText(storeAddress, marginPt, 'center', font, 8);
        y -= 10;
    }
    if (storePhone) {
        drawText(`Tel: ${storePhone}`, marginPt, 'center', font, 8);
        y -= 10;
    }
    if (storeRFC) {
        drawText(`RFC: ${storeRFC}`, marginPt, 'center', font, 8);
        y -= 10;
    }

    y -= 5;
    drawText('=== CORTE DE CAJA ===', marginPt, 'center', fontBold, 10);
    y -= 12;
    drawText(`Folio: ${session.sessionId}`, marginPt, 'center');
    y -= 12;
    drawText(`Fecha: ${format(new Date(session.closedAt || session.openedAt), "dd/MM/yyyy HH:mm", { locale: getDateFnsLocale() })}`, marginPt, 'center');
    y -= 12;

    drawLine();

    // --- Session Info ---
    drawText('Turno:', marginPt, 'left', fontBold);
    y -= lineHeight;
    drawText(`  Apertura: ${format(new Date(session.openedAt), "dd/MM/yyyy HH:mm", { locale: getDateFnsLocale() })}`, marginPt);
    y -= lineHeight;
    drawText(`  Cajero: ${session.openedByName}`, marginPt);
    y -= lineHeight;
    if (session.closedAt) {
        drawText(`  Cierre: ${format(new Date(session.closedAt), "dd/MM/yyyy HH:mm", { locale: getDateFnsLocale() })}`, marginPt);
        y -= lineHeight;
        drawText(`  Cierra: ${session.closedByName || ''}`, marginPt);
        y -= lineHeight;
    }

    drawLine();

    // --- Sales Detail ---
    if (soldList.length > 0) {
        drawText('DETALLE DE PRODUCTOS:', marginPt, 'left', fontBold);
        y -= lineHeight;
        soldList.forEach(item => {
            // Left: Qty x Name
            // Right: Total
            const leftText = `${item.quantity}x ${item.name}`.substring(0, 20);
            drawText(leftText, marginPt, 'left');
            drawText(formatCurrencyWithPreferences(item.total), 0, 'right');
            y -= lineHeight;
        });
        drawLine();
    }

    // --- Expenses Detail ---
    if (expenses.length > 0) {
        drawText('DETALLE DE GASTOS:', marginPt, 'left', fontBold);
        y -= lineHeight;
        expenses.forEach((exp: any) => {
            const desc = (exp.description || exp.category).substring(0, 18);
            drawText(desc, marginPt, 'left');
            drawText(formatCurrencyWithPreferences(exp.amount), 0, 'right');
            y -= lineHeight;
        });
        drawLine();
    }

    // --- Sales Summary ---
    drawText('RESUMEN DE VENTAS:', marginPt, 'left', fontBold);
    y -= lineHeight;

    const summaryRow = (label: string, val: number) => {
        drawText(label, marginPt, 'left');
        drawText(formatCurrencyWithPreferences(val), 0, 'right');
        y -= lineHeight;
    };

    summaryRow('Fondo de Caja Inicial:', session.startingFloat ?? 0);
    summaryRow('Ventas en Efectivo:', session.totalCashSales ?? 0);
    summaryRow('Ventas con Tarjeta:', session.totalCardSales ?? 0);
    summaryRow('Gastos de Caja:', session.totalCashPayouts ?? 0);

    const totalIncome = displayIncomes.reduce((acc: number, inc: any) => acc + inc.amount, 0);
    summaryRow('Ingresos de Caja:', totalIncome);

    drawLine();

    // --- Incomes Detail ---
    if (displayIncomes.length > 0) {
        drawText('DETALLE DE INGRESOS:', marginPt, 'left', fontBold);
        y -= lineHeight;
        displayIncomes.forEach((inc: any) => {
            const desc = (inc.description || inc.category).substring(0, 18);
            drawText(desc, marginPt, 'left');
            drawText(formatCurrencyWithPreferences(inc.amount), 0, 'right');
            y -= lineHeight;
        });
        drawLine();
    }

    drawLine();

    // --- Cash Count ---
    drawText('CONTEO DE EFECTIVO:', marginPt, 'left', fontBold);
    y -= lineHeight;
    summaryRow('Efectivo Esperado:', session.expectedCashInDrawer ?? 0);
    if (session.actualCashCount !== undefined) {
        summaryRow('Efectivo Contado:', session.actualCashCount);
    }
    if (session.difference !== undefined) {
        const diffLabel = 'Diferencia:';
        const diffVal = (session.difference >= 0 ? '+' : '-') + formatCurrencyWithPreferences(Math.abs(session.difference));
        drawText(diffLabel, marginPt, 'left', fontBold);
        drawText(diffVal, 0, 'right', fontBold);
        y -= lineHeight;
    }

    // --- Float Management ---
    if (session.cashLeftForNextSession !== undefined && session.cashLeftForNextSession > 0) {
        drawLine();
        drawText('GESTIÓN DE FOLIO DE CAMBIO:', marginPt, 'left', fontBold);
        y -= lineHeight;
        drawText('Cambio Dejado:', marginPt, 'left', fontBold);
        drawText(formatCurrencyWithPreferences(session.cashLeftForNextSession), 0, 'right', fontBold);
        y -= lineHeight;
        // Note text
        drawText('* Este monto se quedó en caja', marginPt, 'left', font, 8);
        y -= 10;

        if (session.startingFloat !== undefined) {
            drawText('Cambio Encontrado:', marginPt, 'left');
            drawText(formatCurrencyWithPreferences(session.startingFloat), 0, 'right');
            y -= lineHeight;
        }
    }



    // --- Totals ---
    if (session.actualCashCount !== undefined && session.startingFloat !== undefined) {
        const netCash = calculateNetCashSales(session.actualCashCount, session.startingFloat, session.cashLeftForNextSession ?? 0);
        drawText('Ventas Netas Efectivo:', marginPt, 'left', fontBold);
        drawText(formatCurrencyWithPreferences(netCash), 0, 'right', fontBold);
        y -= lineHeight + 5;
    }

    drawText('TOTAL VENTAS DEL DÍA:', marginPt, 'left', fontBold);
    drawText(formatCurrencyWithPreferences((session.totalCashSales ?? 0) + (session.totalCardSales ?? 0)), 0, 'right', fontBold);
    y -= lineHeight + 10;

    // --- Footer ---
    drawText('*** CORTE DE CAJA FINALIZADO ***', marginPt, 'center', font, 8);
    y -= 10;
    drawText('Gracias por su preferencia', marginPt, 'center', font, 8);
    y -= 10;
    drawText('Este documento no es un comprobante fiscal', marginPt, 'center', font, 8);

    const pdfBytes = await pdf.save();
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
};
