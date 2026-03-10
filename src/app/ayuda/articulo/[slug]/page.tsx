import { notFound } from 'next/navigation';
import { HelpArticle } from '@/components/help/HelpArticle';
import { getHelpArticle } from '@/lib/helpContent';

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) return notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <HelpArticle article={article} />
      </div>
    </main>
  );
}
