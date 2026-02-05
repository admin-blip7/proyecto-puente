import { PDF, rgb, StandardFonts, Standard14Font } from '@libpdf/core';
import { TicketSettings, Sale } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import { getLogger } from '@/lib/logger';

const log = getLogger('ticketPdfService');

// Constants for conversion (1 inch = 72 points, 1 inch = 25.4 mm)
const MM_TO_PT = 72 / 25.4; // ~2.83464566929

interface PdfTicketOptions {
    sale: Sale;
    settings: TicketSettings;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(amount);
};

export const generateTicketPdf = async ({ sale, settings }: PdfTicketOptions): Promise<Blob> => {
    // 1. Setup Document
    const pdf = await PDF.create();

    // Standard thermal paper widths: 58mm or 80mm. 
    // User requested specifically 8cm (80mm).
    const paperWidthMm = 80;
    const paperWidthPt = paperWidthMm * MM_TO_PT;

    // Base height estimation - calculate more space to avoid clipping
    let estimatedHeightMm = 55; // Header margin + space
    estimatedHeightMm += (sale.items?.length || 0) * 15; // Increased per item space
    if (settings.header.showLogo) estimatedHeightMm += 40;
    if (settings.footer.showQrCode) estimatedHeightMm += 50;
    estimatedHeightMm += 50; // Footer space + messages

    // Convert to points and set a reasonable minimum for short receipts
    const pageHeightPt = Math.max(350, estimatedHeightMm * MM_TO_PT);

    // Use Standard14Font for metrics and drawing
    const helveticaFont = Standard14Font.of(StandardFonts.Helvetica);
    const helveticaBold = Standard14Font.of(StandardFonts.HelveticaBold);

    console.log(`[generateTicketPdf] Paper Width: ${paperWidthPt}pt, Height: ${pageHeightPt}pt`);

    // Create page and force size (to avoid library default falling back to A4)
    // For thermal printers, width is fixed, height is variable.
    const page = pdf.addPage({ width: paperWidthPt, height: pageHeightPt });

    // Base font sizes for 80mm thermal paper
    // A bit larger for better readability on thermal prints
    const fontSize = settings.body.fontSize === 'xs' ? 10 : settings.body.fontSize === 'sm' ? 12 : 14;
    const headerFontSize = fontSize + 4;
    const smallFontSize = fontSize - 2;
    const lineHeight = fontSize * 1.35;

    // Fixed margins for 80mm thermal paper
    const marginMm = 6;
    const marginPt = marginMm * MM_TO_PT;
    const contentWidthPt = paperWidthPt - (marginPt * 2);

    // Start from TOP. 
    let currentY = pageHeightPt - marginPt;

    // Helper for centering text across the paperWidthPt
    const drawCenteredText = (text: string, size: number, y: number, font = helveticaFont) => {
        const textWidth = (font as any).widthOfTextAtSize(text, size);
        const x = (paperWidthPt - textWidth) / 2;
        page.drawText(text, { x, y, size, font: (font as any).name, color: rgb(0, 0, 0) });
    };

    const drawLeftText = (text: string, size: number, y: number, font = helveticaFont) => {
        page.drawText(text, { x: marginPt, y, size, font: (font as any).name, color: rgb(0, 0, 0) });
    };

    const drawRightText = (text: string, size: number, y: number, font = helveticaFont) => {
        const textWidth = (font as any).widthOfTextAtSize(text, size);
        const x = paperWidthPt - marginPt - textWidth;
        page.drawText(text, { x, y, size, font: (font as any).name, color: rgb(0, 0, 0) });
    }

    // Helper to move Y down
    const moveDown = (amount: number) => {
        currentY -= amount;
    };

    // --- HEADER ---

    // Logo
    if (settings.header.showLogo && settings.header.logoUrl) {
        try {
            const response = await fetch(settings.header.logoUrl);
            const buffer = await response.arrayBuffer();
            const imageBytes = new Uint8Array(buffer);

            const isPng = settings.header.logoUrl.toLowerCase().endsWith('.png');
            const isJpg = settings.header.logoUrl.toLowerCase().endsWith('.jpg') || settings.header.logoUrl.toLowerCase().endsWith('.jpeg');

            let image;
            if (isPng) image = await pdf.embedPng(imageBytes);
            else if (isJpg) image = await pdf.embedImage(imageBytes);

            if (image) {
                const logoWidth = 35 * MM_TO_PT; // ~35mm logo
                const logoHeight = logoWidth * (image.height / image.width);

                moveDown(logoHeight);
                page.drawImage(image, {
                    x: (paperWidthPt - logoWidth) / 2,
                    y: currentY,
                    width: logoWidth,
                    height: logoHeight
                });
                moveDown(10);
            }
        } catch (e) {
            console.error("Failed to embed logo", e);
        }
    }

    // Store Name
    if (settings.header.show.storeName && settings.header.storeName) {
        drawCenteredText(settings.header.storeName.toUpperCase(), headerFontSize, currentY, helveticaBold);
        moveDown(lineHeight + 4);
    }

    // Address, Phone, RFC
    const headerInfoSize = smallFontSize + 1;
    if (settings.header.show.address && settings.header.address) {
        drawCenteredText(settings.header.address, headerInfoSize, currentY);
        moveDown(lineHeight);
    }
    if (settings.header.show.phone && settings.header.phone) {
        drawCenteredText(`Tel: ${settings.header.phone}`, headerInfoSize, currentY);
        moveDown(lineHeight);
    }
    if (settings.header.show.rfc && settings.header.rfc) {
        drawCenteredText(`RFC: ${settings.header.rfc}`, headerInfoSize, currentY);
        moveDown(lineHeight);
    }
    moveDown(8);

    // Divider
    page.drawLine({
        start: { x: marginPt, y: currentY },
        end: { x: paperWidthPt - marginPt, y: currentY },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });
    moveDown(lineHeight);

    // Sale Info
    const infoSize = smallFontSize + 0.5;
    const dateStr = format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm", { locale: es });

    drawLeftText(`Folio: ${sale.saleId || sale.id.substring(0, 8)}`, infoSize, currentY);
    moveDown(lineHeight);
    drawLeftText(`Fecha: ${dateStr}`, infoSize, currentY);
    moveDown(lineHeight);
    drawLeftText(`Cajero: ${sale.cashierName}`, infoSize, currentY);
    moveDown(lineHeight);
    if (sale.customerName) {
        drawLeftText(`Cliente: ${sale.customerName}`, infoSize, currentY);
        moveDown(lineHeight);
    }

    moveDown(8);
    page.drawLine({
        start: { x: marginPt, y: currentY },
        end: { x: paperWidthPt - marginPt, y: currentY },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });
    moveDown(lineHeight);

    // --- BODY (ITEMS) ---
    drawLeftText("Desc", infoSize, currentY, helveticaBold);
    drawRightText("Total", infoSize, currentY, helveticaBold);
    moveDown(lineHeight + 2);

    for (const item of sale.items) {
        const qty = item.quantity;
        const name = item.name;
        const total = qty * item.priceAtSale;
        const totalText = formatCurrency(total);
        const totalWidth = (helveticaBold as any).widthOfTextAtSize(totalText, fontSize);
        const qtyPrefix = `${qty} x `;
        const prefixWidth = (helveticaFont as any).widthOfTextAtSize(qtyPrefix, fontSize);

        // Calculate available width for the name
        const nameMaxWidth = contentWidthPt - totalWidth - prefixWidth - 4; // 4pt padding

        // Split name into lines
        const words = name.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = (helveticaFont as any).widthOfTextAtSize(testLine, fontSize);

            if (testWidth > nameMaxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        // Draw first line with prefix and total price
        const firstLine = lines[0] || '';
        drawLeftText(`${qtyPrefix}${firstLine}`, fontSize, currentY);
        drawRightText(totalText, fontSize, currentY, helveticaBold);
        moveDown(lineHeight);

        // Draw subsequent lines indented
        for (let i = 1; i < lines.length; i++) {
            page.drawText(lines[i], {
                x: marginPt + prefixWidth,
                y: currentY,
                size: fontSize,
                font: (helveticaFont as any).name,
                color: rgb(0, 0, 0)
            });
            moveDown(lineHeight);
        }

        if (settings.body.showUnitPrice && qty > 1) {
            drawLeftText(`   (${formatCurrency(item.priceAtSale)} c/u)`, smallFontSize, currentY);
            moveDown(lineHeight);
        }
        moveDown(4); // Extra space between items
    }

    moveDown(5);
    page.drawLine({
        start: { x: marginPt, y: currentY },
        end: { x: paperWidthPt - marginPt, y: currentY },
        thickness: 0.5,
        color: rgb(0, 0, 0),
    });
    moveDown(lineHeight + 5);

    // --- SUMMARY ---
    const subtotal = sale.items.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);
    const total = sale.totalAmount;

    if (settings.footer.showSubtotal) {
        drawLeftText("Subtotal:", fontSize, currentY);
        drawRightText(formatCurrency(subtotal), fontSize, currentY);
        moveDown(lineHeight);
    }

    drawLeftText("TOTAL:", headerFontSize, currentY, helveticaBold);
    drawRightText(formatCurrency(total), headerFontSize, currentY, helveticaBold);
    moveDown(lineHeight + 10);

    if (sale.amountPaid !== undefined) {
        drawLeftText(`Pago (${sale.paymentMethod}):`, fontSize, currentY);
        drawRightText(formatCurrency(sale.amountPaid), fontSize, currentY);
        moveDown(lineHeight);
    }

    if (sale.changeGiven !== undefined) {
        drawLeftText("Cambio:", fontSize, currentY);
        drawRightText(formatCurrency(sale.changeGiven), fontSize, currentY);
        moveDown(lineHeight);
    }

    moveDown(20);

    // --- FOOTER ---
    const drawWrappedCenteredText = (text: string, size: number, font = helveticaFont) => {
        const maxWidth = paperWidthPt - (marginPt * 2.5);
        const words = text.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = (font as any).widthOfTextAtSize(testLine, size);

            if (textWidth > maxWidth && currentLine) {
                drawCenteredText(currentLine, size, currentY, font);
                moveDown(size * 1.3);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        if (currentLine) {
            drawCenteredText(currentLine, size, currentY, font);
            moveDown(size * 1.3);
        }
    };

    if (settings.footer.thankYouMessage) {
        drawWrappedCenteredText(settings.footer.thankYouMessage, fontSize);
        moveDown(5);
    }

    if (settings.footer.additionalInfo) {
        drawWrappedCenteredText(settings.footer.additionalInfo, smallFontSize);
        moveDown(5);
    }

    if (settings.footer.showQrCode && settings.footer.qrCodeUrl) {
        try {
            const qrDataUrl = await QRCode.toDataURL(settings.footer.qrCodeUrl, { margin: 1 });
            const base64Data = qrDataUrl.split(',')[1];
            const qrBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

            const qrImage = await pdf.embedPng(qrBytes);
            const qrSize = 40 * MM_TO_PT; // ~40mm QR code

            moveDown(qrSize + 10);
            page.drawImage(qrImage, {
                x: (paperWidthPt - qrSize) / 2,
                y: currentY,
                width: qrSize,
                height: qrSize
            });

        } catch (e) {
            console.error("QR Code generation failed", e);
        }
    }

    const pdfBytes = await pdf.save();
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
};
