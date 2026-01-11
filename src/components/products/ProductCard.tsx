"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Heart01, Star, ShoppingCart01 } from 'react-coolicons';
import { Product } from '@/types';

interface ProductCardProps {
    product: Product;
    index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
    const formatPrice = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const imageUrl = product.imageUrls && product.imageUrls.length > 0
        ? product.imageUrls[0]
        : null;

    return (
        <Link
            href={`/products/${product.id}`}
            className="group relative bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden block h-full flex flex-col hover:-translate-y-1"
        >
            <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800 overflow-hidden h-72">
                {imageUrl ? (
                    <Image
                        alt={product.name}
                        src={imageUrl}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
                <button
                    className="absolute top-3 right-3 p-2 rounded-full bg-white dark:bg-gray-800 bg-opacity-90 backdrop-filter backdrop-blur-sm shadow-sm text-gray-400 hover:text-red-500 transition-colors z-10"
                    onClick={(e) => e.preventDefault()}
                >
                    <Heart01 className="w-5 h-5" />
                </button>
                {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-md z-10">
                        Only {product.stock} left
                    </div>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{product.category || 'Electronics'}</p>
                    <div className="flex items-center">
                        <Star className="text-yellow-400 w-4 h-4 fill-current" />
                        <span className="ml-1 text-xs font-bold text-gray-700 dark:text-gray-300">New</span>
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate" title={product.name}>{product.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">{product.description || 'Premium quality product'}</p>
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(product.price)}</span>
                    </div>
                    <button
                        className="p-2 bg-primary text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0"
                        onClick={(e) => e.preventDefault()}
                    >
                        <ShoppingCart01 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </Link>
    );
}
