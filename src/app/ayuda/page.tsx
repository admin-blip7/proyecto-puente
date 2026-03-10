import Link from 'next/link';
import { HelpCategory } from '@/components/help/HelpCategory';
import { HelpSearch } from '@/components/help/HelpSearch';
import { InteractiveTour } from '@/components/help/InteractiveTour';
import { getMostViewedArticles, helpCategories, helpTours } from '@/lib/helpContent';

export const metadata = {
  title: 'Centro de Ayuda | 22 Electronic Group',
};

export default function HelpHomePage() {
  const featured = getMostViewedArticles(6);
  const startHere = featured.slice(0, 3);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dbeafe,transparent_50%),radial-gradient(circle_at_bottom_left,#fef3c7,transparent_40%),#f8fafc] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white/75 p-6 shadow-sm backdrop-blur md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Sistema de ayuda</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Centro de Ayuda 22 Electronic Group</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">Documentación de POS, inventario, finanzas, rutas, CRM y tienda online en un solo lugar.</p>
          <div className="mt-5">
            <HelpSearch />
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Categorías</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {helpCategories.map((category) => <HelpCategory key={category.id} category={category} />)}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Artículos más vistos</h2>
            <div className="mt-3 space-y-2">
              {featured.map((article) => (
                <Link key={article.slug} href={`/ayuda/articulo/${article.slug}`} className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                  {article.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50/80 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Comenzar aquí</h2>
            <p className="mt-2 text-sm text-slate-700">Si eres usuario nuevo, empieza por estos artículos.</p>
            <div className="mt-3 space-y-2">
              {startHere.map((article) => (
                <Link key={article.slug} href={`/ayuda/articulo/${article.slug}`} className="block rounded-xl border border-yellow-100 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-yellow-100/60">
                  {article.title}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-900">Guías interactivas</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {helpTours.map((tour) => <InteractiveTour key={tour.id} tour={tour} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
