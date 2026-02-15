import { getLogger } from "@/lib/logger";
import { toProductSlug } from "@/lib/productSlugs";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";

const log = getLogger("publicCatalogService");

const PRODUCTS_TABLE = "products";
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 24;

type ProductCatalogRow = {
  id: string | number | null;
  name: string | null;
  price: number | null;
  stock: number | null;
  category: string | null;
  image_urls: unknown;
  attributes: unknown;
};

export type PublicCatalogProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  imageUrl: string | null;
  optimizedImageUrl: string | null;
};

const normalizeLimit = (limit?: number): number => {
  const requestedLimit = Number(limit ?? DEFAULT_LIMIT);
  if (!Number.isFinite(requestedLimit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT);
};

const toPublicCatalogProduct = (row: ProductCatalogRow): PublicCatalogProduct => {
  const name = String(row.name ?? "").trim();
  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : [];
  const firstImage = imageUrls.find((entry) => typeof entry === "string" && entry.length > 0);
  const attributes = row.attributes && typeof row.attributes === "object"
    ? (row.attributes as Record<string, unknown>)
    : null;
  const optimizedImageUrl =
    attributes && typeof attributes.optimizedImageUrl === "string"
      ? attributes.optimizedImageUrl
      : null;

  return {
    id: String(row.id ?? ""),
    slug: toProductSlug(name),
    name,
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    category: row.category ? String(row.category) : null,
    imageUrl: typeof firstImage === "string" ? firstImage : null,
    optimizedImageUrl,
  };
};

export const getPublicCatalogProducts = async (options?: {
  limit?: number;
}): Promise<PublicCatalogProduct[]> => {
  const limit = normalizeLimit(options?.limit);
  const supabase = getSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .select("id,name,price,stock,category,image_urls,attributes,created_at")
      .gt("stock", 0)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? [])
      .map((row) => toPublicCatalogProduct(row as ProductCatalogRow))
      .filter((product) => product.id.length > 0 && product.name.length > 0);
  } catch (error) {
    log.error("Failed to fetch public catalog products", error);
    return [];
  }
};
