const SUPPORT_WHATSAPP_PHONE = "522224219292";
const DEFAULT_SUPPORT_MESSAGE = "Hola, necesito soporte con mi compra en 22 Electronic.";

export const TIENDA_INSTAGRAM_URL = "https://www.instagram.com/22electronic/";
export const TIENDA_TIKTOK_URL = "https://www.tiktok.com/@22electronic";
export const TIENDA_SUPPORT_WHATSAPP_LABEL = "+52 222 421 9292";

export function buildWhatsappUrl(phone: string, message?: string): string {
  const sanitizedPhone = phone.replace(/[^\d]/g, "");
  if (!message?.trim()) {
    return `https://wa.me/${sanitizedPhone}`;
  }
  return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message.trim())}`;
}

export const TIENDA_SUPPORT_WHATSAPP_URL = buildWhatsappUrl(
  SUPPORT_WHATSAPP_PHONE,
  DEFAULT_SUPPORT_MESSAGE
);
