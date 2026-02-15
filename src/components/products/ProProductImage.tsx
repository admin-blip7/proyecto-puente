"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type ProProductImageProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  paddingClassName?: string;
};

const FALLBACK_IMAGE = "https://placehold.co/900x900/f8fafc/0f172a?text=Sin+foto";

const isLikelyMarketplaceImage = (url: string) => {
  const normalized = url.toLowerCase();
  return (
    normalized.includes("aida-public") ||
    normalized.includes("alibaba") ||
    normalized.includes("dongguan")
  );
};

export default function ProProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  imageClassName,
  paddingClassName = "p-6",
}: ProProductImageProps) {
  const candidates = useMemo(() => {
    const queue: string[] = [];
    if (src && src.trim().length > 0) queue.push(src);
    queue.push(FALLBACK_IMAGE);
    return queue;
  }, [src]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSrc = candidates[Math.min(currentIndex, candidates.length - 1)];
  const marketplaceLike = isLikelyMarketplaceImage(currentSrc);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.65),transparent_55%)] dark:bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.2),transparent_55%)]" />
      <div className={cn("absolute inset-0", paddingClassName)}>
        <Image
          src={currentSrc}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          onError={() => {
            setCurrentIndex((prev) => (prev < candidates.length - 1 ? prev + 1 : prev));
          }}
          className={cn(
            "object-contain transition-transform duration-500 group-hover:scale-105",
            "drop-shadow-[0_14px_28px_rgba(15,23,42,0.2)]",
            marketplaceLike ? "mix-blend-multiply dark:mix-blend-normal" : "",
            imageClassName
          )}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/60 dark:ring-white/10" />
    </div>
  );
}

