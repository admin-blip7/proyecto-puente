import CheckoutPageClient from "@/components/checkout/CheckoutPageClient";
import { getProductById, getProducts } from "@/lib/services/productService";

type CheckoutSearchParams = Record<string, string | string[] | undefined>;

const toSafeNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.floor(parsed));
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutSearchParams>;
}) {
  const params = await searchParams;
  const productIdParam = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const qtyParam = Array.isArray(params.qty) ? params.qty[0] : params.qty;
  const initialQty = toSafeNumber(qtyParam, 1);

  const inventory = await getProducts();
  const fallbackProduct = inventory.find((item) => item.stock > 0) ?? inventory[0] ?? null;
  const selectedById = productIdParam ? await getProductById(productIdParam) : null;
  const selectedProduct = selectedById ?? fallbackProduct;

  if (!selectedProduct) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">No products available for checkout</h1>
      </main>
    );
  }

  const selectedImage =
    (typeof selectedProduct.attributes?.optimizedImageUrl === "string" && selectedProduct.attributes.optimizedImageUrl) ||
    selectedProduct.imageUrls?.[0] ||
    null;

  const addOns = inventory
    .filter((item) => item.id !== selectedProduct.id && item.stock > 0)
    .slice(0, 2)
    .map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price ?? 0),
      imageUrl:
        (typeof item.attributes?.optimizedImageUrl === "string" && item.attributes.optimizedImageUrl) ||
        item.imageUrls?.[0] ||
        null,
    }));

  return (
    <CheckoutPageClient
      product={{
        id: selectedProduct.id,
        name: selectedProduct.name,
        sku: selectedProduct.sku,
        price: Number(selectedProduct.price ?? 0),
        imageUrl: selectedImage,
        stock: Number(selectedProduct.stock ?? 0),
      }}
      addOns={addOns}
      initialQty={initialQty}
    />
  );
}
