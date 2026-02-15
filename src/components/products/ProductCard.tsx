"use client";

import Link from 'next/link';
import { ArrowUpRight, Heart } from 'lucide-react';
import { Product } from '@/types';
import ProProductImage from '@/components/products/ProProductImage';
import LocalizedCurrencyText from '@/components/preferences/LocalizedCurrencyText';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: Product;
    index?: number;
    compact?: boolean;
    ctaLabel?: string;
}

const overlayThemes = [
    'from-[#0d2a3f]/78 via-[#103748]/68 to-[#101827]/88',
    'from-[#3b2e4a]/76 via-[#2d2542]/64 to-[#121826]/86',
    'from-[#273b32]/74 via-[#1f2f2a]/62 to-[#101827]/86',
    'from-[#2b2e44]/76 via-[#21253a]/64 to-[#111827]/86',
];

export default function ProductCard({
    product,
    index = 0,
    compact = false,
    ctaLabel = 'Reservar',
}: ProductCardProps) {
    const optimizedImageUrl =
        typeof product.attributes?.optimizedImageUrl === 'string' ? product.attributes.optimizedImageUrl : null;
    const imageUrl = optimizedImageUrl || (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null);
    const overlay = overlayThemes[index % overlayThemes.length];
    const stockLabel = product.stock > 0 ? `${product.stock} en stock` : 'Sin stock';
    const description = product.description || 'Selección premium lista para entrega inmediata.';

    return (
        <Link
            href={`/products/${product.id}`}
            className={cn(
                'group relative block overflow-hidden rounded-[30px] border border-white/40 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-18px_rgba(0,0,0,0.55)]',
                compact ? 'h-[300px]' : 'h-[360px]'
            )}
        >
            <div className="absolute inset-0">
                <ProProductImage
                    src={imageUrl}
                    alt={product.name}
                    sizes={compact ? '(max-width: 640px) 50vw, 280px' : '(max-width: 1024px) 50vw, 360px'}
                    paddingClassName={compact ? 'p-3' : 'p-4'}
                    className="rounded-none bg-transparent"
                />
                <div className={cn('absolute inset-0 bg-gradient-to-b', overlay)} />
            </div>

            <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
                <button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
                    onClick={(e) => e.preventDefault()}
                    aria-label="Favorite product"
                >
                    <Heart className="size-4" />
                </button>
                <span className="rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                    <LocalizedCurrencyText amount={product.price} maximumFractionDigits={0} />
                </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                <div className="mb-2 flex items-center justify-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/95" />
                    <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
                </div>
                <h3 className={cn('font-semibold text-white', compact ? 'text-lg' : 'text-[1.35rem]')}>{product.name}</h3>
                <p className={cn('mt-1 line-clamp-2 text-white/78', compact ? 'text-xs' : 'text-sm')}>
                    {description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                        {product.category || 'Catálogo'}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                        {stockLabel}
                    </span>
                </div>
                <span
                    className={cn(
                        'mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-4 font-semibold text-slate-900 transition-colors group-hover:bg-slate-100',
                        compact ? 'h-10 text-sm' : 'h-11 text-base'
                    )}
                >
                    {ctaLabel} <ArrowUpRight className="ml-1 size-4" />
                </span>
                {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute -top-2 left-4 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                        Últimas piezas
                    </div>
                )}
            </div>
        </Link>
    );
}
