'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface ProductSortProps {
  currentSort: string
}

const sortOptions = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Nombre A-Z' },
]

export function ProductSort({ currentSort }: ProductSortProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLabel = sortOptions.find(opt => opt.value === currentSort)?.label || 'Más recientes'

  const updateUrl = (sortValue: string) => {
    const url = new URL(window.location.href)
    if (sortValue === 'newest') {
      url.searchParams.delete('sort')
    } else {
      url.searchParams.set('sort', sortValue)
    }
    url.searchParams.delete('page') // Reset to page 1
    window.location.href = url.toString()
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent transition-colors"
      >
        Ordenar por
        <span className="text-muted-foreground">{currentLabel}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg bg-white dark:bg-black border border-border shadow-lg overflow-hidden">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                updateUrl(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-secondary transition-colors ${
                option.value === currentSort ? 'bg-secondary font-medium' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
