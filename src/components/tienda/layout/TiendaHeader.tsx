'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingCart, Search, Menu, X, User, Heart, ChevronDown, Monitor, Zap } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '../cart/CartProvider'
import { CartDrawer } from '../cart/CartDrawer'
import { TiendaLogo } from './TiendaLogo'
import type { ProductCategory } from '@/lib/services/tiendaProductService'
import { useAuth } from '@/lib/hooks'

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

    const mainCategories = allCategories.filter(c => MAIN_CATEGORIES.includes(c.value))

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
  const [isScrolled, setIsScrolled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { itemCount } = useCart()
  const { userProfile } = useAuth()

  useEffect(() => {
    if (searchParams?.get('cart') === 'open') {
      setIsCartOpen(true)
    }

    fetchCategoriesFromSupabase().then(setHeaderCategories)
  }, [searchParams])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-border/50 shadow-lg shadow-black/5'
            : 'bg-background/50 backdrop-blur-sm border-border/30'
          }`}
      >
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/tienda" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <TiendaLogo className="text-base lg:text-lg" />
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1" ref={dropdownRef}>
              <Link
                href="/tienda"
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
              >
                Inicio
              </Link>

              <Link
                href="/tienda/seminuevos"
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-primary hover:text-primary/80 transition-colors rounded-full hover:bg-primary/10"
              >
                Seminuevos
              </Link>

              {categories.map((cat) => (
                <div key={cat.value} className="relative">
                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    <>
                      <button
                        onClick={() => setOpenDropdown(openDropdown === cat.value ? null : cat.value)}
                        className={`flex items-center gap-1 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] transition-all rounded-full ${openDropdown === cat.value
                            ? 'text-foreground bg-secondary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                          }`}
                      >
                        {cat.label}
                        <motion.div
                          animate={{ rotate: openDropdown === cat.value ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {openDropdown === cat.value && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full left-0 mt-2 w-56 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/10 py-3 z-50 overflow-hidden"
                          >
                            <div className="px-3 py-2 border-b border-border/30 mb-2">
                              <Link
                                href={`/tienda/categoria/${cat.value}`}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-foreground hover:text-accent transition-colors rounded-lg hover:bg-secondary/50"
                                onClick={() => setOpenDropdown(null)}
                              >
                                <Zap className="h-4 w-4 text-accent" />
                                Ver todo {cat.label}
                              </Link>
                            </div>
                            {cat.subcategories.map((sub) => (
                              <Link
                                key={sub.value}
                                href={`/tienda/categoria/${sub.value}`}
                                className="block px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                                onClick={() => setOpenDropdown(null)}
                              >
                                {sub.label}
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <Link
                      href={`/tienda/categoria/${cat.value}`}
                      className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-secondary"
                    >
                      {cat.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <form onSubmit={handleSearch} className="hidden lg:flex items-center">
                <div className="relative group">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="h-11 w-48 rounded-full border border-border/50 bg-secondary/30 pl-10 pr-4 text-sm outline-none focus:border-accent focus:bg-background focus:w-64 transition-all duration-300"
                  />
                </div>
              </form>

              {/* Icon Buttons */}
              <div className="hidden sm:flex items-center gap-1">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/tienda/favoritos"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background hover:border-accent/50 hover:bg-secondary/50 transition-all"
                  >
                    <Heart className="h-4 w-4" />
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/tienda/cuenta/perfil"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background hover:border-accent/50 hover:bg-secondary/50 transition-all"
                  >
                    <User className="h-4 w-4" />
                  </Link>
                </motion.div>

                {!userProfile && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link
                      href="/socio/registro"
                      className="flex h-11 items-center gap-2 rounded-full border border-border/50 bg-background px-3 hover:border-accent/50 hover:bg-secondary/50 transition-all text-xs font-bold uppercase tracking-wider"
                    >
                      Soy Socio
                    </Link>
                  </motion.div>
                )}

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/pos"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background hover:border-accent/50 hover:bg-secondary/50 transition-all group/pos"
                    title="Ir al POS"
                  >
                    <Monitor className="h-4 w-4 group-hover/pos:text-accent transition-colors" />
                  </Link>
                </motion.div>
              </div>

              {/* Cart Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsCartOpen(true)}
                className="relative flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-black font-bold text-sm hover:brightness-105 transition-all shadow-lg shadow-accent/20"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Carrito</span>
                <AnimatePresence mode="wait">
                  {itemCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md"
                    >
                      {itemCount > 99 ? '99+' : itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Mobile Menu Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background lg:hidden"
              >
                <AnimatePresence mode="wait">
                  {isMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="lg:hidden py-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar productos..."
                className="h-11 w-full rounded-full border border-border/50 bg-secondary/30 pl-10 pr-4 text-sm outline-none focus:border-accent transition-all"
              />
            </div>
          </form>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl overflow-hidden"
            >
              <nav className="container mx-auto px-4 py-4 space-y-1">
                <Link
                  href="/tienda"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl py-3 px-4 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  Inicio
                </Link>

                <Link
                  href="/tienda/seminuevos"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl py-3 px-4 text-sm font-bold uppercase tracking-wider text-primary hover:bg-primary/10 transition-all"
                >
                  Seminuevos
                </Link>

                {categories.map((cat) => (
                  <Link
                    key={cat.value}
                    href={`/tienda/categoria/${cat.value}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl py-3 px-4 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                  >
                    {cat.label}
                  </Link>
                ))}

                <div className="pt-3 border-t border-border/30 mt-3">
                  {!userProfile && (
                    <Link
                      href="/socio/registro"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl py-3 px-4 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                    >
                      Soy Socio
                    </Link>
                  )}
                  <Link
                    href="/pos"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl py-3 px-4 text-sm font-bold uppercase tracking-wider text-accent hover:bg-accent/10 transition-all"
                  >
                    <Monitor className="h-4 w-4" />
                    Ir al POS
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}
