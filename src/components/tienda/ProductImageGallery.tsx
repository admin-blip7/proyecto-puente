'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import type { Product } from '@/lib/services/tiendaProductService'
import { getProductImageUrl } from '@/lib/services/tiendaProductService'

interface ProductImageGalleryProps {
  product: Product
}

interface DisplayImage {
  id: number
  src: string
  isFallback: boolean
  emoji?: string
}

export function ProductImageGallery({ product }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  const imageUrls = product.image_urls ?? []
  
  const categoryEmoji = () => {
    const cat = product.category?.toLowerCase() || ''
    if (cat.includes('audio') || cat.includes('sonido')) return '🎧'
    if (cat.includes('watch') || cat.includes('wearable')) return '⌚'
    if (cat.includes('camera') || cat.includes('cámara')) return '📷'
    if (cat.includes('phone') || cat.includes('celular') || cat.includes('smartphone')) return '📱'
    return '📦'
  }

  const buildDisplayImages = (): DisplayImage[] => {
    if (imageUrls.length === 0) {
      return [
        { id: 1, src: '', isFallback: true, emoji: categoryEmoji() },
        { id: 2, src: '', isFallback: true, emoji: categoryEmoji() },
        { id: 3, src: '', isFallback: true, emoji: categoryEmoji() },
      ]
    }

    return imageUrls.map((url, index) => ({
      id: index,
      src: getProductImageUrl(url),
      isFallback: imageErrors.has(index),
      emoji: categoryEmoji()
    }))
  }

  const displayImages = buildDisplayImages()
  const hasValidImages = displayImages.some(img => !img.isFallback && img.src)
  const currentImage = displayImages[selectedIndex]

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index))
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-secondary rounded-2xl overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            {hasValidImages && !currentImage.isFallback && currentImage.src ? (
              <img
                src={currentImage.src}
                alt={`${product.name} - Imagen ${selectedIndex + 1}`}
                className="max-h-full max-w-full object-contain"
                onError={() => handleImageError(selectedIndex)}
              />
            ) : (
              <span className="text-[180px] lg:text-[220px]">
                {currentImage.emoji}
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {displayImages.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIndex((i) => i === 0 ? displayImages.length - 1 : i - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-black/90 shadow-lg hover:bg-accent hover:text-black transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSelectedIndex((i) => (i + 1) % displayImages.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-black/90 shadow-lg hover:bg-accent hover:text-black transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Zoom Button */}
        {hasValidImages && (
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-black/90 shadow-lg hover:bg-accent hover:text-black transition-colors"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        )}

        {/* Image Counter */}
        {displayImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur px-3 py-1 rounded-full">
            <span className="text-xs font-medium">
              {selectedIndex + 1} / {displayImages.length}
            </span>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-3 justify-center">
          {displayImages.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(index)}
              className={`aspect-square h-16 rounded-lg border-2 flex items-center justify-center transition-all overflow-hidden ${
                index === selectedIndex
                  ? 'border-accent bg-accent/20'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              {hasValidImages && !img.isFallback && img.src ? (
                <img
                  src={img.src}
                  alt={`Miniatura ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(index)}
                />
              ) : (
                <span className="text-2xl">{img.emoji}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      <AnimatePresence>
        {isZoomed && hasValidImages && currentImage.src && !currentImage.isFallback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh]"
            >
              <img
                src={currentImage.src}
                alt={`${product.name} - Zoom ${selectedIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain"
              />
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
