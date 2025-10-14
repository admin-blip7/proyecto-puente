#!/bin/bash

# Script para solucionar errores de SSR en Next.js
# Este script limpia el cache, reinicia el servidor y verifica errores comunes

echo "🔧 Iniciando proceso de reparación de errores SSR..."

# Paso 1: Limpiar cache de Next.js
echo "📁 Limpiando cache de Next.js..."
rm -rf .next
echo "✅ Cache de Next.js limpiado"

# Paso 2: Limpiar node_modules y reinstalar dependencias
echo "📦 Limpiando e reinstalando dependencias..."
rm -rf node_modules package-lock.json
npm install
echo "✅ Dependencias reinstaladas"

# Paso 3: Verificar archivos problemáticos
echo "🔍 Verificando archivos problemáticos..."

# Verificar sintaxis de archivos TypeScript críticos
echo "Verificando sintaxis de archivos TypeScript..."
npx tsc --noEmit --skipLibCheck

# Paso 4: Ejecutar script de diagnóstico
echo "🔬 Ejecutando script de diagnóstico de pagos..."
if [ -f "scripts/diagnose-payment-issues.js" ]; then
    node scripts/diagnose-payment-issues.js
else
    echo "⚠️ Script de diagnóstico no encontrado"
fi

# Paso 5: Iniciar servidor de desarrollo
echo "🚀 Iniciando servidor de desarrollo..."
echo "📝 Si el servidor se inicia correctamente, los errores han sido solucionados"
echo "   Si todavía hay errores, revisa los mensajes anteriores para más detalles"

npm run dev