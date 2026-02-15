import { getProducts, type ProductFilters } from '@/lib/services/tiendaProductService'
import { TiendaProductCard } from '@/components/tienda/TiendaProductCard'
import { SearchX } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams.q || ''
  const page = parseInt(resolvedSearchParams.page || '1')
  const limit = 12
  const offset = (page - 1) * limit

  const filters: ProductFilters = {
    search: query,
    limit,
    offset,
    sortBy: 'created_at',
    sortOrder: 'desc',
  }

  const { products, total, hasMore } = await getProducts(filters)
  const totalPages = Math.ceil(total / limit)

  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-editors-note text-3xl lg:text-4xl font-thin mb-2">
            Resultados de busqueda
          </h1>
          <p className="text-muted-foreground">
            {total > 0 
              ? `${total} producto${total !== 1 ? 's' : ''} encontrados para "${query}"`
              : 'No se encontraron productos para tu busqueda.'
            }
          </p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {products.map((product) => (
              <TiendaProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-secondary/30 rounded-2xl">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
              <SearchX className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              No encontramos resultados
            </h3>
            <p className="text-muted-foreground mb-6">
              Intenta con otros terminos o explora nuestras categorias.
            </p>
            <a
              href="/tienda/categorias"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-black hover:bg-accent/90 transition-colors"
            >
              Explorar categorias
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
