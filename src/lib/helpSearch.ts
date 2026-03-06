import { helpArticles, helpCategories } from '@/lib/helpContent';
import { HelpSearchResult } from '@/types/help';

interface SearchOptions {
  category?: string;
  tag?: string;
  limit?: number;
}

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const searchHelp = (query: string, options: SearchOptions = {}): HelpSearchResult[] => {
  const q = tokenize(query);
  if (!q.length) return [];

  const categoryAllowed = options.category ? new Set([options.category]) : null;
  const tagAllowed = options.tag?.toLowerCase();

  const rows = Object.values(helpArticles)
    .filter((article) => (categoryAllowed ? categoryAllowed.has(article.category) : true))
    .filter((article) => (tagAllowed ? article.tags.map((tag) => tag.toLowerCase()).includes(tagAllowed) : true))
    .map((article) => {
      const haystack = tokenize([
        article.title,
        article.description,
        article.intro,
        article.module,
        article.tags.join(' '),
        article.steps.join(' '),
      ].join(' '));

      let score = 0;
      q.forEach((token) => {
        if (article.title.toLowerCase().includes(token)) score += 6;
        if (article.description.toLowerCase().includes(token)) score += 3;
        if (article.tags.some((tag) => tag.toLowerCase().includes(token))) score += 4;
        if (haystack.includes(token)) score += 1;
      });

      return {
        slug: article.slug,
        title: article.title,
        description: article.description,
        category: article.category,
        module: article.module,
        score,
        tags: article.tags,
      } satisfies HelpSearchResult;
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return rows.slice(0, options.limit ?? 20);
};

export const getHelpAutocomplete = (query: string): string[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const titles = Object.values(helpArticles)
    .map((article) => article.title)
    .filter((title) => title.toLowerCase().includes(q));

  const categoryTitles = helpCategories
    .map((category) => category.title)
    .filter((title) => title.toLowerCase().includes(q));

  return [...new Set([...titles, ...categoryTitles])].slice(0, 8);
};

export const getAllHelpTags = (): string[] => {
  const tags = new Set<string>();
  Object.values(helpArticles).forEach((article) => {
    article.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
};
