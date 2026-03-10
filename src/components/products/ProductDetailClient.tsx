"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/types";
import { useAppPreferences } from "@/components/preferences/AppPreferencesProvider";
import { formatCurrencyWithPreferences } from "@/lib/appPreferences";
import ProductGallery from "@/components/products/ProductGallery";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import PublicPreferencesControl from "@/components/preferences/PublicPreferencesControl";
import ProProductImage from "@/components/products/ProProductImage";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Flame,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Timer,
  Truck,
  TrendingUp,
  Users,
} from "lucide-react";

type ProductDetailClientProps = {
  product: Product;
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

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { preferences } = useAppPreferences();
  const isSpanish = preferences.language === "es";

  const [dealCountdown, setDealCountdown] = useState(45 * 60 + 22);
  const [wholesaleCost, setWholesaleCost] = useState(() =>
    clampMoney(product.cost > 0 ? product.cost : product.price * 0.62)
  );
  const [salePrice, setSalePrice] = useState(() =>
    clampMoney(product.price > 0 ? product.price : Math.max(1, wholesaleCost * 1.35))
  );
  const [quantity, setQuantity] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setDealCountdown((prev) => (prev <= 0 ? 45 * 60 + 22 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const labels = useMemo(
    () =>
      isSpanish
        ? {
          back: "Volver Al Catálogo",
          headingTag: "Mayorista Oficial",
          reviews: "Reseñas Verificadas",
          flashDeal: "Oferta Flash Termina En",
          color: "Color",
          quantity: "Cantidad",
          addInventory: "Agregar Al Inventario",
          warranty: "Garantía Incluida",
          secure: "Checkout Seguro",
          shipping: "Envío Exprés Gratis",
          deliveryPrefix: "Pide Dentro De",
          deliverySuffix: "Para Entrega",
          stockClaimed: "Inventario Reclamado",
          stockLeft: "Solo Quedan",
          units: "Unidades",
          whyTitle: "Por Qué A Los Distribuidores Les Encanta",
          profitTitle: "Calculador De Profit",
          profitSubtitle: "Ajusta Precio Y Cantidad Para Validar Margen Y ROI En Tiempo Real.",
          wholesaleInput: "Costo Mayorista Por Unidad",
          saleInput: "Precio De Venta Por Unidad",
          investment: "Inversión Total",
          revenue: "Ingresos Proyectados",
          grossProfit: "Utilidad Bruta",
          margin: "Margen",
          roi: "ROI",
          perUnit: "Utilidad Por Unidad",
          stock: "Stock",
          sku: "SKU",
          category: "Categoría",
          warrantyLine: "Distribuidor Autorizado • Garantía De 1 Año",
          accessories: "Complementa Tu Orden",
          posButton: "Ir A Punto De Venta",
          socialProof: "Distribuidores Lo Añadieron Esta Semana",
          limitedLabel: "Quedan",
          unitsShort: "Uds",
          save: "Ahorra",
          addNow: "Agregar Ahora",
          anchor: "Precio Ancla",
          lockPrice: "Precio Mayorista Bloqueado",
          unlockMargin: "Asegura Este Margen Ahora",
          urgency: "Hoy",
        }
        : {
          back: "Back To Catalog",
          headingTag: "Official Wholesale Partner",
          reviews: "Verified Reviews",
          flashDeal: "Flash Deal Ends In",
          color: "Color",
          quantity: "Quantity",
          addInventory: "Add To Inventory",
          warranty: "Warranty Included",
          secure: "Secure Checkout",
          shipping: "Free Express Shipping",
          deliveryPrefix: "Order Within",
          deliverySuffix: "For Delivery",
          stockClaimed: "Stock Claimed",
          stockLeft: "Only",
          units: "Units Left",
          whyTitle: "Why Wholesale Partners Love It",
          profitTitle: "Profit Calculator",
          profitSubtitle: "Tune Sale Price And Quantity To Validate Margin And ROI In Real Time.",
          wholesaleInput: "Wholesale Cost Per Unit",
          saleInput: "Sale Price Per Unit",
          investment: "Total Investment",
          revenue: "Projected Revenue",
          grossProfit: "Gross Profit",
          margin: "Margin",
          roi: "ROI",
          perUnit: "Profit Per Unit",
          stock: "Stock",
          sku: "SKU",
          category: "Category",
          warrantyLine: "Authorized Distributor • 1-Year Warranty",
          accessories: "Bundle With These Add-Ons",
          posButton: "Open POS",
          socialProof: "Distributors Added This This Week",
          limitedLabel: "Only",
          unitsShort: "Units",
          save: "Save",
          addNow: "Add Now",
          anchor: "Anchor Price",
          lockPrice: "Wholesale Lock Price",
          unlockMargin: "Lock This Margin Now",
          urgency: "Today",
        },
    [isSpanish]
  );

  const formatMoney = (value: number) => formatCurrencyWithPreferences(value, preferences);

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

  const marginProgress = Math.max(0, Math.min(100, metrics.margin));

  const coverImage = product.imageUrls?.[0] || FALLBACK_IMAGE;
  const galleryImages = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [FALLBACK_IMAGE];

  const relatedAddons = useMemo(
    () => [
      {
        name: isSpanish ? "Base premium para audífonos" : "Premium headphone stand",
        price: clampMoney(product.price * 0.22),
        stock: 18,
        image:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAZwJZNerB-sF-sy6DYhdx2W57xHg3JAMthtBM_WZ6a1jrMQLcRfm5PkMehRxamrxJF_53pT6EX_CfXmitzJXhh6mcePqYzofHjNXc3VWygF-YP_6l0NyXhDTXDa6K9w2CTq46OXp5I8lzRIGBPI7bZ1fwdGMwMQSz9Bu6Ebthv6MjSOsG0riKqAO0PoYykA0tgtBYRB_IK6L-xkl7IMaAaomOVEwpERhwdH09o33g6_Lj5es5a_INQVbxCoiSFhhurqa_Y3GNhOwZ5",
      },
      {
        name: isSpanish ? "Transmisor Bluetooth 5.2" : "Bluetooth 5.2 transmitter",
        price: clampMoney(product.price * 0.28),
        stock: 11,
        image:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuDv9I7Rhzfj9fc5PBlVlpMUHq4R8McMTxNBGiLq0mSs2DziaRG4Sb6DOgVPGtBDXV4Y6xNUpmL5IumZ7WTcWsg71zx1ijhDPKXsrPzNnLdPeonPMbxYSBmdP7HvhU5y9o3r8cEbcTQeSb9nHlZoq_4xvAmp05DeGDzrRDlb1xrt5vsXNfZCw-MjArxe4pO6uSSw2oSniGL-2hFtV3c9xqy80ehMMMa1Cc5-8MwKaMSbE6niXue8BKdUp-zYFgUUP-qM0aVYh28jWCvm",
      },
      {
        name: isSpanish ? "Kit de limpieza profesional" : "Professional cleaning kit",
        price: clampMoney(product.price * 0.08),
        stock: 34,
        image:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAUXM8MlnZV-qOQ4RrXCoNHGT-jlNa-NkaeX6opNeZ51mlMCvxd4vddLm5j0XA5euWbc8BFODvn6YxUWp6W_hsNPZkFyiNLnDjgGkqDiv8wLwGhIPu5dzqltXCGaJsspakDCWQ04I4EoUITCV0inTYLeqkZoS7AVozyeFwiS52pzsuR_twOmqlC5nXLbaYa4ouWxPbd9CHcsz7gF-rHaHqw1gGezp4mmrKmmtlOPIB52KZTdr5SmqCbvTfE_Ud0X53b35mF2h4IJ1xj",
      },
      {
        name: isSpanish ? "Almohadillas memory foam" : "Memory foam ear pads",
        price: clampMoney(product.price * 0.12),
        stock: 25,
        image:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCxpI6lXOdAXNz7_ECLJzUpRATQtOsTCcRgBcay7t2pkqLv-6PYEMsEie2SCN9kBVNd6FnOmkjRatxVgKuiDMWlYDpsFlYIPmpyoM8mWuZgCFIOF-_dsOyP1qGHMYn0lUbqTmgDq1Vdl7mjdOyHO7kRaJqyRKOeBa147enCnwcvrBgCTwE_nYsb1lmmm3t7r3y8ldJMfduPM5nP5ZfNEVM81gx4ltJIlgy4XGpnmXXQ4zfxGdAZ4b625EfH4qYokAs-9z-M9sZnefWB",
      },
    ],
    [isSpanish, product.price]
  );

  const stockText =
    product.stock > 0
      ? `${labels.stockLeft} ${Math.max(product.stock - 1, 1)} ${labels.units}`
      : isSpanish
        ? "Sin stock"
        : "Out of stock";

  return (
    <div className="landing-theme min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-black/90">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/products" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white">
              <ArrowLeft className="size-5" />
            </Link>
            <Link href="/" className="text-2xl font-black tracking-tight">Snopex</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <PublicPreferencesControl />
            <Link
              href="/pos"
              className="inline-flex h-10 items-center rounded-full bg-slate-900 px-5 text-xs font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              {labels.posButton}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Link href="/" className="transition-colors hover:text-slate-900 dark:hover:text-white">Home</Link>
          <ArrowRight className="size-4" />
          <Link href="/products" className="transition-colors hover:text-slate-900 dark:hover:text-white">
            {isSpanish ? "Productos" : "Products"}
          </Link>
          <ArrowRight className="size-4" />
          <span className="font-semibold text-slate-900 dark:text-white">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProductGallery images={galleryImages} productName={product.name} />

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                  <Package className="size-5" />
                </div>
                <p className="font-semibold">{labels.stock}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{product.stock > 0 ? `${product.stock} un.` : "-"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <BadgeCheck className="size-5" />
                </div>
                <p className="font-semibold">{labels.warranty}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{labels.warrantyLine}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
                  <TrendingUp className="size-5" />
                </div>
                <p className="font-semibold">{labels.whyTitle}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{labels.reviews}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="mb-5 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {labels.headingTag}
            </div>
            <h1 className="text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-4xl">{product.name}</h1>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{product.description || ""}</div>

            <SpotlightCard
              spotlightColor="rgba(59, 130, 246, 0.24)"
              className="mt-6 rounded-[2rem] border border-slate-200 bg-white/95 p-7 shadow-xl dark:border-slate-700 dark:bg-slate-900/95 [--spotlight-border:rgba(148,163,184,0.22)] [--spotlight-bg:rgba(255,255,255,0.96)] dark:[--spotlight-bg:rgba(15,23,42,0.94)]"
            >
              <div className="mb-5 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <Timer className="size-4" /> {labels.flashDeal}
                </span>
                <span className="rounded-xl bg-white px-3 py-1 font-mono text-sm font-bold shadow-sm dark:bg-slate-900">
                  {toClock(dealCountdown)}
                </span>
              </div>

              <div className="mb-6">
                <p className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">{formatMoney(product.price)}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stockText}</p>
              </div>

              <div className="mb-6">
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{labels.color}</p>
                <div className="flex gap-3">
                  <button type="button" aria-label="Black" className="h-9 w-9 rounded-full border border-slate-300 bg-slate-900 ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900" />
                  <button type="button" aria-label="Silver" className="h-9 w-9 rounded-full border border-slate-300 bg-slate-200" />
                  <button type="button" aria-label="Blue" className="h-9 w-9 rounded-full border border-slate-300 bg-blue-900" />
                </div>
              </div>

              <div className="mb-6">
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{labels.quantity}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(event) => setQuantity(clampQuantity(event.target.valueAsNumber))}
                    className="h-10 w-20 rounded-xl border border-slate-300 bg-white px-3 text-center font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-lg font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    +
                  </button>
                </div>
              </div>

              <Link
                href={`/checkout?productId=${encodeURIComponent(product.id)}&qty=${encodeURIComponent(String(quantity))}`}
                className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <ShoppingBag className="size-5" />
                {labels.addInventory}
              </Link>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="size-4 text-emerald-500" /> {labels.warranty}</span>
                <span className="inline-flex items-center gap-1"><BadgeCheck className="size-4 text-blue-500" /> {labels.secure}</span>
              </div>
            </SpotlightCard>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Truck className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{labels.shipping}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {labels.deliveryPrefix} <span className="font-semibold">02h 15m</span> {labels.deliverySuffix} <span className="font-semibold capitalize">{deliveryDate}</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <SpotlightCard
            spotlightColor="rgba(209, 243, 102, 0.2)"
            className="rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-xl dark:border-slate-700 dark:from-slate-900 dark:to-slate-950 md:p-10 [--spotlight-border:rgba(148,163,184,0.22)]"
          >
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">{labels.profitTitle}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{labels.profitSubtitle}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <Flame className="size-3.5" /> {labels.anchor}: {formatMoney(Math.max(product.price, salePrice) * 1.35)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    <Timer className="size-3.5" /> {labels.lockPrice}: {toClock(dealCountdown)}
                  </span>
                </div>
              </div>
              <div className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white dark:bg-white dark:text-slate-900">
                {formatMoney(metrics.grossProfit)}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {labels.wholesaleInput}
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={wholesaleCost}
                    onChange={(event) => setWholesaleCost(clampMoney(event.target.valueAsNumber))}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {labels.saleInput}
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={salePrice}
                    onChange={(event) => setSalePrice(clampMoney(event.target.valueAsNumber))}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {labels.quantity}
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(event) => setQuantity(clampQuantity(event.target.valueAsNumber))}
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>

                <button
                  type="button"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-sm font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Sparkles className="size-4" />
                  {labels.unlockMargin}
                </button>
              </div>

              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.investment}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatMoney(metrics.investment)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.revenue}</p>
                    <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{formatMoney(metrics.revenue)}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{labels.grossProfit}</p>
                    <p className={`mt-2 text-2xl font-black ${metrics.grossProfit >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-400"}`}>
                      {formatMoney(metrics.grossProfit)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{labels.perUnit}</p>
                    <p className={`mt-2 text-2xl font-black ${metrics.perUnitProfit >= 0 ? "text-blue-700 dark:text-blue-300" : "text-red-600 dark:text-red-400"}`}>
                      {formatMoney(metrics.perUnitProfit)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{labels.margin}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{metrics.margin.toFixed(1)}%</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-500"
                      style={{ width: `${marginProgress}%` }}
                    />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.roi}</p>
                      <p className={`text-xl font-black ${metrics.roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {metrics.roi.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.stockClaimed}</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{stockClaimed}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SpotlightCard>
        </section>

        <section className="mt-16">
          <h3 className="mb-6 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{labels.accessories}</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedAddons.map((addon, index) => (
              <SpotlightCard
                key={`${addon.name}-${index}`}
                spotlightColor="rgba(56, 189, 248, 0.18)"
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 shadow-sm transition-transform hover:-translate-y-1 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="grid min-h-[352px] grid-rows-[176px_1fr]">
                  <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800">
                    <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-[#B93826] px-2.5 py-1 text-[11px] font-bold text-white">
                      -{Math.max(8, Math.min(28, Math.round((1 - addon.price / Math.max(addon.price * 1.28, 1)) * 100)))}%
                    </div>
                    <ProProductImage
                      src={addon.image || coverImage}
                      alt={addon.name}
                      sizes="(min-width: 1024px) 20vw, 100vw"
                      paddingClassName="p-5"
                      className="rounded-none bg-transparent"
                    />
                  </div>

                  <div className="flex flex-col p-4">
                    <p className="line-clamp-2 min-h-[48px] text-lg font-semibold leading-6 text-slate-900 dark:text-white">{addon.name}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <Users className="mr-1 inline size-3.5" />
                      {Math.max(12, addon.stock + 7)} {labels.socialProof}
                    </p>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <span className="block text-3xl font-black leading-none text-slate-900 dark:text-white">
                          {formatMoney(addon.price)}
                        </span>
                        <span className="text-sm text-slate-400 line-through">
                          {formatMoney(clampMoney(addon.price * 1.28))}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {labels.limitedLabel} {addon.stock} {labels.unitsShort}
                      </span>
                    </div>

                    <div className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {labels.save} {formatMoney(clampMoney(addon.price * 0.28))} {labels.urgency}
                    </div>

                    <button
                      type="button"
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-700 dark:border-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      {labels.addNow}
                    </button>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
