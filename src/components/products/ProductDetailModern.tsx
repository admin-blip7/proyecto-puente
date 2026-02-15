"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { AddToCartButton } from "@/components/tienda/AddToCartButton";
import { useAppPreferences } from "@/components/preferences/AppPreferencesProvider";
import { formatCurrencyWithPreferences } from "@/lib/appPreferences";
import {
    ArrowLeft,
    ShoppingBag,
    Heart,
    Share2,
    Maximize2,
    Zap,
    Rotate3d,
    Star,
    Clock,
    CheckCircle,
    Truck,
    ShieldCheck,
    ChevronRight,
    Bell,
    Search,
    Menu,
    TrendingUp,
    Package,
    X,
    ClipboardCheck,
    Leaf,
    RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PublicPreferencesControl from "@/components/preferences/PublicPreferencesControl";

type ProductDetailModernProps = {
    product: Product;
    variants: Product[];
};

const FALLBACK_IMAGE = "https://via.placeholder.com/800x800?text=No+Image";

const clampMoney = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Number(value.toFixed(2)));
};

const clampQuantity = (value: number) => {
    if (!Number.isFinite(value)) return 1;
    return Math.max(1, Math.floor(value));
};

const toClock = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const hours = Math.floor(safe / 3600)
        .toString()
        .padStart(2, "0");
    const minutes = Math.floor((safe % 3600) / 60)
        .toString()
        .padStart(2, "0");
    const secs = (safe % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${secs}`;
};

export default function ProductDetailModern({ product, variants = [] }: ProductDetailModernProps) {
    const { preferences, labels, currency } = useAppPreferences();
    const isSpanish = preferences.language === "es";

    // --- DERIVED ATTRIBUTES ---
    const uniqueColors = useMemo(() => Array.from(new Set(variants.map(v => v.attributes?.color).filter(Boolean))), [variants]);
    const uniqueStorages = useMemo(() => Array.from(new Set(variants.map(v => v.attributes?.capacity).filter(Boolean))), [variants]);
    const uniqueConditions = useMemo(() => Array.from(new Set(variants.map(v => v.attributes?.grade).filter(Boolean))), [variants]);
    const uniqueBatteries = useMemo(() => Array.from(new Set(variants.map(v => v.attributes?.battery_health).filter(Boolean))), [variants]);

    // --- STATE ---
    const [selectedCondition, setSelectedCondition] = useState(uniqueConditions[0] || 'Excellent');
    const [selectedStorage, setSelectedStorage] = useState(uniqueStorages[0] || '128GB');
    const [selectedColor, setSelectedColor] = useState(uniqueColors[0] || 'Blue');
    const [selectedBattery, setSelectedBattery] = useState(uniqueBatteries[0] || '100%');
    const [isOffersOpen, setIsOffersOpen] = useState(false);

    // Find Logic
    const selectedVariant = useMemo(() => {
        if (variants.length === 0) return product;
        return variants.find(v =>
            (!selectedColor || v.attributes?.color === selectedColor) &&
            (!selectedStorage || v.attributes?.capacity === selectedStorage) &&
            (!selectedCondition || v.attributes?.grade === selectedCondition) &&
            (!selectedBattery || v.attributes?.battery_health === selectedBattery)
        ) || variants[0] || product; // Fallback logic
    }, [variants, selectedColor, selectedStorage, selectedCondition, selectedBattery, product]);

    // --- METRICS ---
    const [dealCountdown, setDealCountdown] = useState(45 * 60 + 22);
    // Use selectedVariant for price reference
    const currentPrice = selectedVariant.price || product.price;
    const currentCost = selectedVariant.cost || product.cost || currentPrice * 0.6;

    const [wholesaleCost, setWholesaleCost] = useState(() =>
        clampMoney(currentCost)
    );
    const [salePrice, setSalePrice] = useState(() =>
        clampMoney(currentPrice)
    );

    // Update local state when variant changes
    useEffect(() => {
        setSalePrice(selectedVariant.price || product.price);
        setWholesaleCost(selectedVariant.cost || product.cost || (selectedVariant.price || product.price) * 0.6);
    }, [selectedVariant, product]);

    const [quantity, setQuantity] = useState(10);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Simulated Sales Toast Effect
    useEffect(() => {
        const locations = ["Cd. de México", "Guadalajara", "Monterrey", "Puebla", "Tijuana"];
        const names = ["Carlos M.", "Ana P.", "TechStore Mx", "Distribuidora Sur", "Jorge L."];
        const items = [20, 50, 100, 15, 30];

        // Trigger simulation 3 seconds after load
        const initialDelay = setTimeout(() => {
            const randomLoc = locations[Math.floor(Math.random() * locations.length)];
            const randomName = names[Math.floor(Math.random() * names.length)];
            const randomQty = items[Math.floor(Math.random() * items.length)];

            setToastMessage(
                isSpanish
                    ? `${randomName} de ${randomLoc} acaba de comprar ${randomQty} unidades`
                    : `${randomName} from ${randomLoc} just bought ${randomQty} units`
            );
            setShowToast(true);

            // Hide after 5 seconds
            setTimeout(() => setShowToast(false), 5000);

        }, 3000);

        return () => clearTimeout(initialDelay);
    }, [isSpanish]);

    useEffect(() => {
        const timer = setInterval(() => {
            setDealCountdown((prev) => (prev <= 0 ? 45 * 60 + 22 : prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatMoney = (value: number) => formatCurrencyWithPreferences(value, preferences);

    // --- CALCULATED METRICS ---
    const metrics = useMemo(() => {
        const safeQuantity = clampQuantity(quantity);
        const investment = clampMoney(wholesaleCost * safeQuantity);
        const revenue = clampMoney(salePrice * safeQuantity);
        const grossProfit = clampMoney(revenue - investment);
        const perUnitProfit = clampMoney(salePrice - wholesaleCost);
        const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
        const roi = investment > 0 ? (grossProfit / investment) * 100 : 0;
        return {
            safeQuantity,
            investment,
            revenue,
            grossProfit,
            perUnitProfit,
            margin,
            roi,
        };
    }, [quantity, salePrice, wholesaleCost]);

    const stockClaimed = useMemo(() => {
        if (!product.stock || product.stock <= 0) return 100;
        const estimate = Math.round(((metrics.safeQuantity * 3) / Math.max(product.stock, 1)) * 100);
        return Math.max(12, Math.min(98, estimate));
    }, [metrics.safeQuantity, product.stock]);

    const deliveryDate = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() + 2);
        return new Intl.DateTimeFormat(preferences.locale, {
            weekday: "long",
            month: "short",
            day: "numeric",
        }).format(date);
    }, [preferences.locale]);

    const coverImage = product.imageUrls?.[0] || FALLBACK_IMAGE;

    // Dynamic Gallery Images based on selected variant
    const galleryImages = useMemo(() => {
        // Handle both camelCase and snake_case for compatibility
        const variantImages = selectedVariant.imageUrls || (selectedVariant as any).image_urls;
        if (variantImages && variantImages.length > 0) {
            return variantImages;
        }
        return product.imageUrls && product.imageUrls.length > 0
            ? product.imageUrls
            : [FALLBACK_IMAGE];
    }, [product.imageUrls, selectedVariant]);

    // ...

    {
        galleryImages.map((img: string, idx: number) => (
            <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 rounded-xl overflow-hidden border transition-all duration-300 bg-white ${selectedImageIndex === idx
                    ? "border-black/20 ring-2 ring-black/5 opacity-100"
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-black/10"
                    }`}
            >
                <div className="absolute inset-0 p-1">
                    <Image
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        className="object-contain"
                        sizes="80px"
                    />
                </div>
            </button>
        ))
    }
                            </div>

        {/* Main Image View */ }
        <div className="flex-1 bg-white rounded-[2.5rem] p-0 md:p-8 relative group overflow-hidden shadow-sm aspect-[3/4] md:aspect-auto md:h-[600px] flex items-center justify-center" >
                                <Image
                                    src={galleryImages[selectedImageIndex] || coverImage}
                                    alt={product.name}
                                    fill
                                    className="object-contain object-center transform transition-transform duration-500 group-hover:scale-110 p-4 md:p-8"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    priority
                                    loading="eager"
                                />
                                <div className="absolute top-4 right-4 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="bg-white text-black shadow-lg p-3 rounded-full hover:bg-gray-50 transition-transform active:scale-95 border border-gray-100">
                                        <Maximize2 className="w-5 h-5" />
                                    </button>
                                    <button className="bg-black/40 backdrop-blur-md text-white p-3 rounded-full hover:bg-white hover:text-black transition-all active:scale-90">
                                        <Share2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

        {/* Trust Signals Grid */ }
        <div className="flex flex-wrap justify-center gap-4 pb-8" >
        {
            [
                { icon: ShieldCheck, title: "12 Meses Garantía", text: "Cobertura Total Incluida" },
                { icon: Truck, title: "Envío Gratis", text: "Entrega Asegurada 2-3 Días" },
                { icon: RefreshCw, title: "30 Días De Prueba", text: "Devoluciones Sin Preguntas" },
                            ].map((item, i) => (
                    <div key={i} className="flex-1 min-w-[150px] max-w-[200px] bg-white dark:bg-[#1C1F26] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center text-center gap-3 shadow-sm dark:shadow-none">
                        <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl">
                            <item.icon className="w-5 h-5 text-green-600 dark:text-green-500" />
                        </div>
                        <div>
                            <p className="text-slate-900 dark:text-white font-bold text-[13px]">{item.title}</p>
                            <p className="text-slate-500 dark:text-gray-500 text-[10px]">{item.text}</p>
                        </div>
                    </div>
                ))
        }
                        </div>

        {/* Verified Refurbished Feature Carousel */ }
        <div className="pb-12 relative" >
            <ul
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 scroll-pl-4 no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth"
                style={{
                    WebkitMaskImage: 'linear-gradient(90deg, #000 85%, transparent)',
                    maskImage: 'linear-gradient(90deg, #000 85%, transparent)'
                }}
            >
                {[
                    { title: "Verificado", text: "Expertos Técnicos Revisan Cada Dispositivo", icon: ClipboardCheck },
                    { title: "12 Meses De Garantía", text: "Tranquilidad Total En Cada Compra", icon: ShieldCheck },
                    { title: "Sostenible", text: "Ahorra CO2 Con Cada Reacondicionado", icon: Leaf },
                    { title: "Envío Gratis", text: "Recíbelo En Casa Sin Costes Extra", icon: Truck }
                ].map((feature, i) => (
                    <li
                        key={i}
                        className="snap-start shrink-0 w-[223px] h-[108px] bg-slate-900 dark:bg-[#0E1016] rounded-xl p-5 relative overflow-hidden flex flex-col justify-between"
                        style={{
                            backgroundImage: `url('https://front-office.statics.backmarket.com/dc3a85f3e8d932c6d1e46402ecd2068fe815e95e/img/product/verified-refurbished/fingerprint.svg'), url('https://front-office.statics.backmarket.com/dc3a85f3e8d932c6d1e46402ecd2068fe815e95e/img/product/verified-refurbished/holo.avif')`,
                            backgroundBlendMode: 'overlay',
                            backgroundAttachment: 'scroll, fixed',
                            backgroundSize: 'cover'
                        }}
                    >
                        <div className="relative z-10">
                            <feature.icon className="w-6 h-6 text-white mb-2" strokeWidth={1.5} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-white font-bold text-sm tracking-tight leading-tight mb-1">{feature.title}</h3>
                            <p className="text-white/60 text-[10px] leading-tight">{feature.text}</p>
                        </div>
                    </li>
                ))}
            </ul>
                        </div>

        {/* REVIEWS SECTION */ }
        <div className="pt-10 border-t border-gray-200 dark:border-white/5" >
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-[34px] font-bold text-slate-900 dark:text-white">{isSpanish ? 'Reseñas' : 'Reviews'}</h2>
                <button className="text-[17px] font-medium text-green-600 dark:text-green-500 hover:text-green-500 dark:hover:text-green-400 transition-colors">
                    {isSpanish ? 'Ver todas' : 'View all'}
                </button>
            </div>

    {/* Summary Card */ }
    <div className="bg-white dark:bg-[#1C1F26] p-6 rounded-3xl border border-gray-100 dark:border-white/5 mb-8 flex items-center justify-between shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4">
            <div className="text-5xl font-black text-slate-900 dark:text-white">4.8</div>
            <div className="flex flex-col">
                <div className="flex text-yellow-500 mb-1">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-current" />)}
                </div>
                <span className="text-[13px] text-slate-500 dark:text-gray-400 font-medium">
                    {isSpanish ? 'Basado en 128 opiniones' : 'Based on 128 reviews'}
                </span>
            </div>
        </div>
        <button className="bg-slate-100 dark:bg-white text-slate-900 dark:text-black px-6 py-3 rounded-xl font-bold text-[15px] hover:bg-slate-200 dark:hover:bg-gray-200 transition-colors">
            {isSpanish ? 'Escribir reseña' : 'Write a review'}
        </button>
    </div>

    {/* Reviews List */ }
    <div className="space-y-4">
        {[
            {
                name: "Carlos M.",
                date: isSpanish ? "Hace 2 días" : "2 days ago",
                rating: 5,
                text: isSpanish
                    ? "El teléfono llegó impecable, parece nuevo. La batería está al 100%. ¡Muy recomendado!"
                    : "Phone arrived in pristine condition, looks brand new. Battery is at 100%. Highly recommended!",
                avatarColor: "from-green-500 to-blue-500"
            },
            {
                name: "Andrea R.",
                date: isSpanish ? "Hace 1 semana" : "1 week ago",
                rating: 4,
                text: isSpanish
                    ? "Buen servicio, aunque el envío tardó un día más. El equipo funciona perfecto."
                    : "Great service, although shipping took one extra day. The device works perfectly.",
                avatarColor: "from-purple-500 to-pink-500"
            },
            {
                name: "Jorge L.",
                date: isSpanish ? "Hace 2 semanas" : "2 weeks ago",
                rating: 5,
                text: isSpanish
                    ? "Increíble calidad-precio. Compraré de nuevo seguro."
                    : "Incredible value for money. Will definitely buy again.",
                avatarColor: "from-orange-500 to-red-500"
            }
        ].map((review, i) => (
            <div key={i} className="bg-white dark:bg-[#0E1016] p-6 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-colors shadow-sm dark:shadow-none">
                <div className="flex justify-between items-start mb-3">
                    {/* Avatar and Name */}
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${review.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                            {review.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="text-slate-900 dark:text-white font-bold text-[15px]">{review.name}</h4>
                            <p className="text-slate-500 dark:text-gray-500 text-[13px]">{review.date}</p>
                        </div>
                    </div>
                    {/* Stars */}
                    <div className="flex text-yellow-500 gap-0.5">
                        {[...Array(5)].map((_, starI) => (
                            <Star
                                key={starI}
                                className={`w-3.5 h-3.5 ${starI < review.rating ? 'fill-current' : 'text-gray-300 dark:text-gray-700 fill-gray-300 dark:fill-gray-700'}`} // fill-gray-700 for empty stars
                            />
                        ))}
                    </div>
                </div>
                <p className="text-slate-600 dark:text-gray-300 text-[15px] leading-relaxed">
                    “{review.text}”
                </p>
            </div>
        ))}
    </div>
                        </div>
                    </div>

        {/* RIGHT COLUMN: Product Details & Selectors */ }
        <div className="lg:col-span-5 flex flex-col h-full relative" >
            <div className="sticky top-28 space-y-8">

                {/* Header Section */}
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">
                            Refurbished <span className="text-brand-blue font-black">Premium</span> Tech / {product.category || "Smartphone"}
                        </p>
                        {/* Live Viewers Badge */}
                        <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full animate-pulse border border-red-500/20">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">
                                24 {isSpanish ? 'viendo' : 'viewing'}
                            </span>
                        </div>
                    </div>

                    <h1 className="text-[34px] font-bold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
                        {product.name}
                    </h1>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="fill-yellow-500 text-yellow-500 w-4 h-4" />)}
                        </div>
                        <span className="text-gray-400 text-sm font-medium hover:text-white cursor-pointer transition-colors">4.8/5 (128 reviews)</span>
                    </div>

                    {/* Pricing Card */}
                    <div className="bg-white dark:bg-[#1C1F26] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 relative mb-10 shadow-xl dark:shadow-none">
                        <div className="absolute -top-5 -right-5 transform rotate-6 z-20">
                            <div className="bg-green-500 text-black font-black text-xs px-5 py-2 rounded-full uppercase tracking-wide shadow-[0_10px_20px_rgba(0,0,0,0.3)] border-2 border-white dark:border-[#1C1F26]">
                                Ahorras {Math.round(((wholesaleCost * 1.5) - salePrice) / (wholesaleCost * 1.5) * 100)}%
                            </div>
                        </div>

                        {/* Ticket Trigger "Ofertas Disponibles" */}
                        <button
                            onClick={() => setIsOffersOpen(true)}
                            className="mb-6 w-full relative group transform transition-transform hover:scale-[1.02] active:scale-95 text-left"
                        >
                            <div className="flex items-center relative h-16 bg-[#e3f77e] rounded-xl overflow-hidden shadow-lg shadow-[#e3f77e]/10">
                                {/* Left Jagged edge (simulated with SVG mask or circles) */}
                                <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-[#1C1F26] rounded-full" />
                                {/* Dotted divider */}
                                <div className="absolute left-16 top-0 bottom-0 border-l-2 border-dashed border-black/10 dark:border-[#1C1F26]/20" />

                                <div className="pl-6 flex items-center gap-3">
                                    <div className="p-2 bg-black/10 dark:bg-[#1C1F26] rounded-lg">
                                        <Zap className="w-4 h-4 text-black dark:text-[#e3f77e] fill-current" />
                                    </div>
                                </div>

                                <div className="pl-4 flex flex-col">
                                    <span className="text-black/90 dark:text-[#1C1F26] font-black text-sm uppercase tracking-tight">Ofertas Disponibles</span>
                                    <span className="text-black/60 dark:text-[#1C1F26]/60 text-xs font-medium">Descubre Nuestros Ofertones</span>
                                </div>

                                <div className="ml-auto pr-6">
                                    <div className="bg-black/10 dark:bg-[#1C1F26] text-black dark:text-white px-4 py-1.5 rounded-lg font-bold text-xs">Ver</div>
                                </div>

                                {/* Right Jagged edge */}
                                <div className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white dark:bg-[#1C1F26] rounded-full" />
                            </div>
                        </button>

                        <p className="text-slate-500 dark:text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Precio Total</p>
                        <div className="flex items-baseline gap-4 mb-2">
                            <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{formatMoney(metrics.revenue)}</span>
                            <span className="text-lg text-slate-400 dark:text-gray-600 line-through font-medium">{formatMoney(metrics.revenue * 1.4)}</span>
                        </div>
                        <p className="text-green-600 dark:text-green-500 text-sm font-bold flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> IVA incluido • Envío gratis
                        </p>
                    </div>

                    {/* SELECTORS SECTION */}
                    <div className="space-y-8">

                        {/* Storage Selector */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest">{labels.storage}</label>
                                <span className="text-slate-900 dark:text-white font-bold text-sm">{selectedStorage}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {uniqueStorages.length > 0 ? (
                                    uniqueStorages.map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedStorage(size)}
                                            className={`py-4 px-2 rounded-2xl font-bold text-[17px] transition-all border-2 relative overflow-hidden group ${selectedStorage === size
                                                ? 'border-green-500 bg-green-500/10 text-slate-900 dark:text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                                                : 'border-transparent dark:border-white/5 bg-white dark:bg-[#1C1F26] text-slate-500 dark:text-gray-500 hover:border-black/5 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white'
                                                }`}
                                        >
                                            <span className="relative z-10">{size}</span>
                                            {selectedStorage === size && <div className="absolute inset-0 bg-gradient-to-tr from-green-500/20 to-transparent" />}
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-sm text-gray-500 col-span-3">No hay opciones de almacenamiento.</div>
                                )}
                            </div>
                        </div>

                        {/* Condition Selector (Vertical Cards) */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest">{labels.condition}</label>
                                <button className="text-xs text-green-600 dark:text-green-500 hover:text-green-500 dark:hover:text-green-400 underline decoration-green-500/30 underline-offset-4 transition-colors">¿Qué significan?</button>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-3">
                                    {uniqueConditions.length > 0 ? (
                                        uniqueConditions.map((cond) => {
                                            // Calculate price specific to this condition if possible, or use current logic
                                            // For now we use the logic that selecting it updates selectedCondition, which triggers selectedVariant update, which updates salePrice
                                            // But to display the price *on the button* we might need to find the variant for this condition specifically
                                            const variantForCond = variants.find(v =>
                                                v.attributes?.grade === cond &&
                                                v.attributes?.capacity === selectedStorage &&
                                                v.attributes?.color === selectedColor
                                            );
                                            const displayPrice = variantForCond ? variantForCond.price : (cond === 'Excellent' ? salePrice : cond === 'Good' ? salePrice * 0.9 : salePrice * 0.8); // Fallback

                                            return (
                                                <button
                                                    key={cond}
                                                    onClick={() => setSelectedCondition(cond)}
                                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group relative overflow-hidden ${selectedCondition === cond
                                                        ? 'border-green-500 bg-white dark:bg-[#1C1F26] shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                                        : 'border-transparent dark:border-white/5 bg-white dark:bg-[#1C1F26]/50 hover:bg-white dark:hover:bg-[#1C1F26] hover:border-black/5 dark:hover:border-white/10'
                                                        }`}
                                                >
                                                    <div className="relative z-10">
                                                        <span className={`block font-bold text-[17px] mb-1 ${selectedCondition === cond ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors'}`}>
                                                            {labels.conditions[cond] || cond}
                                                        </span>
                                                        <span className="text-xs text-slate-500 dark:text-gray-500 block max-w-[200px]">
                                                            {cond === 'Excellent' || cond === 'Grado A' ? 'Sin rasguños visibles a 20cm. Batería >85%.' :
                                                                cond === 'Good' || cond === 'Grado B' ? 'Micro-rasguños apenas visibles. 100% funcional.' :
                                                                    'Marcas de uso visibles. El mejor precio.'}
                                                        </span>
                                                    </div>
                                                    <div className="relative z-10 text-right">
                                                        <span className={`block font-black text-lg ${selectedCondition === cond ? 'text-green-600 dark:text-green-500' : 'text-slate-900 dark:text-white'}`}>
                                                            {formatMoney(displayPrice)}
                                                        </span>
                                                        {selectedCondition === cond && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 ml-auto mt-2" />}
                                                    </div>

                                                    {selectedCondition === cond && <div className="absolute inset-0 bg-green-500/5" />}
                                                </button>
                                            )
                                        })
                                    ) : (
                                        <div className="text-sm text-gray-500">No hay condiciones disponibles.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Color Selector */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">{labels.color} • <span className="text-white">{selectedColor}</span></label>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex flex-wrap gap-4">
                                    {uniqueColors.length > 0 ? (
                                        uniqueColors.map((col) => {
                                            // Simple color mapping or hashing for demo
                                            const colorMap: Record<string, string> = {
                                                'Midnight': '#1c1c1e',
                                                'Starlight': '#f0f0f0',
                                                'Blue': '#215E7C',
                                                'Product RED': '#BF0013',
                                                'Green': '#364935',
                                                'Rojo': '#BF0013',
                                                'Azul': '#215E7C',
                                                'Negro': '#000000',
                                                'Blanco': '#FFFFFF',
                                                'Dorado': '#FFD700',
                                                'Plata': '#C0C0C0'
                                            }
                                            const bgColor = colorMap[col] || '#808080' // Default gray

                                            return (
                                                <button
                                                    key={col}
                                                    onClick={() => setSelectedColor(col)}
                                                    className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${selectedColor === col ? 'scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'hover:scale-110 opacity-70 hover:opacity-100'
                                                        }`}
                                                    title={col}
                                                >
                                                    <span className={`w-full h-full rounded-full border-2 ${selectedColor === col ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: bgColor }}></span>
                                                </button>
                                            )
                                        })
                                    ) : (
                                        <div className="text-sm text-gray-500">No hay colores disponibles.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>


                    {/* Battery Selector */}
                    {uniqueBatteries.length > 0 && (
                        <div className="mb-8">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">
                                {(labels as any)?.battery || 'Battery Health'}
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                {uniqueBatteries.map((batt) => (
                                    <button
                                        key={batt}
                                        onClick={() => setSelectedBattery(batt)}
                                        className={`py-4 rounded-xl font-bold text-sm transition-all border-2 ${selectedBattery === batt
                                            ? 'bg-white dark:bg-[#1C1F26] text-black dark:text-white border-black dark:border-white shadow-lg'
                                            : 'bg-gray-50 dark:bg-[#1C1F26]/50 text-gray-500 border-transparent hover:bg-gray-100 dark:hover:bg-[#1C1F26]'
                                            }`}
                                    >
                                        {batt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add To Cart & Actions */}
                    <div className="mt-10 space-y-4">
                        <AddToCartButton product={selectedVariant as any} />
                        <button className="w-full bg-[#1C1F26] text-white py-4 rounded-[1.5rem] font-medium border border-white/10 hover:bg-[#232730] hover:border-white/20 transition-all flex items-center justify-center gap-2 text-[17px] group">
                            <Rotate3d className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                            Trade-in your old device
                        </button>
                    </div>

                    {/* Scarcity Bar (Re-integrated) */}
                    <div className="mt-8 bg-white dark:bg-[#1C1F26]/50 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                        <div className="flex justify-between text-xs font-bold mb-2">
                            <span className="text-orange-500 flex items-center gap-1">
                                <Zap className="w-3 h-3 fill-current" />
                                {isSpanish ? '¡Se agota rápido!' : 'Selling fast!'}
                            </span>
                            <span className="text-slate-400 dark:text-gray-400">85% {isSpanish ? 'reclamado' : 'claimed'}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-[#090D14] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 w-[85%] rounded-full animate-pulse" />
                        </div>
                    </div>

                    {/* PROFIT CALCULATOR (Sticky Integration) */}
                    <div className="mt-12 pt-12 border-t border-gray-200 dark:border-white/5">
                        <div className="bg-white dark:bg-[#090D14] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/0 via-green-500/50 to-green-500/0 opacity-20"></div>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">
                                            {labels.profitCalcTitle}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">{labels.profitCalcSubtitle}</p>
                                    </div>
                                </div>
                                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                    {metrics.margin.toFixed(1)}% {labels.margin}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-gray-500 tracking-[0.1em] block mb-2">{labels.wholesaleCost}</label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={wholesaleCost}
                                            onChange={(e) => setWholesaleCost(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-50 dark:bg-[#1C1F26] border border-gray-200 dark:border-white/5 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500/50 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-gray-500 tracking-[0.1em] block mb-2">{labels.salePrice}</label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={salePrice}
                                            onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-gray-50 dark:bg-[#1C1F26] border border-gray-200 dark:border-white/5 rounded-2xl p-4 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500/50 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-[#1C1F26] p-6 rounded-3xl border border-gray-100 dark:border-white/5 group hover:border-gray-200 dark:hover:border-white/10 transition-colors">
                                    <p className="text-[10px] uppercase text-slate-500 dark:text-gray-500 font-bold tracking-wider mb-2">{labels.investment}</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(metrics.investment)}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-[#1C1F26] p-6 rounded-3xl border border-gray-100 dark:border-white/5 group hover:border-green-500/20 transition-colors">
                                    <p className="text-[10px] uppercase text-slate-500 dark:text-gray-500 font-bold tracking-wider mb-2">{labels.profit}</p>
                                    <p className="text-2xl font-black text-green-600 dark:text-green-500">{formatMoney(metrics.grossProfit)}</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
                    </div>
                </div>

        {/* RELATED PRODUCTS */ }
        <div className="mt-20" >
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-[34px] font-bold text-gray-900 dark:text-white">{labels.youMightLike}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-[17px] mt-1">Based on your recent views</p>
                        </div>
                        <button className="text-black dark:text-white font-medium text-sm hover:underline">{labels.viewAll}</button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {relatedAddons.map((addon, index) => (
                            <div key={index} className="group bg-white dark:bg-[#27272A] rounded-2xl p-4 transition hover:shadow-lg dark:hover:shadow-gray-900/50">
                                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl mb-4 overflow-hidden">
                                    <span className="absolute top-2 left-2 bg-white dark:bg-black text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 z-10">
                                        <Star className="w-3 h-3 text-yellow-500 fill-current" /> 4.5
                                    </span>
                                    <button className="absolute top-2 right-2 text-gray-400 hover:text-red-500 z-10">
                                        <Heart className="w-5 h-5" />
                                    </button>
                                    <Image
                                        src={addon.image || FALLBACK_IMAGE}
                                        alt={addon.name}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                    />
                                </div>
                                <div className="px-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{addon.name}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">Accessory</p>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg text-gray-900 dark:text-white">{formatMoney(addon.price)}</span>
                                        <button className="bg-black text-white dark:bg-white dark:text-black p-2 rounded-lg hover:bg-opacity-90 text-xs font-medium">Add</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

        {/* FOOTER */ }
        <footer> className="bg-white dark:bg-[#27272A] mt-20 border-t border-gray-200 dark:border-gray-700 py-12" >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-6 md:mb-0">
                        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Refurbished <span className="text-brand-blue">Premium</span> Tech</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">© 2024 Refurbished Premium Tech. All rights reserved.</p>
                    </div>
                    <div className="flex space-x-6">
                        <Link href="#" className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="#" className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="#" className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Contact</Link>
                    </div>
                </div>
            </div>
            </footer>

        {/* Toast Notification */ }
    {
        showToast && (
            <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-[#27272A] p-4 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-slide-up flex items-center gap-3 max-w-sm">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <ShoppingBag className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{isSpanish ? '¡Venta Reciente!' : 'Recent Sale!'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{toastMessage}</p>
                </div>
                <button
                    onClick={() => setShowToast(false)}
                    className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    ×
                </button>
            </div>
        )
    }

    {/* OFFERS SIDE DRAWER */ }
    <AnimatePresence>
        {isOffersOpen && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOffersOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
                />

                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-white dark:bg-[#090D14] z-[70] shadow-2xl border-l border-gray-200 dark:border-white/10 flex flex-col"
                >
                    <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <h2 className="text-[34px] font-bold text-slate-900 dark:text-white tracking-tight">Ofertas</h2>
                        <button
                            onClick={() => setIsOffersOpen(false)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-900 dark:text-white" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                        {[
                            { name: "iPhone 13", desc: "Verde • 128 GB", price: 342, oldPrice: 739, img: "https://www.backmarket.es/cdn-cgi/image/format%3Dauto%2Cquality%3D75%2Cwidth%3D260/https://d2e6ccujb3mkqf.cloudfront.net/0d36dce6-d7ce-4356-9763-c4677879cb02-1_afb670d7-5314-449c-8575-94a5b7c0b18d.jpg" },
                            { name: "iPhone 13", desc: "Azul • 256 GB", price: 369, oldPrice: 869, img: "https://www.backmarket.es/cdn-cgi/image/format%3Dauto%2Cquality%3D75%2Cwidth%3D260/https://d2e6ccujb3mkqf.cloudfront.net/f72a3516-f868-4dda-bab3-0a44284ba101-1_95e89e7b-df64-4e04-a71a-fc5df7a7a0b1.jpg" }
                        ].map((offer, i) => (
                            <div key={i} className="bg-white dark:bg-[#1C1F26] rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden group hover:border-black/10 dark:hover:border-white/20 transition-all shadow-sm dark:shadow-none">
                                <div className="p-6 flex gap-6">
                                    <div className="w-24 h-24 relative rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                        <Image src={offer.img} alt={offer.name} fill className="object-contain p-2" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-500 text-[10px] font-bold uppercase px-2 py-0.5 rounded tracking-widest border border-green-200 dark:border-green-500/20">Premium</span>
                                        </div>
                                        <h3 className="text-slate-900 dark:text-white font-bold text-[17px]">{offer.name}</h3>
                                        <p className="text-slate-500 dark:text-gray-400 text-[15px]">{offer.desc}</p>

                                        <div className="mt-4 flex items-baseline gap-3">
                                            <span className="text-slate-900 dark:text-white font-bold text-[22px]">{formatMoney(offer.price)}</span>
                                            <span className="text-slate-400 dark:text-gray-600 line-through text-[13px]">{formatMoney(offer.oldPrice)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 pb-6 mt-2">
                                    <div className="flex items-center relative h-10 bg-[#e3f77e] rounded-lg overflow-hidden">
                                        <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white dark:bg-[#1C1F26] rounded-full" />
                                        <div className="pl-4 flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3 text-[#1C1F26]" />
                                            <span className="text-[#1C1F26] font-bold text-[10px] uppercase">Bajada de precio del {Math.round((1 - offer.price / offer.oldPrice) * 100)}%</span>
                                        </div>
                                        <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white dark:bg-[#1C1F26] rounded-full" />
                                    </div>
                                </div>

                                <div className="px-6 pb-6">
                                    <button className="w-full bg-black text-white py-4 rounded-2xl font-semibold text-[17px] hover:bg-gray-800 transition-colors shadow-lg active:scale-95">
                                        Añadir al carrito
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 border-t border-gray-100 dark:border-white/5">
                        <p className="text-slate-400 dark:text-gray-500 text-[10px] text-center uppercase font-bold tracking-[0.2em]">
                            Ofertas sujetas a disponibilidad por tiempo limitado
                        </p>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
        </div>
    );
}
