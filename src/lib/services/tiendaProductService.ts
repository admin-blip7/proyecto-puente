import { supabase } from '@/lib/supabaseClient'
import { formatCategoryLabel } from '@/lib/utils'

const PRODUCT_IMAGE_BUCKET = 'products'

export interface Product {
  id: string
  firestore_id: string | null
  name: string
  sku: string | null
  price: number
  cost: number
  stock: number
  type: string
  ownership_type: string
  consignor_id: string | null
  category: string | null
  attributes: Record<string, any>
  parent_id?: string | null
  image_urls?: string[]
  created_at: string
  updated_at: string
}

export function getProductImageUrl(imagePath: string): string {
  if (!imagePath) return ''
  if (imagePath.startsWith('http')) return imagePath
  if (!supabase) return ''
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath)
  return data?.publicUrl || ''
}

export interface ProductCategory {
  value: string
  label: string
}

export interface ProductFilters {
  category?: string
  search?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'name' | 'price' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface PaginatedProducts {
  products: Product[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Get all products with optional filters and pagination
 */
export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  if (!supabase) throw new Error('Supabase client not initialized')

  const {
    category,
    search,
    minPrice,
    maxPrice,
    sortBy = 'created_at',
    sortOrder = 'desc',
    limit = 12,
    offset = 0,
  } = filters

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    // Only fetch parent products (or products without parents) for the main list
    // This hides individual variants from the catalog unless searched explicitly
    .is('parent_id', null)

  // Filter by category
  if (category) {
    query = query.eq('category', category)
  }

  // Search in name and SKU
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }

  // Price range filter
  if (minPrice !== undefined) {
    query = query.gte('price', minPrice)
  }
  if (maxPrice !== undefined) {
    query = query.lte('price', maxPrice)
  }

  // Order by
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Pagination
  const from = offset
  const to = offset + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching products:', error)
    throw new Error('Failed to fetch products')
  }

  return {
    products: (data || []) as Product[],
    total: count || 0,
    page: Math.floor(offset / limit) + 1,
    pageSize: limit,
    hasMore: (count || 0) > offset + limit,
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }

  return data as Product | null
}

/**
 * Get a single product by SKU
 */
export async function getProductBySKU(sku: string): Promise<Product | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('sku', sku)
    .single()

  if (error) {
    console.error('Error fetching product by SKU:', error)
    return null
  }

  return data as Product | null
}

/**
 * Get variants (children) of a product
 */
export async function getProductVariants(parentId: string): Promise<Product[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('parent_id', parentId)
    .gt('stock', 0) // Only show available variants? Maybe customizable
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching product variants:', error)
    return []
  }

  return (data || []) as Product[]
}

/**
 * Get all product categories
 */
export async function getCategories(): Promise<ProductCategory[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('product_categories')
    .select('value, label')
    .order('label')

  if (error) {
    console.error('Error fetching categories:', error)
    return []
  }

  // Also include unique categories from products table
  const { data: productCategories, error: productCatError } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null)

  if (!productCatError && productCategories) {
    const uniqueCategories = [...new Set(productCategories.map(p => p.category).filter(Boolean))]
    const combined = [...(data || [])]

    // Add any unique categories from products that aren't in product_categories
    for (const cat of uniqueCategories) {
      if (!combined.find(c => c.value === cat)) {
        combined.push({ value: cat, label: formatCategoryLabel(cat) })
      }
    }

    return combined
  }

  return (data || []) as ProductCategory[]
}

/**
 * Get featured products (products with high stock or recently added)
 */
export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .is('parent_id', null) // Only show parents or standalone products
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching featured products:', error)
    return []
  }

  return (data || []) as Product[]
}

/**
 * Get related products based on category
 */
export async function getRelatedProducts(
  productId: string,
  category: string | null,
  limit = 4
): Promise<Product[]> {
  if (!category) return []
  if (!supabase) return []

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .neq('id', productId)
    .is('parent_id', null) // Only show parents or standalone products
    .gt('stock', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching related products:', error)
    return []
  }

  return (data || []) as Product[]
}

/**
 * Generate a URL-friendly slug from product name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
}
