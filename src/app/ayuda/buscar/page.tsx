import Link from 'next/link';
import { HelpSearch } from '@/components/help/HelpSearch';
import { getAllHelpTags, searchHelp } from '@/lib/helpSearch';
import { helpCategories } from '@/lib/helpContent';

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    tag?: string;
  }>;
}

export default async function HelpSearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const categoria = params.categoria?.trim() || undefined;
  const tag = params.tag?.trim() || undefined;

  const results = q ? searchHelp(q, { category: categoria, tag }) : [];
  const tags = getAllHelpTags();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">Buscar en la base de conocimiento</h1>
          <p className="mt-1 text-sm text-slate-600">Búsqueda por título, contenido, etiquetas y módulo.</p>
          <div className="mt-4"><HelpSearch initialQuery={q} /></div>

          <form className="mt-4 grid gap-3 md:grid-cols-2" action="/ayuda/buscar">
            <input type="hidden" name="q" value={q} />
            <select name="categoria" defaultValue={categoria ?? ''} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
              <option value="">Todas las categorías</option>
              {helpCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.title}</option>
              ))}
            </select>
            <select name="tag" defaultValue={tag ?? ''} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
              <option value="">Todas las etiquetas</option>
              {tags.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white md:col-span-2">Aplicar filtros</button>
          </form>
        </section>

        <section className="space-y-3">
          <p className="text-sm text-slate-600">{results.length} resultados para <strong>{q || 'consulta vacía'}</strong></p>
          {results.map((item) => (
            <Link key={item.slug} href={`/ayuda/articulo/${item.slug}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-slate-900">{item.title}</h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{item.module}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              <p className="mt-2 text-xs text-slate-500">Etiquetas: {item.tags.join(', ')}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
