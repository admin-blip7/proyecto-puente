"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'react-coolicons';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductGalleryProps {
    images: string[];
    productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
    const [activeImage, setActiveImage] = useState(0);

    // Default placeholder if no images
    const displayImages = images.length > 0 ? images : ["https://via.placeholder.com/600x600?text=No+Image"];

    return (
        <div className="flex flex-col-reverse lg:flex-row gap-4 h-full">
            {/* Thumbnails (Left side on desktop, bottom on mobile) */}
            <div className="hidden lg:flex flex-col space-y-4 w-20 h-full overflow-y-auto scrollbar-hide">
                {displayImages.map((img, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`relative h-24 bg-surface-light dark:bg-surface-dark rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 ${activeImage === idx ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' : 'hover:opacity-75 opacity-60'}`}
                    >
                        <img alt={`${productName} View ${idx + 1}`} className="w-full h-full object-cover object-center" src={img} />
                    </button>
                ))}
            </div>

            {/* Main Image */}
            <div className="w-full aspect-[3/4] lg:aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative group">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={activeImage}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        alt={`${productName} - View ${activeImage + 1}`}
                        className="w-full h-full object-contain bg-white dark:bg-gray-800 object-center"
                        src={displayImages[activeImage]}
                    />
                </AnimatePresence>

                {displayImages.length > 1 && (
                    <>
                        <button onClick={() => setActiveImage((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 rounded-full shadow-sm hover:bg-white dark:hover:bg-black transition lg:opacity-0 lg:group-hover:opacity-100 opacity-100">
                            <ChevronLeft className="text-gray-800 dark:text-white w-6 h-6" />
                        </button>
                        <button onClick={() => setActiveImage((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 dark:bg-black/50 rounded-full shadow-sm hover:bg-white dark:hover:bg-black transition lg:opacity-0 lg:group-hover:opacity-100 opacity-100">
                            <ChevronRight className="text-gray-800 dark:text-white w-6 h-6" />
                        </button>
                        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                            {activeImage + 1}/{displayImages.length}
                        </div>
                    </>
                )}
            </div>

            {/* Thumbnails Mobile */}
            <div className="flex lg:hidden space-x-4 overflow-x-auto scrollbar-hide py-2">
                {displayImages.map((img, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`flex-shrink-0 w-16 h-20 rounded-md overflow-hidden ${activeImage === idx ? 'ring-2 ring-primary' : 'opacity-70'}`}
                    >
                        <img className="w-full h-full object-cover" src={img} alt={`Thumbnail ${idx}`} />
                    </button>
                ))}
            </div>
        </div>
    );
}
