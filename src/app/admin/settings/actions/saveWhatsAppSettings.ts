'use server';

import { getSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function saveWhatsAppSettings(
  branchId: string,
  whatsappNumber: string,
  whatsappApikey: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from('branches')
    .update({
      whatsapp_number: whatsappNumber || null,
      whatsapp_apikey: whatsappApikey || null,
    })
    .eq('id', branchId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
