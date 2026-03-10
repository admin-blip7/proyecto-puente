import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@2.0.0'

// Configurar Resend para enviar correos
// Necesitas agregar RESEND_API_KEY como secreto en Supabase
const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

interface EmailPayload {
  email: string
  partnerName: string
  userName?: string
  type: 'welcome' | 'reset' // 'welcome' for new users, 'reset' for password reset
}

// Headers CORS para permitir peticiones desde el frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejar preflight request de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verificar que sea una petición POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload: EmailPayload = await req.json()
    const { email, partnerName, userName, type = 'welcome' } = payload

    // Validar datos requeridos
    if (!email || !partnerName) {
      return new Response(JSON.stringify({ error: 'Faltan datos requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // URL del login y reset de contraseña
    const loginUrl = 'https://22electronic.com/login'
    const resetPasswordUrl = 'https://22electronic.com/reset-password'

    // Determinar el contenido del correo según el tipo
    const isWelcome = type === 'welcome'
    const subject = isWelcome 
      ? 'Bienvenido a 22 Electronic - Configura tu Contraseña'
      : '22 Electronic - Restablece tu Contraseña'
    
    const title = isWelcome
      ? `¡Bienvenido a ${partnerName}!`
      : 'Restablece tu Contraseña'

    const description = isWelcome
      ? 'Te hemos creado una cuenta de socio en nuestro sistema. Para acceder por primera vez, necesitas establecer tu contraseña.'
      : 'Has solicitado restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva contraseña.'

    // Generar el HTML del correo
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 30px 40px; border-bottom: 2px solid #FFD600; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #050505;">
                      Twenty Two Electronic.
                    </h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 22px; color: #050505;">${title}</h2>
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                      ${description}
                    </p>
                    <!-- User Info Box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9f9f9; border-radius: 6px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666666; font-weight: bold;">USUARIO / EMAIL:</p>
                          <p style="margin: 0; font-size: 16px; color: #050505; font-weight: bold;">${email}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      <strong>Importante:</strong> Si no solicitaste este correo, ignóralo safely.
                    </p>
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
                      <tr>
                        <td style="border-radius: 6px; background-color: #FFD600;">
                          <a href="${resetPasswordUrl}" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: bold; color: #050505; text-decoration: none;">
                            ${isWelcome ? 'Crear mi Contraseña' : 'Restablecer mi Contraseña'}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      O copia y pega este enlace en tu navegador:
                    </p>
                    <p style="margin: 10px 0; font-size: 12px; line-height: 1.6; color: #3B82F6; word-break: break-all;">
                      ${resetPasswordUrl}
                    </p>
                    <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      Si tienes alguna pregunta, no dudes en contactarnos.
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                      ${isWelcome ? '¡Bienvenido a la familia 22 Electronic!' : ''}
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 40px; background-color: #050505; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #999999;">
                      © 2025 22 Electronic. Todos los derechos reservados.
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #999999;">
                      Este es un correo automático, por favor no responder.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    // Generar texto plano
    const text = isWelcome
      ? `Bienvenido a ${partnerName}!

Te hemos creado una cuenta de socio en 22 Electronic.

TU CREDENCIAL DE ACCESO:
Usuario: ${email}

Para acceder por primera vez, necesitas establecer tu contraseña:
${resetPasswordUrl}

Por seguridad, te recomendamos cambiar tu contraseña después de tu primer inicio de sesión.

¡Bienvenido a la familia 22 Electronic!`
      : `Restablece tu Contraseña

Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva contraseña:

${resetPasswordUrl}

Si no solicitaste este correo, ignóralo.

© 2025 22 Electronic`

    // Enviar correo usando Resend
    // Usamos el dominio verificado 22electronicgroup.com
    const emailResult = await resend.emails.send({
      from: '22 Electronic <noreply@22electronicgroup.com>',
      to: email,
      subject: subject,
      html: html,
      text: text
    })

    return new Response(JSON.stringify({
      success: true,
      messageId: emailResult?.data?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(JSON.stringify({
      error: 'Error al enviar el correo',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
