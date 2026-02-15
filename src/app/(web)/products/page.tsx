import { getProducts } from '@/lib/services/productService';
import CasetifyProductCard from '@/components/products/CasetifyProductCard';

export default async function CatalogPage() {
  const allProducts = await getProducts();
  const products = allProducts.filter((product) => product.stock > 0);

  return (
    <div className="min-h-screen bg-[#dddddf] text-[#171717] transition-colors duration-300">
      <main className="mx-auto w-full max-w-[1920px] px-2 py-3 sm:px-4 sm:py-6 lg:px-6">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-none bg-transparent md:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <CasetifyProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-[12px] bg-[#efeff2] px-6 py-20 text-center">
            <h3 className="text-2xl font-semibold text-[#161616]">Sin productos en inventario</h3>
            <p className="mt-3 text-base text-[#636363]">
              Agrega productos con stock para mostrarlos en este catalogo.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
