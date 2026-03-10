import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticlesByCategory, getHelpCategoryBySlug } from '@/lib/helpContent';
import { HelpSearch } from '@/components/help/HelpSearch';

export default async function HelpCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getHelpCategoryBySlug(slug);
  if (!category) return notFound();

  const articles = getArticlesByCategory(category.id);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-blue-600">{category.icon} Categoría</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{category.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{category.description}</p>
          <div className="mt-4"><HelpSearch /></div>
        </header>

        <section className="space-y-3">
          {articles.map((article) => (
            <Link key={article.slug} href={`/ayuda/articulo/${article.slug}`} className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:bg-blue-50/40">
              <h2 className="font-semibold text-slate-900">{article.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{article.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
