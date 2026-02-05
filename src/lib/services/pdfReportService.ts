import { PDF, rgb, StandardFonts, Standard14Font, PDFPage } from '@libpdf/core';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MM_TO_PT = 2.83465;

interface PdfTableOptions {
    headers: string[];
    data: string[][];
    startY: number;
    columnWidths?: number[];
    fontSize?: number;
    headerColor?: [number, number, number];
}

interface ReportData {
    title: string;
    subtitle?: string;
    details?: string[];
    summary?: { label: string; value: string }[];
    table: {
        headers: string[];
        rows: string[][];
        columnWidths?: number[]; // Percentages or weighted values
    };
    filename: string;
}

export const generateReportPdf = async (reportData: ReportData): Promise<Blob> => {
    const pdf = await PDF.create();

    // A4 size: 210 x 297 mm
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pageWidthPt = pageWidthMm * MM_TO_PT;
    const pageHeightPt = pageHeightMm * MM_TO_PT;
    const marginMm = 15;
    const marginPt = marginMm * MM_TO_PT;
    const contentWidthPt = pageWidthPt - (marginPt * 2);

    const helveticaFont = Standard14Font.of(StandardFonts.Helvetica);
    const helveticaBold = Standard14Font.of(StandardFonts.HelveticaBold);

    let page = pdf.addPage([pageWidthPt, pageHeightPt] as any);
    let currentY = pageHeightPt - marginPt;
    let pageCount = 1;

    const addNewPage = () => {
        page = pdf.addPage([pageWidthPt, pageHeightPt] as any);
        currentY = pageHeightPt - marginPt;
        pageCount++;
    };

    const drawText = (text: string, x: number, y: number, options: { size: number; font?: any; color?: any; align?: 'left' | 'center' | 'right' } = { size: 10 }) => {
        const font = options.font || helveticaFont;
        const size = options.size;

        let drawX = x;
        if (options.align === 'center') {
            const width = font.widthOfTextAtSize(text, size);
            drawX = x - (width / 2);
        } else if (options.align === 'right') {
            const width = font.widthOfTextAtSize(text, size);
            drawX = x - width;
        }

        page.drawText(text, {
            x: drawX,
            y,
            size,
            font,
            color: options.color || rgb(0, 0, 0)
        });
    };

    // --- Header ---
    drawText(reportData.title, marginPt, currentY, { size: 18, font: helveticaBold });
    currentY -= 25;

    if (reportData.subtitle) {
        drawText(reportData.subtitle, marginPt, currentY, { size: 12, font: helveticaBold });
        currentY -= 15;
    }

    drawText(`Generado el: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, marginPt, currentY, { size: 10 });
    currentY -= 20;

    // --- Details/Filters ---
    if (reportData.details && reportData.details.length > 0) {
        reportData.details.forEach(detail => {
            drawText(detail, marginPt, currentY, { size: 10 });
            currentY -= 12;
        });
        currentY -= 10;
    }

    // --- Summary Section ---
    if (reportData.summary && reportData.summary.length > 0) {
        drawText('Resumen:', marginPt, currentY, { size: 12, font: helveticaBold });
        currentY -= 15;

        reportData.summary.forEach(item => {
            drawText(`${item.label}: ${item.value}`, marginPt, currentY, { size: 10 });
            currentY -= 12;
        });
        currentY -= 15;
    }

    // --- Table ---
    const headers = reportData.table.headers;
    const rows = reportData.table.rows;
    const colCount = headers.length;

    // Calculate column widths
    // If no specific widths provided, distribute evenly
    let colWidthsPt: number[] = [];
    if (reportData.table.columnWidths) {
        const totalWeight = reportData.table.columnWidths.reduce((a, b) => a + b, 0);
        colWidthsPt = reportData.table.columnWidths.map(w => (w / totalWeight) * contentWidthPt);
    } else {
        const w = contentWidthPt / colCount;
        colWidthsPt = new Array(colCount).fill(w);
    }

    const rowHeight = 20;
    const fontSize = 8;
    const headerColor = rgb(0.2, 0.4, 0.8); // Simple Blue

    // Draw Headers
    let x = marginPt;

    // Header Background
    page.drawRectangle({
        x: marginPt,
        y: currentY - 5,
        width: contentWidthPt,
        height: rowHeight,
        color: headerColor
    });

    headers.forEach((header, i) => {
        // Vertically center text in row
        // Approx Y shift for text baseline
        const textY = currentY + (rowHeight / 2) - (fontSize / 2) - 2;

        // Draw text inside the box (which is rect)
        // Wait, rect draws from bottom-left corner usually?
        // @libpdf/core rect y is bottom edge.
        // So if I draw rect at y = currentY - 5, height 20. Top is y+20.
        // My text currentY is a baseline. 
        // Let's stick to standard flow:

        // Draw Header Rect
        // We want the rect to encompass the text line.
        // currentY is our text baseline roughly. 
        // Let's define rowTop and rowBottom.

        // Simplification:
        // Move Y down for the row.
        const cellY = currentY;

        // Draw header text
        drawText(header, x + 2, cellY + 5, { size: fontSize, font: helveticaBold, color: rgb(1, 1, 1) });

        x += colWidthsPt[i];
    });

    currentY -= rowHeight;

    // Draw Rows
    const drawRow = (row: string[], isOdd: boolean) => {
        if (currentY < marginPt + rowHeight) {
            addNewPage();
            // Redraw header on new page? Optional. Let's keep it simple for now.
        }

        // Background for alternate rows? 
        // Skipping for simplicity or add light gray later.

        let x = marginPt;
        row.forEach((cell, i) => {
            let cellText = cell;
            // Basic truncation to fit cell
            const maxLen = Math.floor(colWidthsPt[i] / (fontSize * 0.6)); // approx char width
            if (cellText.length > maxLen) {
                cellText = cellText.substring(0, maxLen - 3) + '...';
            }

            drawText(cellText, x + 2, currentY + 5, { size: fontSize });
            x += colWidthsPt[i];
        });

        // Grid line below?
        page.drawLine({
            start: { x: marginPt, y: currentY },
            end: { x: marginPt + contentWidthPt, y: currentY },
            thickness: 0.5,
            color: rgb(0.8, 0.8, 0.8)
        });

        currentY -= rowHeight;
    };

    rows.forEach((row, idx) => {
        drawRow(row, idx % 2 === 1);
    });

    const pdfBytes = await pdf.save();
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
};
