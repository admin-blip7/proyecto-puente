export const SINGLE_DELIVERY_DRIVER = {
  name: process.env.NEXT_PUBLIC_DELIVERY_DRIVER_NAME || "Repartidor 22",
  phone: process.env.NEXT_PUBLIC_DELIVERY_DRIVER_PHONE || "5210000000000",
};

export const sanitizeWhatsappPhone = (rawPhone: string) =>
  String(rawPhone || "").replace(/[^\d]/g, "");
