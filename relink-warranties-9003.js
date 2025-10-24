const http = require('http');

const options = {
  hostname: 'localhost',
  port: 9003,
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
      console.log('📊 ' + result.summary);
      console.log('\n📋 Detalles:');
      result.results.details.forEach((detail, idx) => {
        const warranty = detail.warranty_id.slice(0, 12);
        const status = detail.status.toUpperCase().padEnd(12);
        console.log(`  ${idx + 1}. [${status}] ${warranty} → ${detail.reason || 'OK'}`);
      });
      console.log(`\n✨ Resumen Final:`);
      console.log(`   ✅ Vinculadas: ${result.results.linked}`);
      console.log(`   ❌ Fallidas: ${result.results.failed}`);
      console.log(`   ⏭️  Procesadas: ${result.results.processed}\n`);
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n⚠️ Asegúrate que el servidor esté corriendo en puerto 9003\n');
});

console.log('🔄 Ejecutando reparación de garantías en localhost:9003...\n');
req.end();
