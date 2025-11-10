/**
 * Test script to verify PDF generation for cash close ticket
 * This script can be run in the browser console to test PDF generation
 */

const testPDFGeneration = async () => {
  console.log('=== PDF Generation Test ===');

  // Mock CashSession data
  const mockSession = {
    sessionId: 'TEST-SESSION-001',
    openedAt: new Date(),
    closedAt: new Date(),
    openedByName: 'Test Cashier',
    closedByName: 'Test Cashier',
    startingFloat: 500,
    totalCashSales: 2500,
    totalCardSales: 1500,
    totalCashPayouts: 200,
    expectedCashInDrawer: 2800,
    actualCashCount: 2750,
    difference: -50
  };

  try {
    // Import dependencies
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    console.log('Dependencies loaded successfully');

    // Create a test element
    const testElement = document.createElement('div');
    testElement.id = 'test-ticket';
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.style.top = '0';
    testElement.style.width = '80mm';
    testElement.style.fontFamily = 'Courier New, monospace';
    testElement.style.backgroundColor = 'white';
    testElement.style.color = 'black';
    testElement.style.padding = '10px';

    testElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1>Mi Tienda</h1>
        <p>Dirección de la Tienda</p>
        <p>Tel: 555-123-4567</p>
        <p>RFC: RFC-123456789</p>
      </div>

      <div style="text-align: center; margin-bottom: 20px;">
        <h2>=== CORTE DE CAJA ===</h2>
        <p>Folio: ${mockSession.sessionId}</p>
        <p>Fecha: ${new Date().toLocaleDateString()}</p>
      </div>

      <hr style="border: 1px dashed black;" />

      <div style="margin-bottom: 15px;">
        <p><strong>Turno:</strong></p>
        <p>  Apertura: ${new Date().toLocaleString()}</p>
        <p>  Cajero: ${mockSession.openedByName}</p>
        <p>  Cierre: ${new Date().toLocaleString()}</p>
        <p>  Cierra: ${mockSession.closedByName}</p>
      </div>

      <hr style="border: 1px dashed black;" />

      <div style="margin-bottom: 15px;">
        <p><strong>RESUMEN DE VENTAS:</strong></p>
        <div style="display: flex; justify-content: space-between;">
          <span>Fondo de Caja Inicial:</span>
          <span>$${mockSession.startingFloat.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Ventas en Efectivo:</span>
          <span>$${mockSession.totalCashSales.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Ventas con Tarjeta:</span>
          <span>$${mockSession.totalCardSales.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Gastos de Caja:</span>
          <span>$${mockSession.totalCashPayouts.toFixed(2)}</span>
        </div>
      </div>

      <hr style="border: 1px dashed black;" />

      <div style="margin-bottom: 15px;">
        <p><strong>CONTEO DE EFECTIVO:</strong></p>
        <div style="display: flex; justify-content: space-between;">
          <span>Efectivo Esperado:</span>
          <span>$${mockSession.expectedCashInDrawer.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Efectivo Contado:</span>
          <span>$${mockSession.actualCashCount.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; color: red;">
          <span>Diferencia:</span>
          <span>-$${Math.abs(mockSession.difference).toFixed(2)}</span>
        </div>
      </div>

      <hr style="border: 1px dashed black;" />

      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px dashed black; padding-top: 5px;">
          <span>TOTAL VENTAS DEL DÍA:</span>
          <span>$${(mockSession.totalCashSales + mockSession.totalCardSales).toFixed(2)}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <p style="font-size: 10px;">*** CORTE DE CAJA FINALIZADO ***</p>
        <p style="font-size: 10px;">Gracias por su preferencia</p>
        <p style="font-size: 10px;">Este documento no es un comprobante fiscal</p>
      </div>
    `;

    document.body.appendChild(testElement);
    console.log('Test element created in DOM');

    // Generate PDF
    console.log('Starting html2canvas...');
    const canvas = await html2canvas(testElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    console.log('Canvas generated:', {
      width: canvas.width,
      height: canvas.height
    });

    const imgData = canvas.toDataURL('image/png');
    console.log('Image data URL created');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, canvas.height * 80 / canvas.width]
    });

    console.log('PDF created with dimensions:', {
      width: 80,
      height: canvas.height * 80 / canvas.width
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 80, canvas.height * 80 / canvas.width);

    // Auto-print the PDF
    pdf.autoPrint();
    console.log('PDF autoPrint configured');

    // Open print dialog
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    console.log('Blob URL created:', url);

    const printWindow = window.open(url, '_blank');
    console.log('Print window opened:', !!printWindow);

    if (printWindow) {
      printWindow.onload = () => {
        console.log('Print window loaded');
        printWindow.print();
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
          }
          URL.revokeObjectURL(url);
          console.log('Print window closed and URL revoked');
        }, 1000);
      };
    } else {
      throw new Error('Failed to open print window');
    }

    // Clean up
    document.body.removeChild(testElement);
    console.log('Test element removed from DOM');

    console.log('=== Test Completed Successfully ===');
    return true;
  } catch (error) {
    console.error('=== Test Failed ===');
    console.error('Error:', error);
    return false;
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.testPDFGeneration = testPDFGeneration;
  console.log('Test function available. Run testPDFGeneration() to test PDF generation.');
}

export default testPDFGeneration;
