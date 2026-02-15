"use client";

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Product } from '@/types';
import ProProductImage from '@/components/products/ProProductImage';
import LocalizedCurrencyText from '@/components/preferences/LocalizedCurrencyText';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ModernProductCardProps {
    product: Product;
    index?: number;
    className?: string;
}

export default function ModernProductCard({
    product,
    index = 0,
    className,
}: ModernProductCardProps) {
    const optimizedImageUrl =
        typeof product.attributes?.optimizedImageUrl === 'string' ? product.attributes.optimizedImageUrl : null;
    let imageUrl = optimizedImageUrl || (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null);

    // Placeholder if no image
    if (!imageUrl) {
        imageUrl = '/placeholder-image.png'; // Or some default
    }

    return (
        <div className={cn(
            "group relative rounded-3xl overflow-hidden h-[420px] shadow-lg hover:shadow-2xl transition-all duration-300 bg-gray-100 dark:bg-gray-800",
            className
        )}>
            {/* Image Background */}
            <div className="absolute inset-0 z-0">
                {imageUrl ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                        No Image
                    </div>
                )}
            </div>

            {/* Favorite Button */}
            <div className="absolute top-4 right-4 z-20">
                <button
                    className="p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40 transition-colors"
                    aria-label="Add to favorites"
                >
                    <Heart className="size-5" />
                </button>
            </div>

            {/* Glass Overlay Content */}
            <div className="absolute bottom-0 left-0 right-0 glass-overlay p-5 flex flex-col justify-end min-h-[50%] z-10 transition-transform duration-300 translate-y-2 group-hover:translate-y-0">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-xl font-bold text-white line-clamp-1">{product.name}</h3>
                    <div className="text-lg font-bold text-white shrink-0 ml-2">
                        <LocalizedCurrencyText amount={product.price} maximumFractionDigits={0} />
                    </div>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {product.description || 'Premium quality product available for immediate delivery.'}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-white">
                        {product.category || 'Product'}
                    </span>
                    {product.stock <= 5 && product.stock > 0 && (
                        <span className="px-3 py-1 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/40 text-xs font-medium text-red-200">
                            Low Stock
                        </span>
                    )}
                </div>

                <Link
                    href={`/checkout?productId=${product.id}&action=add`}
                    className="w-full py-3 rounded-full bg-white text-black text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg flex items-center justify-center gap-2 text-center"
                >
                    Add to cart
                </Link>
            </div>
        </div>
    );
}
