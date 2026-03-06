'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { helpCategories, getMostViewedArticles } from '@/lib/helpContent';
import { HelpSearch } from '@/components/help/HelpSearch';

export function HelpPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const topArticles = getMostViewedArticles(4);

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/30 backdrop-blur-sm">
      <aside className="absolute right-0 top-0 h-full w-full max-w-md border-l border-slate-200 bg-white/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-600">Centro de ayuda</p>
            <h2 className="text-xl font-semibold text-slate-900">¿En qué te apoyamos?</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>

        <HelpSearch />

        <div className="mt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Categorías</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {helpCategories.slice(0, 8).map((category) => (
                <Link key={category.id} href={`/ayuda/categoria/${category.slug}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50" onClick={onClose}>
                  {category.icon} {category.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Artículos populares</h3>
            <div className="mt-2 space-y-2">
              {topArticles.map((item) => (
                <Link key={item.slug} href={`/ayuda/articulo/${item.slug}`} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={onClose}>
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            ¿Necesitas soporte avanzado? Usa el chat de soporte o visita el centro completo.
            <div className="mt-2 flex gap-2">
              <Link href="/ayuda" onClick={onClose} className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">Ir a /ayuda</Link>
              <button className="rounded-md border border-blue-200 px-3 py-1.5 text-xs">Abrir chat</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
