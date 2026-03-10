import Link from 'next/link';
import { HelpCategory as HelpCategoryType } from '@/types/help';

export function HelpCategory({ category }: { category: HelpCategoryType }) {
  return (
    <Link
      href={`/ayuda/categoria/${category.slug}`}
      className="group rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 text-2xl">{category.icon}</div>
      <h3 className="font-semibold text-slate-900">{category.title}</h3>
      <p className="mt-2 text-sm text-slate-600">{category.description}</p>
      <p className="mt-3 text-xs text-blue-600">{category.articleSlugs.length} artículos</p>
    </Link>
  );
}
