#!/bin/bash

# Script para desplegar todas las Edge Functions a producción
# Uso: ./supabase/deploy-all-functions.sh

PROJECT_REF="aaftjwktzpnyjwklroww"

echo "Desplegando todas las Edge Functions al proyecto de producción: $PROJECT_REF"
echo ""

# Lista de funciones a desplegar
FUNCTIONS=("send-partner-credentials")

for func in "${FUNCTIONS[@]}"; do
    echo "Desplegando $func..."
    npx supabase functions deploy "$func" \
      --project-ref "$PROJECT_REF" \
      --no-verify-jwt

    if [ $? -eq 0 ]; then
        echo "✓ $func desplegada exitosamente"
    else
        echo "✗ Error al desplegar $func"
    fi
    echo ""
done

echo "Proceso completado."
echo "Configura los secrets en: https://supabase.com/dashboard/project/$PROJECT_REF/functions/secrets"
