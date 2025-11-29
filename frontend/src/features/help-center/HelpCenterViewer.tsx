/*
 * SPDX-License-Identifier: MIT
 */

import { BookOpen, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  link: string;
}

const ARTICLES: HelpArticle[] = [
  {
    id: 'setup-101',
    title: 'Getting started with site setup',
    category: 'Onboarding',
    summary: 'Create sites and departments so work orders can be routed correctly.',
    link: 'https://example.com/help/sites',
  },
  {
    id: 'assets-import',
    title: 'How to import assets from spreadsheets',
    category: 'Assets',
    summary: 'Use the importer to bring in equipment with hierarchy and metadata.',
    link: 'https://example.com/help/assets',
  },
  {
    id: 'pm-template',
    title: 'Building preventive maintenance templates',
    category: 'PM',
    summary: 'Leverage calendar or meter rules and checklists for recurring work.',
    link: 'https://example.com/help/pm-templates',
  },
  {
    id: 'teams-invite',
    title: 'Inviting users and managing roles',
    category: 'Access',
    summary: 'Share the workspace with supervisors, technicians, and contractors.',
    link: 'https://example.com/help/users',
  },
];

const HelpCenterViewer = () => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ARTICLES;
    return ARTICLES.filter(
      (article) =>
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.category.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-700">
        <BookOpen className="h-5 w-5 text-indigo-600" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Help center</p>
          <h3 className="text-lg font-semibold text-slate-900">Guides and troubleshooting</h3>
        </div>
      </div>
      <div className="mt-4">
        <label className="sr-only" htmlFor="help-search">
          Search help center
        </label>
        <input
          id="help-search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles by topic"
          className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none"
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((article) => (
          <article
            key={article.id}
            className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{article.category}</p>
            <h4 className="text-base font-semibold text-slate-900">{article.title}</h4>
            <p className="text-sm text-slate-600">{article.summary}</p>
            <a
              href={article.link}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 underline-offset-4 hover:underline"
            >
              Open article
              <ExternalLink className="h-4 w-4" />
            </a>
          </article>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No help articles match that search yet.</p>
      ) : null}
    </section>
  );
};

export default HelpCenterViewer;
