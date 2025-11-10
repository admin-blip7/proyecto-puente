/**
 * SCRIPT DE PRUEBA PARA IMPRESIÓN DE TICKET DE CORTE DE CAJA
 *
 * Este script se puede ejecutar en la consola del navegador (F12 > Console)
 * para verificar que la funcionalidad de impresión funciona correctamente.
 *
 * CÓMO USAR:
 * 1. Abrir Developer Tools (F12)
 * 2. Ir a la pestaña Console
 * 3. Pegar este script completo
 * 4. Presionar Enter
 * 5. Seguir las instrucciones en pantalla
 */

// ============================================================================
// CONFIGURACIÓN DE PRUEBA
// ============================================================================

const TEST_CONFIG = {
  // Habilitar logging verbose
  verbose: true,

  // Retraso entre pasos (ms)
  delay: 1000,

  // Datos de prueba para el ticket
  testSession: {
    sessionId: 'TEST-' + Date.now(),
    cashierName: 'Usuario de Prueba',
    openingTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 horas atrás
    closingTime: new Date().toISOString(),
    openingFloat: 500.00,
    totalSales: 1250.75,
    totalCashSales: 750.50,
    totalCardSales: 500.25,
    actualCashInDrawer: 750.50,
    expectedCashInDrawer: 1250.50,
    difference: 0,
    salesCount: 15
  }
};

// ============================================================================
// FUNCIONES DE PRUEBA
// ============================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = {
    'info': 'ℹ️',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'test': '🧪'
  }[type] || '📝';

  console.log(`${prefix} [${timestamp}] ${message}`);

  // También mostrar en pantalla si está disponible
  if (typeof document !== 'undefined' && document.body) {
    const logElement = document.getElementById('test-print-log');
    if (logElement) {
      logElement.innerHTML += `<div class="${type}">${prefix} ${message}</div>`;
      logElement.scrollTop = logElement.scrollHeight;
    }
  }
}

function createTestUI() {
  // Crear UI de prueba en la página
  if (document.getElementById('test-print-container')) return;

  const container = document.createElement('div');
  container.id = 'test-print-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 80vh;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    background: #3b82f6;
    color: white;
    padding: 12px 16px;
    border-radius: 6px 6px 0 0;
    font-weight: bold;
  `;
  header.textContent = '🧪 Test de Impresión de Ticket';

  const logDiv = document.createElement('div');
  logDiv.id = 'test-print-log';
  logDiv.style.cssText = `
    padding: 12px 16px;
    max-height: 300px;
    overflow-y: auto;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  `;

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    padding: 12px 16px;
    display: flex;
    gap: 8px;
  `;

  const runButton = document.createElement('button');
  runButton.textContent = '▶️ Ejecutar Prueba';
  runButton.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    background: #10b981;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  `;
  runButton.onmouseover = () => runButton.style.background = '#059669';
  runButton.onmouseout = () => runButton.style.background = '#10b981';

  const closeButton = document.createElement('button');
  closeButton.textContent = '✖️ Cerrar';
  closeButton.style.cssText = `
    padding: 8px 12px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  `;
  closeButton.onmouseover = () => closeButton.style.background = '#dc2626';
  closeButton.onmouseout = () => closeButton.style.background = '#ef4444';
  closeButton.onclick = () => container.remove();

  buttonContainer.appendChild(runButton);
  buttonContainer.appendChild(closeButton);

  container.appendChild(header);
  container.appendChild(logDiv);
  container.appendChild(buttonContainer);

  document.body.appendChild(container);

  return { runButton, logDiv };
}

async function testHtml2Canvas() {
  log('Probando html2canvas...', 'test');

  if (typeof html2canvas === 'undefined') {
    log('html2canvas NO está disponible. Instalar con: npm install html2canvas', 'error');
    return false;
  }

  log('html2canvas está disponible ✅', 'success');

  // Crear elemento de prueba
  const testElement = document.createElement('div');
  testElement.style.cssText = `
    width: 80mm;
    padding: 10px;
    background: white;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  `;
  testElement.innerHTML = `
    <div style="text-align: center; font-weight: bold;">
      TICKET DE PRUEBA
    </div>
    <div>Fecha: ${new Date().toLocaleString()}</div>
    <div>Cajero: Test User</div>
    <div>---------------------------</div>
    <div>Ticket de prueba generado</div>
    <div>para verificar html2canvas</div>
  `;

  testElement.style.position = 'absolute';
  testElement.style.left = '-9999px';
  document.body.appendChild(testElement);

  try {
    const canvas = await html2canvas(testElement, {
      scale: 2,
      backgroundColor: '#ffffff'
    });

    log(`Canvas generado: ${canvas.width}x${canvas.height}px ✅`, 'success');
    document.body.removeChild(testElement);
    return true;
  } catch (error) {
    log(`Error en html2canvas: ${error.message}`, 'error');
    document.body.removeChild(testElement);
    return false;
  }
}

async function testJsPDF() {
  log('Probando jsPDF...', 'test');

  if (typeof jsPDF === 'undefined') {
    log('jsPDF NO está disponible. Instalar con: npm install jspdf', 'error');
    return false;
  }

  log('jsPDF está disponible ✅', 'success');

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    pdf.text('PDF de prueba', 10, 10);
    log('PDF creado exitosamente ✅', 'success');

    // Intentar obtener blob
    const blob = pdf.output('blob');
    log(`Blob creado: ${Math.round(blob.size / 1024)}KB ✅`, 'success');

    return true;
  } catch (error) {
    log(`Error en jsPDF: ${error.message}`, 'error');
    return false;
  }
}

async function testPopupWindow() {
  log('Probando ventana popup...', 'test');

  const testUrl = 'data:text/html;base64,' + btoa(`
    <!DOCTYPE html>
    <html>
    <head><title>Ventana de Prueba</title></head>
    <body style="font-family: Arial; padding: 20px;">
      <h2>✅ Ventana emergente funcionando</h2>
      <p>Si puedes ver esto, las ventanas emergentes están habilitadas.</p>
      <p>Esta ventana se cerrará automáticamente en 3 segundos...</p>
    </body>
    </html>
  `);

  const popup = window.open(testUrl, 'testPopup', 'width=400,height=300');

  if (!popup) {
    log('⚠️ VENTANA BLOQUEADA - Bloqueador de popups detectado!', 'warning');
    log('Solución: Permitir popups para este sitio', 'info');
    return false;
  }

  log('Ventana emergente abierta correctamente ✅', 'success');

  setTimeout(() => {
    if (popup && !popup.closed) {
      popup.close();
      log('Ventana cerrada automáticamente ✅', 'success');
    }
  }, 3000);

  return true;
}

async function testFullPrintFlow() {
  log('=== INICIANDO PRUEBA COMPLETA DE IMPRESIÓN ===', 'test');
  log(`Sesión de prueba: ${TEST_CONFIG.testSession.sessionId}`, 'info');

  // 1. Verificar dependencias
  log('1. Verificando dependencias...', 'test');
  const canvasOk = await testHtml2Canvas();
  await sleep(500);
  const pdfOk = await testJsPDF();
  await sleep(500);
  const popupOk = await testPopupWindow();

  // 2. Resultado de dependencias
  log('2. Resultado de verificaciones:', 'test');
  log(`   - html2canvas: ${canvasOk ? '✅ OK' : '❌ FALLO'}`, canvasOk ? 'success' : 'error');
  log(`   - jsPDF: ${pdfOk ? '✅ OK' : '❌ FALLO'}`, pdfOk ? 'success' : 'error');
  log(`   - Ventana popup: ${popupOk ? '✅ OK' : '❌ BLOQUEADA'}`, popupOk ? 'success' : 'warning');

  // 3. Resumen
  log('3. Resumen de la prueba:', 'test');
  if (canvasOk && pdfOk) {
    if (popupOk) {
      log('✅ TODAS LAS PRUEBAS PASARON - La impresión debería funcionar', 'success');
      log('ℹ️ El ticket se imprimirá cuando hagas un corte de caja real', 'info');
    } else {
      log('⚠️ DEPENDENCIAS OK, pero ventanas emergentes están bloqueadas', 'warning');
      log('ℹ️ El sistema descargará el PDF como alternativa', 'info');
    }
  } else {
    log('❌ FALLAN DEPENDENCIAS - Instalar html2canvas y jspdf', 'error');
  }

  log('=== PRUEBA COMPLETADA ===', 'test');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// EJECUCIÓN
// ============================================================================

(function runTest() {
  log('🧪 Script de prueba cargado', 'test');
  log('Creando interfaz de prueba...', 'info');

  const ui = createTestUI();

  if (ui) {
    ui.runButton.onclick = testFullPrintFlow;
    log('Interfaz creada. Haz clic en "Ejecutar Prueba" para comenzar.', 'info');
  } else {
    log('Ejecutando prueba directamente...', 'info');
    testFullPrintFlow();
  }
})();

// Exportar para uso manual
window.testPrintFunctionality = {
  run: testFullPrintFlow,
  testHtml2Canvas,
  testJsPDF,
  testPopupWindow,
  config: TEST_CONFIG
};

log('💡 Para ejecutar la prueba: testPrintFunctionality.run()', 'info');
