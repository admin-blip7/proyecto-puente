'use client'

import Link from 'next/link'
import type { ProductCategory } from '@/lib/services/tiendaProductService'

interface CategoriesGridProps {
  categories: ProductCategory[]
}

const categoryIcons: Record<string, string> = {
  'celular-seminuevo': '📱',
  'mica': '🛡️',
  'audio': '🎧',
  'wearable': '⌚',
  'camara': '📷',
  'celular': '📱',
  'accesorios': '🔌',
  'televisores': '📺',
  'computadoras': '💻',
  'tablets': '📱',
  'gaming': '🎮',
  'cargadores': '🔌',
}

const categoryDescriptions: Record<string, string> = {
  'celular-seminuevo': 'Smartphones en excelente estado',
  'mica': 'Protección para tu dispositivo',
  'audio': 'Audífonos y parlantes de alta fidelidad',
  'wearable': 'Smartwatches y rastreadores',
  'camara': 'Cámaras y accesorios fotográficos',
}

export function CategoriesGrid({ categories }: CategoriesGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {categories.map((category) => {
        const icon = categoryIcons[category.value] || '📦'
        const description = categoryDescriptions[category.value] || `Explora ${category.label}`

        return (
          <Link
            key={category.value}
            href={`/tienda/categoria/${category.value}`}
            className="group relative tienda-panel rounded-2xl overflow-hidden hover:border-accent transition-all duration-300 hover-lift"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-accent/10 opacity-60 group-hover:opacity-100 transition-all" />

            <div className="relative p-6 h-full flex flex-col">
              {/* Icon */}
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/25 group-hover:bg-primary/40 transition-colors mb-4 border border-border/70">
                <span className="text-4xl group-hover:scale-110 transition-transform">
                  {icon}
                </span>
              </div>

              {/* Name */}
              <h3 className="font-editors-note text-xl font-semibold mb-2 group-hover:text-accent transition-colors">
                {category.label}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted-foreground flex-1">
                {description}
              </p>

              {/* Arrow indicator */}
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                Explorar
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
