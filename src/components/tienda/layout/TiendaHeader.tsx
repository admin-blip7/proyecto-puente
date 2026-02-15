'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingCart, Search, Menu, X, User, Heart, ChevronDown, Monitor } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useCart } from '../cart/CartProvider'
import { CartDrawer } from '../cart/CartDrawer'
import { TiendaLogo } from './TiendaLogo'
import type { ProductCategory } from '@/lib/services/tiendaProductService'

interface CategoryWithSubs extends ProductCategory {
  subcategories?: ProductCategory[]
}

const MAIN_CATEGORIES = ['accesorios', 'celulares', 'audio', 'electrodomesticos']

async function fetchCategoriesFromSupabase(): Promise<CategoryWithSubs[]> {
  try {
    const { supabase } = await import('@/lib/supabaseClient')
    if (!supabase) return defaultCategories

    const { data: allCategories, error } = await supabase
      .from('product_categories')
      .select('value, label')
      .order('label')

    if (error || !allCategories || allCategories.length === 0) {
      return defaultCategories
    }

    // Filter main categories using fixed list
    const mainCategories = allCategories.filter(c => MAIN_CATEGORIES.includes(c.value))

    // Define subcategories mapping
    const subcategoriesMap: Record<string, { value: string; label: string }[]> = {
      'accesorios': [
        { value: 'audifonos', label: 'Audífonos' },
        { value: 'cargadores', label: 'Cargadores' },
        { value: 'cables', label: 'Cables' },
        { value: 'memorias', label: 'Memorias' },
        { value: 'mica', label: 'Mica Protectora' },
      ],
      'celulares': [
        { value: 'celulares-nuevos', label: 'Celulares Nuevos' },
        { value: 'celular-seminuevo', label: 'Celular Seminuevo' },
      ],
      'audio': [
        { value: 'equipos-de-sonido', label: 'Equipos de Sonido' },
      ],
      'electrodomesticos': [],
    }

    return mainCategories.map(main => ({
      value: main.value,
      label: main.label,
      subcategories: subcategoriesMap[main.value] || []
    }))
  } catch (err) {
    console.error('Error fetching categories:', err)
    return defaultCategories
  }
}

const defaultCategories: CategoryWithSubs[] = [
  {
    value: 'accesorios', label: 'Accesorios', subcategories: [
      { value: 'audifonos', label: 'Audífonos' },
      { value: 'cargadores', label: 'Cargadores' },
      { value: 'cables', label: 'Cables' },
      { value: 'memorias', label: 'Memorias' },
      { value: 'mica', label: 'Mica Protectora' },
    ]
  },
  {
    value: 'celulares', label: 'Celulares', subcategories: [
      { value: 'celulares-nuevos', label: 'Celulares Nuevos' },
      { value: 'celular-seminuevo', label: 'Celular Seminuevo' },
    ]
  },
  {
    value: 'electrodomesticos', label: 'Electrodomésticos'
  },
  {
    value: 'audio', label: 'Equipos de Sonido', subcategories: [
      { value: 'equipos-de-sonido', label: 'Equipos de Sonido' },
    ]
  },
]

export function TiendaHeader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [headerCategories, setHeaderCategories] = useState<CategoryWithSubs[]>([])
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { itemCount } = useCart()

  useEffect(() => {
    if (searchParams?.get('cart') === 'open') {
      setIsCartOpen(true)
    }

    fetchCategoriesFromSupabase().then(setHeaderCategories)
  }, [searchParams])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const categories = (headerCategories.length > 0 ? headerCategories : defaultCategories)
    .sort((a, b) => a.label.localeCompare(b.label))

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/tienda/buscar?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-white/90 backdrop-blur-md dark:bg-black/90">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-6">
            <Link href="/tienda" className="flex items-center gap-2">
              <TiendaLogo className="text-base lg:text-lg" />
            </Link>

            <nav className="hidden md:flex items-center gap-5" ref={dropdownRef}>
              <Link href="/tienda" className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
                Inicio
              </Link>
              {categories.map((cat) => (
                <div key={cat.value} className="relative">
                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    <>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === cat.value ? null : cat.value)}
                        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {cat.label}
                        <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === cat.value ? 'rotate-180' : ''}`} />
                      </button>
                      {openDropdown === cat.value && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-black border border-border rounded-lg shadow-lg py-2 z-50">
                          <Link
                            href={`/tienda/categoria/${cat.value}`}
                            className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
                            onClick={() => setOpenDropdown(null)}
                          >
                            Ver todo
                          </Link>
                          {cat.subcategories.map((sub) => (
                            <Link
                              key={sub.value}
                              href={`/tienda/categoria/${sub.value}`}
                              className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary"
                              onClick={() => setOpenDropdown(null)}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={`/tienda/categoria/${cat.value}`}
                      className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {cat.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="hidden lg:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar productos..."
                    className="h-10 w-64 rounded-full border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                  />
                </div>
              </form>

              <Link href="/tienda/favoritos" className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white hover:border-accent transition-colors dark:bg-black">
                <Heart className="h-4 w-4" />
              </Link>

              <Link href="/tienda/cuenta/perfil" className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white hover:border-accent transition-colors dark:bg-black">
                <User className="h-4 w-4" />
              </Link>

              <Link href="/pos" className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white hover:border-accent transition-colors dark:bg-black group/pos" title="Ir al POS">
                <Monitor className="h-4 w-4 group-hover/pos:text-accent transition-colors" />
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex h-10 items-center justify-center rounded-full border border-border bg-primary px-4 text-black hover:brightness-95 transition-all"
              >
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white lg:hidden dark:bg-black"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="lg:hidden py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="h-10 w-full rounded-full border border-border bg-secondary/30 pl-10 pr-4 text-sm outline-none focus:border-accent transition-all"
              />
            </div>
          </form>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden border-t border-border bg-white dark:bg-black">
            <nav className="container mx-auto px-4 py-4 space-y-2">
              <Link
                href="/tienda"
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-lg border border-transparent py-2 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:border-border hover:text-foreground"
              >
                Inicio
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.value}
                  href={`/tienda/categoria/${cat.value}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-lg border border-transparent py-2 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:border-border hover:text-foreground"
                >
                  {cat.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border mt-2">
                <Link
                  href="/pos"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg border border-transparent py-2 px-3 text-[11px] font-bold uppercase tracking-[0.2em] text-accent hover:border-border hover:bg-secondary/50"
                >
                  <Monitor className="h-4 w-4" />
                  Ir al POS
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
