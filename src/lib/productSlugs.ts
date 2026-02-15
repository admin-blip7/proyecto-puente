import type { Product } from "@/types";

export const toProductSlug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const productMatchesSlug = (product: Product, slug: string): boolean => {
  const normalizedSlug = decodeURIComponent(slug).toLowerCase();
  return toProductSlug(product.name) === normalizedSlug;
};

