# Supabase Edge Functions

Este directorio contiene las Edge Functions de Supabase utilizadas en el proyecto.

## Funciones Disponibles

### send-partner-credentials
Envía correos electrónicos con credenciales de acceso a los socios.

- **Tipo**: Correo de bienvenida o restablecimiento de contraseña
- **Provider**: Resend
- **Secrets requeridos**: `RESEND_API_KEY`

## Configuración

### 1. Desplegar Edge Function

Para desplegar la función al proyecto actual (definido en `.env.local`):

```bash
./supabase/deploy-function.sh
```

Para desplegar a un proyecto específico:

```bash
./supabase/deploy-function.sh uonstxpwjwepqnkmgcyi
```

### 2. Configurar Secrets

Después de desplegar, necesitas configurar la API key de Resend:

1. Ve a: https://supabase.com/dashboard/project/[PROJECT_REF]/functions/secrets
2. Agrega un nuevo secreto:
   - **Nombre**: `RESEND_API_KEY`
   - **Valor**: Tu API key de Resend (`re_xxxxxxxx`)

### 3. Verificar Dominio en Resend

✅ **DOMINIO CONFIGURADO**: La Edge Function usa `noreply@22electronicgroup.com` que ya está verificado.

Si necesitas cambiar el dominio:

1. **Ve a**: https://resend.com/domains
2. **Verifica qué dominios tienes configurados**
3. **Si necesitas agregar uno nuevo**, configura los 3 registros DNS:
   - TXT para verificación
   - TXT para SPF
   - CNAME para DKIM
4. **Espera la propagación** (10-30 minutos)
5. **Haz clic en "Verify"** en Resend
6. **Actualiza la Edge Function** con el nuevo dominio

📖 **Guía completa**: Ver `supabase/VERIFY_DOMAIN.md` para más información.

## Proyecto de Supabase

- **Producción**: `aaftjwktzpnyjwklroww` (https://aaftjwktzpnyjwklroww.supabase.co)

## Solución de Problemas

### El correo no llega

1. **Verifica la consola del navegador** - Debes ver logs como:
   ```
   [emailService] Enviando correo de credenciales: ...
   [emailService] Correo enviado exitosamente
   ```

2. **Verifica que RESEND_API_KEY esté configurada** en el dashboard de Supabase

3. **Revisa los logs de envío en Resend**: https://resend.com/logs

4. **Verifica que el dominio esté verificado** en Resend

5. **Revisa la carpeta de SPAM** del destinatario

### Error: Function not found

La Edge Function no está desplegada en el proyecto correcto. Ejecuta:

```bash
./supabase/deploy-function.sh [PROJECT_REF]
```

### Error: Invalid API Key

El secreto `RESEND_API_KEY` no está configurado o es inválido. Verifica en el dashboard de Supabase.
