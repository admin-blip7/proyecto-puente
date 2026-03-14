import { Product } from "@/types";

export const sanitizeScannedCode = (value: string) =>
  value.toLowerCase().replace(/[\s\-_.]/g, "");

export const findProductByScannedCode = (
  products: Product[],
  codeRaw: string
): Product | undefined => {
  const code = codeRaw.trim();
  const lower = code.toLowerCase();
  const sanitized = sanitizeScannedCode(code);

  let match = products.find(
    (product) =>
      product.sku?.trim().toLowerCase() === lower ||
      product.id?.toLowerCase() === lower ||
      product.id === code
  );
  if (match) return match;

  match = products.find(
    (product) =>
      sanitizeScannedCode(product.sku || "") === sanitized ||
      sanitizeScannedCode(product.id || "") === sanitized
  );
  if (match) return match;

  const skuMatch = code.match(/sku\s*[:=]\s*([A-Za-z0-9\-_.]+)/i);
  if (skuMatch?.[1]) {
    const candidate = products.find(
      (product) =>
        product.sku?.trim().toLowerCase() === skuMatch[1].toLowerCase()
    );
    if (candidate) return candidate;
  }

  const idMatch = code.match(/id\s*[:=]\s*([A-Za-z0-9\-_.]+)/i);
  if (idMatch?.[1]) {
    const candidate = products.find(
      (product) =>
        product.id?.trim().toLowerCase() === idMatch[1].toLowerCase()
    );
    if (candidate) return candidate;
  }

  try {
    return products.find((product) => {
      const attributes = product.attributes;
      if (!attributes || typeof attributes !== "object") return false;

      const barcode = attributes.barcode || attributes.code;
      if (
        typeof barcode === "string" &&
        sanitizeScannedCode(barcode) === sanitized
      ) {
        return true;
      }

      const imei = attributes.imei;
      if (typeof imei === "string" && sanitizeScannedCode(imei) === sanitized) {
        return true;
      }

      const serial = attributes.serial;
      if (
        typeof serial === "string" &&
        sanitizeScannedCode(serial) === sanitized
      ) {
        return true;
      }

      return false;
    });
  } catch {
    return undefined;
  }
};
