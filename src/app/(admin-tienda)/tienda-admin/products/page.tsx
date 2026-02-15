import Link from "next/link";
import { getTiendaCmsProducts } from "@/lib/services/tiendaCmsService";

export default async function TiendaAdminProductsPage() {
  const products = await getTiendaCmsProducts(100);

  return (
    <main>
      <h2 className="font-editors-note text-4xl font-light">Productos</h2>
      <p className="mt-1 text-sm text-black/60">Catalogo gestionado con datos reales de Supabase.</p>

      <div className="flex justify-between items-center mt-6">
        <div className="overflow-hidden rounded-2xl border border-black/10 flex-1">
        </div>
        <div className="ml-4">
          <Link
            href="/tienda-admin/products/group"
            className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            Agrupar Variantes
          </Link>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#fff7cc] text-black">
            <tr>
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Precio</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-black/60">
                  No hay productos disponibles.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-t border-black/10">
                  <td className="px-4 py-3">{product.name}</td>
                  <td className="px-4 py-3 text-black/70">{product.sku || "-"}</td>
                  <td className="px-4 py-3 text-black/70">{product.category || "-"}</td>
                  <td className="px-4 py-3">
                    {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(product.price)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${product.stock <= 5 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
