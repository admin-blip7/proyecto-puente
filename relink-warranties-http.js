const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/crm/relink-warranties',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': 0
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n✅ REPARACIÓN COMPLETADA\n');
      console.log(result.summary);
      console.log('\n📊 Detalles:');
      result.results.details.forEach((detail, idx) => {
        const warranty = detail.warranty_id.slice(0, 8);
        console.log(`  ${idx + 1}. [${detail.status.toUpperCase()}] ${warranty}... → ${detail.reason || 'OK'}`);
      });
      console.log(`\n📈 Resumen: ${result.results.linked} vinculadas, ${result.results.failed} fallidas\n`);
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\nSi el servidor no está corriendo, intenta abrir en el navegador:');
  console.log('  http://localhost:3000/api/crm/relink-warranties\n');
});

console.log('🔄 Ejecutando reparación de garantías...\n');
req.end();
