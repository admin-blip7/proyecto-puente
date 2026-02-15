"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Timer, Truck, BadgeCheck, Lock, ArrowRight } from "lucide-react";
import { useAppPreferences } from "@/components/preferences/AppPreferencesProvider";
import { formatCurrencyWithPreferences } from "@/lib/appPreferences";
import PublicPreferencesControl from "@/components/preferences/PublicPreferencesControl";
import ProProductImage from "@/components/products/ProProductImage";

type CheckoutProductView = {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl: string | null;
  stock: number;
};

type CheckoutAddonView = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
};

type CheckoutPageClientProps = {
  product: CheckoutProductView;
  addOns: CheckoutAddonView[];
  initialQty: number;
};

const clampQuantity = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
};

const toClock = (seconds: number) => {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

export default function CheckoutPageClient({ product, addOns, initialQty }: CheckoutPageClientProps) {
  const { preferences } = useAppPreferences();
  const isSpanish = preferences.language === "es";

  const [qty, setQty] = useState(clampQuantity(initialQty));
  const [shippingMethod, setShippingMethod] = useState<"standard" | "expedited">("standard");
  const [reserveCountdown, setReserveCountdown] = useState(9 * 60 + 59);

  useEffect(() => {
    const timer = setInterval(() => {
      setReserveCountdown((prev) => (prev <= 0 ? 9 * 60 + 59 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const labels = useMemo(
    () =>
      isSpanish
        ? {
            title: "Checkout Seguro",
            pci: "Cumple PCI",
            ssl: "SSL Seguro",
            summary: "Tu pedido",
            stockReserved: "Stock reservado",
            subtotal: "Subtotal",
            shipping: "Envío",
            tax: "Impuestos estimados",
            total: "Total",
            totalSavings: "Ahorro total de hoy",
            payNow: "Finalizar pedido",
            reservedFor: "Reservado por",
            backToProduct: "Volver al producto",
            standard: "Estándar",
            standardEta: "4-6 días hábiles",
            expedited: "Express",
            expeditedEta: "2-3 días hábiles",
            free: "Gratis",
            quantity: "Cantidad",
            secureMessage: "Pago cifrado y protegido",
          }
        : {
            title: "Secure Checkout",
            pci: "PCI Compliant",
            ssl: "SSL Secure",
            summary: "Your order",
            stockReserved: "Stock reserved",
            subtotal: "Subtotal",
            shipping: "Shipping",
            tax: "Estimated tax",
            total: "Total",
            totalSavings: "Total savings today",
            payNow: "Place order",
            reservedFor: "Reserved for",
            backToProduct: "Back to product",
            standard: "Standard",
            standardEta: "4-6 business days",
            expedited: "Expedited",
            expeditedEta: "2-3 business days",
            free: "Free",
            quantity: "Quantity",
            secureMessage: "Encrypted and secure checkout",
          },
    [isSpanish]
  );

  const shippingCost = shippingMethod === "expedited" ? 14.99 : 0;
  const subtotal = product.price * qty;
  const tax = subtotal * 0.048;
  const anchorTotal = subtotal * 1.24;
  const total = subtotal + shippingCost + tax;
  const savings = Math.max(0, anchorTotal - total);

  return (
    <div className="landing-theme min-h-screen bg-background-light text-slate-700 dark:bg-background-dark dark:text-slate-300">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
              <ShieldCheck className="size-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{labels.title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 text-xs font-medium text-slate-500 sm:flex">
              <span className="inline-flex items-center gap-1"><BadgeCheck className="size-4 text-green-500" /> {labels.pci}</span>
              <span className="inline-flex items-center gap-1"><Lock className="size-4 text-blue-500" /> {labels.ssl}</span>
            </div>
            <PublicPreferencesControl />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <section className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {isSpanish ? "Checkout exprés" : "Express checkout"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" className="h-12 rounded-full bg-black text-sm font-semibold text-white">Apple Pay</button>
              <button type="button" className="h-12 rounded-full bg-[#ffc439] text-sm font-semibold text-[#003087]">PayPal</button>
              <button type="button" className="h-12 rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">Google Pay</button>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="grid gap-6 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <div className="relative h-28 w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                <ProProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  sizes="120px"
                  paddingClassName="p-3"
                  className="rounded-none bg-transparent"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{product.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{product.sku}</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{labels.quantity}</span>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(event) => setQty(clampQuantity(event.target.valueAsNumber))}
                    className="h-8 w-14 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    onClick={() => setQty((prev) => prev + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrencyWithPreferences(product.price, preferences)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Stock: {product.stock}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {isSpanish ? "Dirección de envío" : "Shipping address"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder={isSpanish ? "Nombre" : "First name"} />
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder={isSpanish ? "Apellido" : "Last name"} />
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm sm:col-span-2 dark:border-slate-700 dark:bg-slate-800" placeholder={isSpanish ? "Dirección" : "Street address"} />
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder={isSpanish ? "Ciudad" : "City"} />
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder={isSpanish ? "Estado" : "State"} />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {isSpanish ? "Método de envío" : "Shipping method"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-2xl border-2 p-4 transition ${shippingMethod === "standard" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700"}`}>
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingMethod === "standard"}
                  onChange={() => setShippingMethod("standard")}
                  className="mr-2"
                />
                <span className="font-semibold text-slate-900 dark:text-white">{labels.standard}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">{labels.standardEta}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-600">{labels.free}</p>
              </label>
              <label className={`cursor-pointer rounded-2xl border-2 p-4 transition ${shippingMethod === "expedited" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700"}`}>
                <input
                  type="radio"
                  name="shipping"
                  checked={shippingMethod === "expedited"}
                  onChange={() => setShippingMethod("expedited")}
                  className="mr-2"
                />
                <span className="font-semibold text-slate-900 dark:text-white">{labels.expedited}</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">{labels.expeditedEta}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {formatCurrencyWithPreferences(14.99, preferences)}
                </p>
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {isSpanish ? "Método de pago" : "Payment method"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm sm:col-span-2 dark:border-slate-700 dark:bg-slate-800" placeholder={isSpanish ? "Número de tarjeta" : "Card number"} />
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder={isSpanish ? "MM / AA" : "MM / YY"} />
              <input className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800" placeholder="CVC" />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {isSpanish ? "Complementos sugeridos" : "Suggested add-ons"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {addOns.map((addon) => (
                <div key={addon.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <ProProductImage src={addon.imageUrl} alt={addon.name} sizes="64px" paddingClassName="p-2" className="rounded-none bg-transparent" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{addon.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrencyWithPreferences(addon.price, preferences)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="sticky top-24 h-fit rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{labels.summary}</h2>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {labels.stockReserved}
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>{labels.subtotal}</span>
              <span>{formatCurrencyWithPreferences(subtotal, preferences)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>{labels.shipping}</span>
              <span>{shippingCost === 0 ? labels.free : formatCurrencyWithPreferences(shippingCost, preferences)}</span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>{labels.tax}</span>
              <span>{formatCurrencyWithPreferences(tax, preferences)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-900/20">
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{labels.totalSavings}</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrencyWithPreferences(savings, preferences)}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">{labels.total}</span>
              <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatCurrencyWithPreferences(total, preferences)}
              </span>
            </div>
          </div>

          <Link
            href="/pos"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700"
          >
            {labels.payNow}
            <ArrowRight className="size-4" />
          </Link>

          <div className="mt-4 flex items-center justify-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-600 dark:bg-red-900/20 dark:text-red-300">
            <Timer className="size-4 animate-pulse" />
            {labels.reservedFor} {toClock(reserveCountdown)}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Truck className="size-4 text-emerald-500" />
            {labels.secureMessage}
          </div>

          <Link href={`/products/${product.id}`} className="mt-4 block text-center text-xs font-semibold text-blue-600 hover:underline dark:text-blue-300">
            {labels.backToProduct}
          </Link>
        </aside>
      </main>
    </div>
  );
}
