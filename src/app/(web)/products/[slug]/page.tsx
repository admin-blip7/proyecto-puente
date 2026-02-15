import { notFound } from "next/navigation";
import { getProductById, getProducts } from "@/lib/services/productService";
import ProductDetailModern from "@/components/products/ProductDetailModern";
import { productMatchesSlug } from "@/lib/productSlugs";

export default async function ProductDetailPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;

  let product = await getProductById(slug);

  if (!product) {
    const products = await getProducts();
    product = products.find((item) => productMatchesSlug(item, slug)) ?? null;
  }

  if (!product) {
    notFound();
  }

  return <ProductDetailModern product={product} />;
}
