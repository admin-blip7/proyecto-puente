import { notFound } from 'next/navigation'
import { getProductById, getRelatedProducts, type Product } from '@/lib/services/tiendaProductService'
import { ProductDetailsClient } from '@/components/tienda/ProductDetailsClient'
import { AddToCartButton } from '@/components/tienda/AddToCartButton'
import { ProductImageGallery } from '@/components/tienda/ProductImageGallery'
import { ProductInfo } from '@/components/tienda/ProductInfo'
import { ProductSpecs } from '@/components/tienda/ProductSpecs'

interface ProductPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: ProductPageProps) {
  const resolvedParams = await params
  const product = await getProductById(resolvedParams.id)

  if (!product) {
    return {
      title: 'Producto no encontrado - 22 Electronic',
    }
  }

  return {
    title: `${product.name} - 22 Electronic`,
    description: product.attributes?.description || `Compra ${product.name} en 22 Electronic`,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params
  const product = await getProductById(resolvedParams.id)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(
    product.id,
    product.category,
    4
  )

  return (
    <main>
      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 lg:px-8 py-4 text-xs text-muted-foreground">
        <ol className="flex items-center gap-2">
          <li><a href="/tienda" className="hover:text-foreground">Inicio</a></li>
          <li>/</li>
          {product.category && (
            <>
              <li>
                <a href={`/tienda/categoria/${product.category}`} className="hover:text-foreground">
                  {product.category}
                </a>
              </li>
              <li>/</li>
            </>
          )}
          <li className="text-foreground font-medium truncate max-w-[200px]">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Images */}
          <ProductImageGallery product={product} />

          {/* Info */}
          <div>
            <ProductInfo product={product} />
            <AddToCartButton product={product} />
          </div>
        </div>

        {/* Specs & Details */}
        <div className="mt-16">
          <ProductSpecs product={product} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <h2 className="font-editors-note text-2xl lg:text-3xl font-thin mb-8">
              Productos Relacionados
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <div
                  key={p.id}
                  className="group relative bg-white dark:bg-black rounded-xl overflow-hidden border border-border hover:border-accent transition-all"
                >
                  <a href={`/tienda/producto/${p.id}`} className="block">
                    <div className="aspect-square bg-secondary flex items-center justify-center">
                      <span className="text-4xl">📦</span>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-medium line-clamp-1 group-hover:text-accent">
                        {p.name}
                      </h3>
                      <p className="mt-2 font-bold">
                        ${p.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
