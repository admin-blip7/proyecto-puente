"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Product } from "@/types";

interface CatalogProductCardProps {
    product: Product;
}

const FALLBACK_IMAGE_URL = "https://placehold.co/900x900/f8fafc/0f172a?text=Sin+foto";
const IMAGE_POSE_VARIANTS = [
    "scale-[1.28] -translate-x-2 translate-y-1 rotate-[-2deg]",
    "scale-[1.24] translate-x-2 -translate-y-1 rotate-[1.5deg]",
    "scale-[1.26] -translate-y-2 rotate-[-1deg]",
    "scale-[1.22] translate-x-1 translate-y-2 rotate-[2deg]",
];

export default function CatalogProductCard({ product }: CatalogProductCardProps) {
    const preferredImage = useMemo(() => {
        const optimized =
            typeof product.attributes?.optimizedImageUrl === "string" &&
                product.attributes.optimizedImageUrl.trim().length > 0
                ? product.attributes.optimizedImageUrl
                : null;

        const firstImage =
            typeof product.imageUrls?.[0] === "string" && product.imageUrls[0].trim().length > 0
                ? product.imageUrls[0]
                : null;

        return optimized || firstImage || FALLBACK_IMAGE_URL;
    }, [product.attributes?.optimizedImageUrl, product.imageUrls]);

    const [imageSrc, setImageSrc] = useState(preferredImage);

    useEffect(() => {
        setImageSrc(preferredImage);
    }, [preferredImage]);

    const imagePoseClass = useMemo(() => {
        const seed = `${product.id}-${product.name}`;
        let hash = 0;
        for (let i = 0; i < seed.length; i += 1) {
            hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
        }

        return IMAGE_POSE_VARIANTS[hash % IMAGE_POSE_VARIANTS.length];
    }, [product.id, product.name]);

    return (
        <div className="group relative flex flex-col bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 w-[276px] h-[309px] p-3 border border-gray-100 dark:border-slate-700/50 mx-auto">

            {/* Image Section - Light Gray Background */}
            <div className="relative w-full h-[58%] bg-gray-100 dark:bg-slate-700/50 rounded-[1.5rem] mb-3 flex items-center justify-center overflow-hidden">
                {/* Brand Logo Placeholder (Top Left) */}
                <div className="absolute top-3 left-3 w-8 h-4 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <div className="w-4 h-1 bg-black/20 rounded-full" />
                </div>

                <Image
                    src={imageSrc}
                    alt={product.name}
                    fill
                    onError={() => {
                        if (imageSrc !== FALLBACK_IMAGE_URL) {
                            setImageSrc(FALLBACK_IMAGE_URL);
                        }
                    }}
                    className={`object-contain object-center p-0 transition-transform duration-500 will-change-transform ${imagePoseClass} group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0 group-hover:scale-[1.32]`}
                />

                {/* Pagination Dots (Bottom Center) */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col flex-1 px-1">

                {/* Badge & Heart Row */}
                <div className="flex items-center justify-between mb-2">
                    <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        Best Seller
                    </span>
                    <button className="text-gray-400 hover:text-red-500 transition-colors">
                        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                    </button>
                </div>

                {/* Title */}
                <Link href={`/products/${product.id}`} className="block group-hover:text-emerald-600 transition-colors mb-auto">
                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 text-left">
                        {product.name}
                    </h3>
                </Link>

                {/* Price & Buy Row */}
                <div className="flex items-end justify-between mt-1">
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Price</span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            ${product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <button className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold px-6 py-2.5 rounded-full hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-colors shadow-lg shadow-gray-200 dark:shadow-none">
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    );
}
