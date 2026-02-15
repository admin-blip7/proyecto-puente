// Script para limpiar cache y resolver problemas de Fast Refresh
const fs = require('fs');
const path = require('path');

function clearCache() {
  const cacheDirs = [
    '.next',
    '.next-dev',
    'node_modules/.cache',
    'dist'
  ];

  cacheDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Cache limpiado: ${dir}`);
      } catch (error) {
        console.log(`⚠️  No se pudo limpiar ${dir}:`, error.message);
      }
    }
  });

  console.log('✅ Cache limpiado exitosamente');
  console.log('💡 Reinicia el servidor de desarrollo para aplicar los cambios');
}

if (require.main === module) {
  clearCache();
}

module.exports = { clearCache };
