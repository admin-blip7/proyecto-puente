'use client'

import Link from 'next/link'
import { Slider } from '@/components/ui/slider'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { ProductCategory } from '@/lib/services/tiendaProductService'
import { formatCategoryLabel } from '@/lib/utils'

interface ProductFiltersProps {
  currentCategory: string
  categories: ProductCategory[]
  minPrice?: number
  maxPrice?: number
}

function formatCategoryLabelInternal(slug: string, originalLabel: string): string {
  // If the original label is already formatted (has spaces), use it
  if (originalLabel.includes(' ')) return originalLabel

  // Otherwise, format using central utility
  return formatCategoryLabel(originalLabel)
}

export function ProductFilters({
  currentCategory,
  categories,
  minPrice,
  maxPrice,
}: ProductFiltersProps) {
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true)
  const [isPriceExpanded, setIsPriceExpanded] = useState(true)
  const [priceRange, setPriceRange] = useState<[number, number]>([
    minPrice || 0,
    maxPrice || 50000,
  ])

  const updatePrice = (values: number[]) => {
    setPriceRange([values[0], values[1]])
  }

  const applyPriceFilter = () => {
    const url = new URL(window.location.href)
    if (priceRange[0] > 0) {
      url.searchParams.set('min', priceRange[0].toString())
    } else {
      url.searchParams.delete('min')
    }
    if (priceRange[1] < 50000) {
      url.searchParams.set('max', priceRange[1].toString())
    } else {
      url.searchParams.delete('max')
    }
    url.searchParams.delete('page') // Reset to page 1
    window.location.href = url.toString()
  }

  const clearPriceFilter = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('min')
    url.searchParams.delete('max')
    url.searchParams.delete('page')
    window.location.href = url.toString()
  }

  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined

  // Filter out specific categories
  const excludedCategories = ['accesorios', 'audio', 'audios', 'celular', 'celulares']
  const visibleCategories = categories
    .filter(cat => !excludedCategories.includes(cat.value.toLowerCase().trim()))
    .map(cat => ({
      ...cat,
      formattedLabel: formatCategoryLabelInternal(cat.value, cat.label)
    }))
    .sort((a, b) => a.formattedLabel.localeCompare(b.formattedLabel))

  return (
    <aside className="space-y-6">
      {/* Categories */}
      <div>
        <button
          onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
          className="flex w-full items-center justify-between font-semibold text-sm uppercase tracking-wider py-2"
        >
          Categorías
          {isCategoriesExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isCategoriesExpanded && (
          <ul className="mt-3 space-y-1">
            <li>
              <Link
                href="/tienda/categorias"
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Todas las categorías
              </Link>
            </li>
            {visibleCategories.slice(0, 10).map((category) => (
              <li key={category.value}>
                <Link
                  href={`/tienda/categoria/${category.value}`}
                  className={`block py-2 text-sm transition-colors ${category.value === currentCategory
                    ? 'text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {category.formattedLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button
          onClick={() => setIsPriceExpanded(!isPriceExpanded)}
          className="flex w-full items-center justify-between font-semibold text-sm uppercase tracking-wider py-2"
        >
          Precio
          {hasPriceFilter && (
            <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
              Activo
            </span>
          )}
          {isPriceExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isPriceExpanded && (
          <div className="mt-4 space-y-4">
            <div className="px-1">
              <Slider
                min={0}
                max={50000}
                step={500}
                value={priceRange}
                onValueChange={updatePrice}
                className="accent-accent"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">
                ${priceRange[0].toLocaleString('es-MX')}
              </span>
              <span className="text-muted-foreground">—</span>
              <span className="font-mono">
                ${priceRange[1].toLocaleString('es-MX')}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyPriceFilter}
                className="flex-1 rounded-lg bg-accent py-2 text-sm font-bold text-black hover:bg-accent/90 transition-colors"
              >
                Aplicar
              </button>
              {hasPriceFilter && (
                <button
                  onClick={clearPriceFilter}
                  className="px-4 rounded-lg border border-border py-2 text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
