'use client'
import Image from 'next/image'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { ProductCategory } from '@/lib/services/tiendaProductService'
import { getCategories } from '@/lib/services/tiendaProductService'
import { formatCategoryLabel } from '@/lib/utils'

import { CategoryIcons as categoryIconsMap } from './CategoryIcons'

interface CategoriesSliderProps {
  includeCategories?: string[]
  excludeCategories?: string[]
  title?: string
}

export function CategoriesSlider({ includeCategories, excludeCategories, title = 'Categorías' }: CategoriesSliderProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastTouchXRef = useRef<number | null>(null)
  const horizontalPanRef = useRef(false)

  useEffect(() => {
    getCategories().then(data => {
      let filtered = data

      if (includeCategories && includeCategories.length > 0) {
        filtered = filtered.filter(c => includeCategories.includes(c.value.toLowerCase().trim()))
      }

      if (excludeCategories && excludeCategories.length > 0) {
        filtered = filtered.filter(c => !excludeCategories.includes(c.value.toLowerCase().trim()))
      }

      // Format and sort
      const processed = filtered.map(c => {
        // Format label: replace hyphens with spaces and capitalize
        let label = c.label
        if (!label.includes(' ')) {
          label = formatCategoryLabel(c.value)
        }
        return { ...c, label }
      }).sort((a, b) => a.label.localeCompare(b.label))

      setCategories(processed)
    })
  }, [includeCategories, excludeCategories])

  useEffect(() => {
    const checkScroll = () => {
      const el = scrollRef.current
      if (!el) return
      setCanScrollLeft(el.scrollLeft > 0)
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
    }

    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', checkScroll)
      checkScroll()
      return () => el.removeEventListener('scroll', checkScroll)
    }
  }, [categories])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      lastTouchXRef.current = touch.clientX
      horizontalPanRef.current = false
    }

    const onTouchMove = (event: TouchEvent) => {
      const start = touchStartRef.current
      if (!start) return

      const touch = event.touches[0]
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y

      if (!horizontalPanRef.current && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
        horizontalPanRef.current = true
      }

      if (!horizontalPanRef.current) return

      if (lastTouchXRef.current !== null) {
        el.scrollLeft -= touch.clientX - lastTouchXRef.current
      }
      lastTouchXRef.current = touch.clientX
      event.preventDefault()
    }

    const onTouchEnd = () => {
      touchStartRef.current = null
      lastTouchXRef.current = null
      horizontalPanRef.current = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [categories.length])

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return

    const scrollAmount = 300
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="py-8 border-b border-border bg-secondary/40">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="font-editors-note text-2xl font-light">{title}</h2>

          <div className="relative w-full flex-1">
            <div
              ref={scrollRef}
              className="overflow-x-auto scroll-smooth no-scrollbar snap-x snap-mandatory touch-pan-x overscroll-x-contain pb-1"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
              <div className="flex w-max min-w-full gap-3 pr-4">
                {categories.map((category) => {
                  const icons = categoryIconsMap as Record<string, React.ComponentType<{ className?: string }>>
                  const key = category.value.toLowerCase() // Ensure case-insensitive lookup
                  const fallbackKey = Object.keys(icons).find(k => key.includes(k.toLowerCase())) || ''
                  const Icon = icons[key] || icons[fallbackKey]

                  return (
                    <Link
                      key={category.value}
                      href={`/tienda/categoria/${category.value}`}
                      className="flex flex-none w-[58vw] max-w-[220px] min-w-[170px] flex-col items-center gap-2 rounded-xl tienda-panel px-5 py-4 transition-all hover:border-accent hover:shadow-md snap-start group sm:w-auto sm:min-w-[120px]"
                    >
                      <span className="relative flex items-center justify-center w-12 h-12 mb-2 group-hover:scale-110 transition-transform text-foreground">
                        {Icon ? (
                          <Icon className="w-8 h-8 stroke-1" />
                        ) : (
                          <span className="text-3xl">📦</span>
                        )}
                      </span>
                      <span className="text-xs font-medium text-center">
                        {category.label}
                      </span>
                    </Link>
                  )
                })}
                <div className="w-1 flex-shrink-0" />
              </div>
            </div>

            {/* Scroll Buttons */}
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-white shadow-lg transition-colors hover:border-accent dark:bg-black sm:flex"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden h-10 w-10 items-center justify-center rounded-full border border-border bg-white shadow-lg transition-colors hover:border-accent dark:bg-black sm:flex"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
