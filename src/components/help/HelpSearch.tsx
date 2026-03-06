'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { getHelpAutocomplete } from '@/lib/helpSearch';

interface HelpSearchProps {
  initialQuery?: string;
  submitPath?: string;
}

export function HelpSearch({ initialQuery = '', submitPath = '/ayuda/buscar' }: HelpSearchProps) {
  const [query, setQuery] = useState(initialQuery);

  const suggestions = useMemo(() => getHelpAutocomplete(query), [query]);

  return (
    <div className="space-y-3">
      <form action={submitPath} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar artículos, módulos o temas..."
          className="h-12 w-full rounded-xl border border-slate-200 bg-white/80 pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
        />
      </form>

      {query.trim().length > 1 && suggestions.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white/90 p-2">
          {suggestions.map((item) => (
            <Link
              key={item}
              href={`${submitPath}?q=${encodeURIComponent(item)}`}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              {item}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
