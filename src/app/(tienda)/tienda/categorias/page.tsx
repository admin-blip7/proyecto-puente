import { getProducts, getCategories, type ProductFilters } from '@/lib/services/tiendaProductService'
import { TiendaProductCard } from '@/components/tienda/TiendaProductCard'
import { CategoriesGrid } from '@/components/tienda/CategoriesGrid'

interface CategoriesPageProps {
  searchParams: Promise<{
    page?: string
    sort?: string
  }>
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const resolvedSearchParams = await searchParams
  const categories = await getCategories()
  const page = parseInt(resolvedSearchParams.page || '1')
  const limit = 12

  // Get all products for preview
  const { products, total, hasMore } = await getProducts({
    limit,
    offset: (page - 1) * limit,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <main>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-editors-note text-4xl lg:text-5xl font-thin mb-4">
            Categorías
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Explora nuestro catálogo completo de productos de tecnología y electrónica.
          </p>
        </div>

        {/* Categories Grid */}
        <CategoriesGrid categories={categories} />
      </div>
    </main>
  )
}
