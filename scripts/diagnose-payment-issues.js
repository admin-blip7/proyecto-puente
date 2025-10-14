#!/usr/bin/env node

/**
 * Script de diagnóstico para problemas con el servicio de pagos
 * Este script ayuda a identificar y resolver problemas comunes con
 * las consultas de pagos de consignatarios en SSR
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Funciones de utilidad
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

function logSuccess(message, data = null) {
  log('success', `✅ ${message}`, data);
}

function logError(message, data = null) {
  log('error', `❌ ${message}`, data);
}

function logWarning(message, data = null) {
  log('warning', `⚠️ ${message}`, data);
}

function logInfo(message, data = null) {
  log('info', `ℹ️ ${message}`, data);
}

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Funciones de diagnóstico
async function checkEnvironmentVariables() {
  logInfo('Verificando variables de entorno...');
  
  const issues = [];
  
  if (!SUPABASE_URL) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL no está configurada');
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ANON_KEY) {
    issues.push('Ni SUPABASE_SERVICE_ROLE_KEY ni NEXT_PUBLIC_SUPABASE_ANON_KEY están configuradas');
  }
  
  if (issues.length > 0) {
    logError('Problemas con variables de entorno:', issues);
    return false;
  }
  
  logSuccess('Variables de entorno configuradas correctamente');
  return true;
}

async function testSupabaseConnection(useServiceRole = true) {
  const key = useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const keyType = useServiceRole ? 'SERVICE_ROLE' : 'ANON';
  
  logInfo(`Probando conexión a Supabase con clave ${keyType}...`);
  
  if (!key) {
    logWarning(`Clave ${keyType} no disponible`);
    return false;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    const { data, error } = await supabase.from('_health_check').select('*').limit(1);
    
    if (error) {
      logError(`Error de conexión con clave ${keyType}:`, error);
      return false;
    }
    
    logSuccess(`Conexión exitosa con clave ${keyType}`);
    return true;
  } catch (error) {
    logError(`Excepción al conectar con clave ${keyType}:`, error.message);
    return false;
  }
}

async function checkTableStructure(supabase) {
  logInfo('Verificando estructura de la tabla consignor_payments...');
  
  try {
    // Verificar si la tabla existe
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'consignor_payments');
    
    if (tableError) {
      logError('Error verificando existencia de la tabla:', tableError);
      return false;
    }
    
    if (!tables || tables.length === 0) {
      logError('La tabla consignor_payments no existe');
      return false;
    }
    
    logSuccess('Tabla consignor_payments existe');
    
    // Verificar columnas
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'consignor_payments')
      .order('ordinal_position');
    
    if (columnError) {
      logError('Error verificando columnas:', columnError);
      return false;
    }
    
    logInfo('Columnas encontradas:', columns.map(c => `${c.column_name} (${c.data_type})`));
    
    // Verificar columna de consignor
    const consignorColumns = columns.filter(c => 
      c.column_name.toLowerCase().includes('consignor')
    );
    
    if (consignorColumns.length === 0) {
      logError('No se encontraron columnas relacionadas con consignor');
      return false;
    }
    
    logSuccess('Columnas de consignor encontradas:', consignorColumns.map(c => c.column_name));
    
    // Verificar índices
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname, indexdef')
      .eq('tablename', 'consignor_payments')
      .eq('schemaname', 'public');
    
    if (indexError) {
      logWarning('No se pudieron verificar índices:', indexError);
    } else {
      logInfo('Índices encontrados:', indexes?.length || 0);
      if (indexes && indexes.length > 0) {
        indexes.forEach(idx => {
          logInfo(`  - ${idx.indexname}: ${idx.indexdef}`);
        });
      }
    }
    
    return true;
  } catch (error) {
    logError('Excepción verificando estructura:', error.message);
    return false;
  }
}

async function testPaymentQueries(supabase) {
  logInfo('Probando consultas de pagos...');
  
  // Primero, obtener un consignor de prueba
  const { data: consignors, error: consignorError } = await supabase
    .from('consignors')
    .select('id, name')
    .limit(1);
  
  if (consignorError) {
    logError('Error obteniendo consignor de prueba:', consignorError);
    return false;
  }
  
  if (!consignors || consignors.length === 0) {
    logWarning('No hay consignors disponibles para pruebas');
    return true;
  }
  
  const testConsignor = consignors[0];
  logInfo(`Usando consignor de prueba: ${testConsignor.name} (${testConsignor.id})`);
  
  // Probar diferentes nombres de columna
  const columnVariations = ['consignorid', 'consignorId', 'consignor_id'];
  let successfulColumn = null;
  
  for (const columnName of columnVariations) {
    logInfo(`Probando consulta con columna: ${columnName}`);
    
    try {
      const { data, error } = await supabase
        .from('consignor_payments')
        .select('*')
        .eq(columnName, testConsignor.id)
        .order('paymentDate', { ascending: false })
        .limit(5);
      
      if (error) {
        logError(`Error con columna ${columnName}:`, error);
      } else {
        logSuccess(`Consulta exitosa con columna ${columnName}`);
        successfulColumn = columnName;
        logInfo(`Se encontraron ${data?.length || 0} pagos`);
        break;
      }
    } catch (error) {
      logError(`Excepción con columna ${columnName}:`, error.message);
    }
  }
  
  if (!successfulColumn) {
    logError('Ninguna variación de columna funcionó');
    return false;
  }
  
  logSuccess(`Columna correcta identificada: ${successfulColumn}`);
  return true;
}

async function checkPermissions(supabase) {
  logInfo('Verificando permisos...');
  
  try {
    // Intentar leer de la tabla
    const { data, error } = await supabase
      .from('consignor_payments')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied')) {
        logError('Permisos insuficientes para leer la tabla consignor_payments');
        logInfo('Solución: Asegúrese de que el rol de Supabase tenga permisos SELECT en la tabla');
        return false;
      } else {
        logError('Error de permisos desconocido:', error);
        return false;
      }
    }
    
    logSuccess('Permisos de lectura verificados');
    return true;
  } catch (error) {
    logError('Excepción verificando permisos:', error.message);
    return false;
  }
}

async function runDiagnostics() {
  console.log('🔍 Iniciando diagnóstico del servicio de pagos...\n');
  
  // Paso 1: Verificar variables de entorno
  const envOk = await checkEnvironmentVariables();
  if (!envOk) {
    logError('Las variables de entorno no están configuradas correctamente');
    process.exit(1);
  }
  
  // Paso 2: Probar conexión con diferentes claves
  const serviceRoleOk = await testSupabaseConnection(true);
  const anonKeyOk = await testSupabaseConnection(false);
  
  if (!serviceRoleOk && !anonKeyOk) {
    logError('No se puede conectar a Supabase con ninguna clave');
    process.exit(1);
  }
  
  // Usar la clave que funcionó
  const useServiceRole = serviceRoleOk;
  const key = useServiceRole ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const keyType = useServiceRole ? 'SERVICE_ROLE' : 'ANON';
  
  logInfo(`Usando clave ${keyType} para pruebas restantes`);
  
  const supabase = createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  // Paso 3: Verificar estructura de la tabla
  const structureOk = await checkTableStructure(supabase);
  if (!structureOk) {
    logError('Problemas con la estructura de la tabla');
  }
  
  // Paso 4: Verificar permisos
  const permissionsOk = await checkPermissions(supabase);
  if (!permissionsOk) {
    logError('Problemas con los permisos');
  }
  
  // Paso 5: Probar consultas
  const queriesOk = await testPaymentQueries(supabase);
  if (!queriesOk) {
    logError('Problemas con las consultas de pagos');
  }
  
  // Resumen
  console.log('\n📊 Resumen del diagnóstico:');
  console.log(`  Variables de entorno: ${envOk ? '✅' : '❌'}`);
  console.log(`  Conexión Supabase (${keyType}): ${serviceRoleOk || anonKeyOk ? '✅' : '❌'}`);
  console.log(`  Estructura de tabla: ${structureOk ? '✅' : '❌'}`);
  console.log(`  Permisos: ${permissionsOk ? '✅' : '❌'}`);
  console.log(`  Consultas: ${queriesOk ? '✅' : '❌'}`);
  
  const allOk = envOk && (serviceRoleOk || anonKeyOk) && structureOk && permissionsOk && queriesOk;
  
  if (allOk) {
    console.log('\n🎉 Todos los tests pasaron. El servicio de pagos debería funcionar correctamente.');
  } else {
    console.log('\n⚠️ Se encontraron problemas. Revise los errores arriba para soluciones.');
  }
  
  rl.close();
}

// Ejecutar diagnóstico
if (require.main === module) {
  runDiagnostics().catch(error => {
    logError('Error durante el diagnóstico:', error);
    rl.close();
    process.exit(1);
  });
}

module.exports = {
  checkEnvironmentVariables,
  testSupabaseConnection,
  checkTableStructure,
  testPaymentQueries,
  checkPermissions,
  runDiagnostics
};