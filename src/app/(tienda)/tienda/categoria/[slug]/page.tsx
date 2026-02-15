import { notFound } from 'next/navigation'
import { getProducts, getCategories, type ProductFilters } from '@/lib/services/tiendaProductService'
import { TiendaProductCard } from '@/components/tienda/TiendaProductCard'
import { ProductFilters as ProductFiltersComponent } from '@/components/tienda/ProductFilters'
import { ProductSort } from '@/components/tienda/ProductSort'
import { Pagination } from '@/components/tienda/Pagination'
import { formatCategoryLabel } from '@/lib/utils'

interface CategoryPageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    page?: string
    sort?: string
    min?: string
    max?: string
  }>
}

export async function generateMetadata({ params }: CategoryPageProps) {
  const resolvedParams = await params
  const categories = await getCategories()
  const category = categories.find(c => c.value === resolvedParams.slug)

  if (!category) {
    return {
      title: 'Categoría no encontrada - 22 Electronic',
    }
  }

  return {
    title: `${category.label} - 22 Electronic`,
    description: `Explora todos los productos de ${category.label}`,
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const categories = await getCategories()
  const category = categories.find(c => c.value === resolvedParams.slug)

  // If category doesn't exist in DB, check if there are products with that category
  let displayLabel = category?.label || resolvedParams.slug

  // Try to find products with this category anyway
  const allCategoriesResult = await getCategories()
  const categoryExists = allCategoriesResult.some(c => c.value === resolvedParams.slug)

  if (!categoryExists) {
    // Check if we should still show products (category from URL might match product category)
    displayLabel = formatCategoryLabel(resolvedParams.slug)
  }

  // Parse filters
  const page = parseInt(resolvedSearchParams.page || '1')
  const limit = 12
  const offset = (page - 1) * limit

  const sortBy = resolvedSearchParams.sort === 'price-asc' ? 'price' : 'created_at'
  const sortOrder = resolvedSearchParams.sort === 'price-asc' ? 'asc' : 'desc'

  const filters: ProductFilters = {
    category: resolvedParams.slug,
    minPrice: resolvedSearchParams.min ? parseFloat(resolvedSearchParams.min) : undefined,
    maxPrice: resolvedSearchParams.max ? parseFloat(resolvedSearchParams.max) : undefined,
    sortBy,
    sortOrder,
    limit,
    offset,
  }

  const { products, total, hasMore } = await getProducts(filters)
  const totalPages = Math.ceil(total / limit)

  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-editors-note text-3xl lg:text-4xl font-thin mb-2">
            {displayLabel}
          </h1>
          <p className="text-muted-foreground">
            {total} producto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 lg:flex-shrink-0">
            <ProductFiltersComponent
              currentCategory={resolvedParams.slug}
              categories={categories}
              minPrice={resolvedSearchParams.min ? parseFloat(resolvedSearchParams.min) : undefined}
              maxPrice={resolvedSearchParams.max ? parseFloat(resolvedSearchParams.max) : undefined}
            />
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Sort Bar */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm text-muted-foreground">
                Mostrando {Math.min(offset + limit, total)} de {total}
              </span>
              <ProductSort currentSort={resolvedSearchParams.sort || 'newest'} />
            </div>

            {/* Grid */}
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                  {products.map((product) => (
                    <TiendaProductCard
                      key={product.id}
                      product={product}
                      categoryLabel={displayLabel}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    baseUrl={`/tienda/categoria/${resolvedParams.slug}`}
                    currentSort={resolvedSearchParams.sort}
                    currentMin={resolvedSearchParams.min}
                    currentMax={resolvedSearchParams.max}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
                  <span className="text-4xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  No se encontraron productos
                </h3>
                <p className="text-muted-foreground mb-6">
                  Intenta ajustar los filtros o explorar otras categorías.
                </p>
                <a
                  href={`/tienda/categoria/${resolvedParams.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-black hover:bg-accent/90 transition-colors"
                >
                  Limpiar filtros
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
