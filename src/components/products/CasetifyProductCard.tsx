"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/types";
import { toProductSlug } from "@/lib/productSlugs";

interface CasetifyProductCardProps {
  product: Product;
}

const FALLBACK_TITLE = "Producto de inventario";
const FALLBACK_LINE_ONE = "Compatible con varios modelos";
const FALLBACK_LINE_TWO = "Disponible para personalizacion";
const FALLBACK_MONOGRAM = "PX";

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 ? text : null;
};

const normalizeRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
};

const readAttribute = (attributes: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = normalizeString(attributes[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

const toTitleWords = (value: string): string => {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
};

const toDisplayCapitalize = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
};

const toMonogram = (value: string): string => {
  const pieces = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((piece) => piece[0]?.toUpperCase() ?? "");

  if (pieces.length === 0) return FALLBACK_MONOGRAM;
  return pieces.join("");
};

export default function CasetifyProductCard({ product }: CasetifyProductCardProps) {
  const attributes = useMemo(() => normalizeRecord(product.attributes), [product.attributes]);

  const primaryImage = useMemo(() => {
    const optimizedImage = normalizeString(attributes.optimizedImageUrl);
    if (optimizedImage) {
      return optimizedImage;
    }

    if (!Array.isArray(product.imageUrls)) {
      return null;
    }

    const firstImage = product.imageUrls.find((url) => normalizeString(url));
    return normalizeString(firstImage);
  }, [attributes, product.imageUrls]);

  const [resolvedImage, setResolvedImage] = useState<string | null>(primaryImage);

  useEffect(() => {
    setResolvedImage(primaryImage);
  }, [primaryImage]);

  const rawTitle = normalizeString(product.name) ?? FALLBACK_TITLE;
  const title = toDisplayCapitalize(rawTitle);
  const displaySlug = useMemo(() => {
    const slug = toProductSlug(rawTitle);
    if (slug.length > 0) return slug;
    return normalizeString(product.id) ?? "product";
  }, [product.id, rawTitle]);
  const detailsHref = `/products/${encodeURIComponent(displaySlug)}`;
  const addToCartHref = `/checkout?${new URLSearchParams({
    productId: String(product.id),
    action: "add",
  }).toString()}`;

  const lineOne = useMemo(() => {
    const compatibility = readAttribute(attributes, [
      "modelo",
      "model",
      "compatibility",
      "compatibleWith",
      "compatibilidad",
      "deviceModel",
      "phoneModel",
      "forModel",
    ]);

    if (compatibility) {
      return compatibility;
    }

    const categoryName = normalizeString(product.categoryName);
    if (categoryName) {
      return toTitleWords(categoryName);
    }

    const category = normalizeString(product.category);
    if (category) {
      return toTitleWords(category);
    }

    return FALLBACK_LINE_ONE;
  }, [attributes, product.category, product.categoryName]);

  const lineTwo = useMemo(() => {
    const description = normalizeString(product.description);
    if (description) {
      return description;
    }

    const detailParts = [
      readAttribute(attributes, ["color", "colour"]),
      readAttribute(attributes, ["memoria", "memory", "storage", "capacidad"]),
      readAttribute(attributes, ["material"]),
      readAttribute(attributes, ["estetica", "finish", "style"]),
    ].filter((value): value is string => Boolean(value));

    if (detailParts.length > 0) {
      return detailParts.slice(0, 3).join(" | ");
    }

    return FALLBACK_LINE_TWO;
  }, [attributes, product.description]);

  const monogram = useMemo(() => toMonogram(title), [title]);
  const normalizedPrice = Number.isFinite(product.price) ? Math.max(0, product.price) : 0;
  const formattedPrice = `$${Math.round(normalizedPrice).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <article className="flex min-h-[500px] flex-col bg-white p-4 md:min-h-[530px] md:p-5 lg:min-h-[560px]">
      <Link
        href={detailsHref}
        className="block overflow-hidden rounded-[24px]"
        aria-label={`Ver ${title}`}
      >
        <div className="relative aspect-[5/6] w-full">
          {resolvedImage ? (
            <Image
              src={resolvedImage}
              alt={title}
              fill
              className="object-cover object-center"
              onError={() => setResolvedImage(null)}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#d8d9de] to-[#c9ccd6] text-[3.1rem] font-extrabold tracking-[0.08em] text-[#505465]">
              {monogram}
            </div>
          )}
        </div>
      </Link>

      <div className="mt-5 flex flex-1 flex-col items-center text-center">
        <Link href={detailsHref}>
          <h3 className="force-capitalize line-clamp-2 min-h-[3.3rem] text-[1.45rem] font-semibold leading-[1.1] tracking-[-0.01em] text-[#131313] md:min-h-[3.6rem] md:text-[1.6rem] lg:min-h-[3.9rem] lg:text-[1.75rem] dark:text-[#f5f5f5]">
            {title}
          </h3>
        </Link>
        <p className="force-capitalize font-editors-note-light mt-1 line-clamp-1 min-h-[1.35rem] text-[0.98rem] text-[#6a6a6f] md:text-[1.05rem] lg:text-[1.1rem] dark:text-[#a9adb5]">
          {lineOne}
        </p>
        <p className="force-capitalize mt-1 line-clamp-1 min-h-[1.35rem] text-[0.98rem] font-medium text-[#6a6a6f] md:text-[1.05rem] lg:text-[1.1rem] dark:text-[#a9adb5]">
          {lineTwo}
        </p>
        <div className="mt-auto flex w-full flex-col items-center pt-3">
          <p className="font-editors-note-regular min-h-[2.2rem] text-[1.72rem] font-normal leading-none text-[#161616] md:min-h-[2.35rem] md:text-[1.9rem] lg:min-h-[2.5rem] lg:text-[2.05rem] dark:text-[#f2f2f2]">
            {formattedPrice}
          </p>

          <Link
            href={addToCartHref}
            className="mt-3 inline-flex min-h-[40px] w-fit items-center justify-center gap-2 rounded-full border border-[#151515] bg-gradient-to-b from-[#2f2f2f] via-[#1f1f1f] to-[#0b0b0b] px-4 text-[0.92rem] font-medium text-white shadow-[0_8px_16px_-12px_rgba(0,0,0,0.95)] transition hover:-translate-y-[1px] hover:from-[#3a3a3a] hover:via-[#262626] hover:to-[#111111] hover:shadow-[0_12px_24px_-14px_rgba(0,0,0,0.95)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
            aria-label={`Agregar ${title} al carrito`}
          >
            <span
              className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-white text-[#121212]"
              aria-hidden="true"
            >
              <ShoppingCart size={13} strokeWidth={2.1} />
            </span>
            <span className="force-capitalize">agregar al carrito</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
