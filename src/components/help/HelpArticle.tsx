'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { HelpArticle as HelpArticleType } from '@/types/help';
import { getHelpVideo, helpArticles } from '@/lib/helpContent';
import { VideoPlayer } from '@/components/help/VideoPlayer';

export function HelpArticle({ article }: { article: HelpArticleType }) {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const [suggestion, setSuggestion] = useState('');

  const video = useMemo(() => getHelpVideo(article.videoId), [article.videoId]);

  return (
    <article className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white/80 p-5">
        <p className="text-xs uppercase tracking-wide text-blue-600">{article.module}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 md:text-3xl">{article.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{article.description}</p>
        <p className="mt-3 text-xs text-slate-500">Última actualización: {article.lastUpdated}</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Introducción</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{article.intro}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Pasos</h2>
        <ol className="mt-3 space-y-2">
          {article.steps.map((step, index) => (
            <li key={step} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
              <strong className="mr-1 text-slate-900">{index + 1}.</strong>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5">
          <h3 className="font-semibold text-slate-900">Tips</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {article.tips.map((tip) => <li key={tip}>• {tip}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
          <h3 className="font-semibold text-amber-900">Advertencias</h3>
          <ul className="mt-2 space-y-2 text-sm text-amber-800">
            {article.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Capturas de pantalla (placeholders)</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {article.screenshotPlaceholders.map((item) => (
            <div key={item} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              {item}
            </div>
          ))}
        </div>
      </section>

      {video ? <VideoPlayer video={video} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5">
        <h2 className="text-lg font-semibold text-slate-900">Artículos relacionados</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {article.related.map((slug) => {
            const relatedArticle = helpArticles[slug];
            if (!relatedArticle) return null;
            return (
              <Link key={slug} href={`/ayuda/articulo/${slug}`} className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-blue-700 hover:bg-blue-50">
                {relatedArticle.title}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-5">
        <h2 className="text-lg font-semibold text-slate-900">¿Te fue útil?</h2>
        <p className="mt-1 text-sm text-slate-600">{article.helpfulCount.toLocaleString()} personas lo encontraron útil.</p>
        <div className="mt-3 flex gap-2">
          <button className={`rounded-lg px-4 py-2 text-sm ${vote === 'up' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setVote('up')}>👍 Sí</button>
          <button className={`rounded-lg px-4 py-2 text-sm ${vote === 'down' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setVote('down')}>👎 No</button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Comentario opcional"
            className="h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <textarea
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
            placeholder="Sugerir mejora"
            className="h-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Enviar feedback</button>
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700">Reportar problema</button>
        </div>
      </section>
    </article>
  );
}
