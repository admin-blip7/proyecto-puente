import { getLogger } from "@/lib/logger";

const log = getLogger("deliveryWhatsappService");

const sanitizePhone = (phone: string) => phone.replace(/[^\d+]/g, "");

const buildMessage = (parts: Array<string | undefined>) => parts.filter(Boolean).join("\n");

// Fase 5: integración inicial vía enlace wa.me (sin proveedor externo obligatorio).
export const sendDeliveryNotification = async (
  phone: string,
  orderId: string,
  estimatedTime?: string
) => {
  const message = buildMessage([
    `Tu pedido ${orderId} está en ruta.`,
    estimatedTime ? `Hora estimada: ${estimatedTime}.` : undefined,
    "Gracias por comprar con nosotros.",
  ]);

  const waUrl = `https://wa.me/${sanitizePhone(phone)}?text=${encodeURIComponent(message)}`;
  log.info("Delivery notification generated", { orderId, phone: sanitizePhone(phone) });
  return { success: true, waUrl, message };
};

export const sendDeliveryConfirmation = async (phone: string, orderId: string) => {
  const message = buildMessage([
    `Pedido ${orderId} entregado exitosamente.`,
    "¡Gracias por tu preferencia!",
  ]);

  const waUrl = `https://wa.me/${sanitizePhone(phone)}?text=${encodeURIComponent(message)}`;
  log.info("Delivery confirmation generated", { orderId, phone: sanitizePhone(phone) });
  return { success: true, waUrl, message };
};

export const sendFailedDeliveryNotification = async (
  phone: string,
  orderId: string,
  reason: string
) => {
  const message = buildMessage([
    `No pudimos entregar tu pedido ${orderId}.`,
    `Motivo: ${reason}.`,
    "Contáctanos para reagendar.",
  ]);

  const waUrl = `https://wa.me/${sanitizePhone(phone)}?text=${encodeURIComponent(message)}`;
  log.info("Failed delivery notification generated", { orderId, phone: sanitizePhone(phone), reason });
  return { success: true, waUrl, message };
};
