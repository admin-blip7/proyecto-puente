import { supabase } from '@/lib/supabaseClient'

interface SendPartnerCredentialsParams {
  email: string
  partnerName: string
  userName?: string
  type?: 'welcome' | 'reset'
}

/**
 * Envía un correo electrónico con las credenciales de acceso al socio
 * Usa Edge Function de Supabase para evitar problemas de CORS
 * 
 * NOTA DE SEGURIDAD: Este método ya NO envía contraseñas por correo.
 * En su lugar, envía un enlace para que el usuario configure/restablesca su contraseña.
 */
export async function sendPartnerCredentialsEmail({
  email,
  partnerName,
  userName,
  type = 'welcome'
}: SendPartnerCredentialsParams): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[emailService] Enviando correo de credenciales:', { email, partnerName, userName, type })

    // Verificar que el cliente de Supabase esté inicializado
    if (!supabase) {
      console.error('[emailService] Cliente de Supabase no está inicializado')
      return { success: false, error: 'Cliente de Supabase no disponible' }
    }

    // Usar siempre Edge Function de Supabase para evitar problemas de CORS
    const { data, error } = await supabase.functions.invoke('send-partner-credentials', {
      body: {
        email,
        partnerName,
        userName,
        type
      }
    })

    console.log('[emailService] Respuesta de Edge Function:', { data, error })

    if (error) {
      console.error('[emailService] Error sending partner credentials email:', error)
      return { success: false, error: error.message || 'Error al enviar correo' }
    }

    // Verificar que la respuesta sea exitosa
    if (data && typeof data === 'object' && 'success' in data) {
      if (!data.success) {
        console.error('[emailService] Edge Function retornó success:false', data)
        return { success: false, error: 'Error al enviar el correo' }
      }
    }

    console.log('[emailService] Correo enviado exitosamente')
    return { success: true }
  } catch (error: any) {
    console.error('[emailService] Error sending partner credentials email:', error)
    return { success: false, error: error?.message || 'Error al enviar el correo' }
  }
}

/**
 * Envía un correo de bienvenida al socio con instrucciones de acceso
 */
export async function sendPartnerWelcomeEmail({
  email,
  partnerName,
  loginUrl = 'https://22electronic.com/login'
}: {
  email: string
  partnerName: string
  loginUrl?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-partner-welcome', {
      body: {
        email,
        partnerName,
        loginUrl
      }
    })

    if (error) {
      console.error('Error sending welcome email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { success: false, error: 'Error al enviar el correo' }
  }
}
