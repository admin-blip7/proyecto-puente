'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProductCategory } from '@/lib/services/tiendaProductService'
import { getCategories } from '@/lib/services/tiendaProductService'
import { formatCategoryLabel } from '@/lib/utils'
import { CategoryIcons as categoryIconsMap } from './CategoryIcons'

interface CategoriesSliderProps {
  includeCategories?: string[]
  excludeCategories?: string[]
  title?: string
}

export function CategoriesSlider({ includeCategories, excludeCategories, title = 'Explora por Categoría' }: CategoriesSliderProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)
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

      const processed = filtered.map(c => {
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
      
      // Calculate active index based on scroll position
      const cardWidth = 200
      const newIndex = Math.round(el.scrollLeft / cardWidth)
      setActiveIndex(Math.min(newIndex, categories.length - 1))
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

    const scrollAmount = 240
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <section className="py-10 lg:py-14 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider mb-4"
            >
              <Grid3X3 className="h-3 w-3" />
              Categorías
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-editors-note text-3xl lg:text-4xl font-thin"
            >
              {title}
            </motion.h2>
          </div>

          {/* Navigation Arrows */}
          <div className="hidden sm:flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all ${
                canScrollLeft 
                  ? 'border-border bg-background hover:border-accent hover:bg-accent/10' 
                  : 'border-border/30 bg-secondary/30 text-muted-foreground cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`h-12 w-12 rounded-full border flex items-center justify-center transition-all ${
                canScrollRight 
                  ? 'border-border bg-background hover:border-accent hover:bg-accent/10' 
                  : 'border-border/30 bg-secondary/30 text-muted-foreground cursor-not-allowed'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        {/* Slider */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="overflow-x-auto scroll-smooth no-scrollbar snap-x snap-mandatory touch-pan-x overscroll-x-contain -mx-4 px-4"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
          >
            <div className="flex w-max gap-4 pb-4">
              {categories.map((category, index) => {
                const icons = categoryIconsMap as Record<string, React.ComponentType<{ className?: string }>>
                const key = category.value.toLowerCase()
                const fallbackKey = Object.keys(icons).find(k => key.includes(k.toLowerCase())) || ''
                const Icon = icons[key] || icons[fallbackKey]
                const isActive = index === activeIndex

                return (
                  <motion.div
                    key={category.value}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/tienda/categoria/${category.value}`}
                      className={`flex flex-col items-center gap-4 p-6 rounded-3xl min-w-[180px] sm:min-w-[200px] snap-start transition-all duration-300 group ${
                        isActive 
                          ? 'bg-accent/10 border-2 border-accent' 
                          : 'bg-secondary/30 border-2 border-transparent hover:border-accent/30 hover:bg-secondary/50'
                      }`}
                    >
                      {/* Icon Container */}
                      <motion.div 
                        className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                          isActive 
                            ? 'bg-accent text-black' 
                            : 'bg-background text-foreground group-hover:bg-accent group-hover:text-black'
                        }`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        {Icon ? (
                          <Icon className="w-10 h-10" />
                        ) : (
                          <span className="text-4xl">📦</span>
                        )}
                      </motion.div>

                      {/* Label */}
                      <div className="text-center">
                        <span className={`font-medium block transition-colors ${
                          isActive ? 'text-accent' : 'group-hover:text-accent'
                        }`}>
                          {category.label}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          Ver productos →
                        </span>
                      </div>

                      {/* Decorative Dot */}
                      <motion.div 
                        className={`w-2 h-2 rounded-full transition-colors ${
                          isActive ? 'bg-accent' : 'bg-transparent group-hover:bg-accent/50'
                        }`}
                        animate={{ scale: isActive ? [1, 1.2, 1] : 1 }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>


        </div>

        {/* Progress Indicators */}
        <div className="flex justify-center gap-2 mt-6 sm:hidden">
          {categories.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'w-6 bg-accent' : 'w-1.5 bg-border'
              }`}
              animate={{ scale: index === activeIndex ? 1 : 0.8 }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
