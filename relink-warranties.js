const https = require('https');

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

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('\n✅ REPARACIÓN COMPLETADA\n');
      console.log(result.summary);
      console.log('\nDetalles:');
      result.results.details.forEach((detail, idx) => {
        console.log(`${idx + 1}. Warranty ${detail.warranty_id.slice(0, 8)}... -> ${detail.status} ${detail.reason ? `(${detail.reason})` : ''}`);
      });
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  console.log('\n⚠️ Si el servidor no está corriendo en localhost:3000, intenta:');
  console.log('  1. Abre http://localhost:3000/api/crm/relink-warranties en el navegador');
  console.log('  2. Usa curl: curl -X POST http://localhost:3000/api/crm/relink-warranties');
});

console.log('🔄 Ejecutando reparación de garantías...\n');
req.end();
