'use server';

import { getSupabaseServerClient } from '@/lib/supabaseServerClient';
import { sanitizeBranchTimeZone } from '@/lib/branchTimeZone';

export async function saveNotificacionesSettings(
  branchId: string,
  notificationEmail: string,
  timezone: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseServerClient();
  const safeTimeZone = sanitizeBranchTimeZone(timezone);
  let { error } = await supabase
    .from('branches')
    .update({
      notification_email: notificationEmail || null,
      timezone: safeTimeZone,
    })
    .eq('id', branchId);

  // Backward compatibility while migration is pending in an environment.
  if (error && /timezone/i.test(error.message || "")) {
    const fallback = await supabase
      .from('branches')
      .update({ notification_email: notificationEmail || null })
      .eq('id', branchId);
    error = fallback.error;
  }

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
