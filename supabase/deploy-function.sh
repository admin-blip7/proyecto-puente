#!/bin/bash

# Script para desplegar la Edge Function de send-partner-credentials
# Uso: ./supabase/deploy-function.sh

PROJECT_REF="aaftjwktzpnyjwklroww"

echo "Desplegando Edge Function send-partner-credentials al proyecto de producción: $PROJECT_REF"

# Verificar que npx supabase esté disponible
if ! command -v npx &> /dev/null; then
    echo "Error: npx no está instalado. Por favor instala Node.js y npm."
    exit 1
fi

# Desplegar la función
npx supabase functions deploy send-partner-credentials \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt

# Verificar si el despliegue fue exitoso
if [ $? -eq 0 ]; then
    echo "✓ Edge Function desplegada exitosamente!"
    echo ""
    echo "Edge Function disponible en:"
    echo "https://$PROJECT_REF.supabase.co/functions/v1/send-partner-credentials"
    echo ""
    echo "IMPORTANTE: Asegúrate de configurar el secreto RESEND_API_KEY en:"
    echo "https://supabase.com/dashboard/project/$PROJECT_REF/functions/secrets"
else
    echo "✗ Error al desplegar la Edge Function"
    exit 1
fi
