# Edge Functions de Supabase

Este directorio contiene las Edge Functions para el envío de correos electrónicos.

## Configuración Requerida

### 1. Configurar API Key de Resend

1. Ve a [Resend.com](https://resend.com/) y crea una cuenta
2. Obtén tu API Key
3. En Supabase, ve a: Settings → Edge Functions → Environment Variables
4. Agrega la siguiente variable:
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxx` (tu API key de Resend)

### 2. Verificar dominio de envío

Asegúrate de haber configurado y verificado el dominio `noreply@22electronic.com` en Resend.

## Funciones Disponibles

### send-partner-credentials

Envía un correo con las credenciales de acceso a un nuevo socio.

**Endpoint:** `/functions/v1/send-partner-credentials`

**Método:** POST

**Body:**
```json
{
  "email": "socio@ejemplo.com",
  "password": "Contraseña123",
  "partnerName": "TechParts MX",
  "userName": "Juan Pérez"
}
```

## Desplegar las Funciones

Para desplegar las Edge Functions, usa la CLI de Supabase:

```bash
# Instalar Supabase CLI si no está instalada
npm install -g supabase

# Login a Supabase
supabase login

# Link al proyecto
supabase link --project-ref ykbjcxkfpsbdwtorqybg

# Desplegar las funciones
supabase functions deploy send-partner-credentials
```

## Probar Localmente

```bash
# Iniciar el servidor local de Edge Functions
supabase functions serve

# En otra terminal, probar la función
curl -X POST http://localhost:54321/functions/v1/send-partner-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ejemplo.com",
    "password": "test1234",
    "partnerName": "Test Partner",
    "userName": "Test User"
  }'
```

## Solución Alternativa (sin Resend)

Si prefieres no usar Resend, puedes modificar la Edge Function para usar otro servicio como:
- SendGrid
- Mailgun
- Amazon SES
- Supabase Auth (para correos de confirmación)

O hacer el envío desde el frontend usando el cliente de Resend.
