'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  baseUrl: string
  currentSort?: string
  currentMin?: string
  currentMax?: string
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  currentSort,
  currentMin,
  currentMax,
}: PaginationProps) {
  const buildUrl = (page: number) => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', page.toString())
    if (currentSort) params.set('sort', currentSort)
    if (currentMin) params.set('min', currentMin)
    if (currentMax) params.set('max', currentMax)
    const queryString = params.toString()
    return `${baseUrl}${queryString ? `?${queryString}` : ''}`
  }

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const showAround = 2

    if (totalPages <= 7) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > showAround + 2) {
        pages.push('ellipsis')
      }

      // Show pages around current
      for (
        let i = Math.max(2, currentPage - showAround);
        i <= Math.min(totalPages - 1, currentPage + showAround);
        i++
      ) {
        pages.push(i)
      }

      if (currentPage < totalPages - showAround - 1) {
        pages.push('ellipsis')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  if (totalPages <= 1) return null

  const pageNumbers = getPageNumbers()

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Paginación">
      {/* Previous Button */}
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:border-accent hover:bg-secondary transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}

      {/* Page Numbers */}
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-10 w-10 items-center justify-center text-muted-foreground"
            >
              …
            </span>
          )
        }

        const isActive = page === currentPage
        return (
          <Link
            key={page}
            href={buildUrl(page)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
              isActive
                ? 'border-accent bg-accent text-black font-medium'
                : 'border-border hover:border-accent hover:bg-secondary'
            }`}
            aria-label={`Ir a página ${page}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {page}
          </Link>
        )
      })}

      {/* Next Button */}
      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:border-accent hover:bg-secondary transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}
