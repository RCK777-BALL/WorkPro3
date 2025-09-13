/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import http from '@/lib/http';

interface SearchResult {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface CommandPaletteProps {
  onNavigate?: (url: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!query) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const res = await http.get<SearchResult[]>(
          '/search',
          { params: { q: query }, signal: controller.signal },
        );
        setResults(res.data || []);
      } catch {
        // ignore
      }
    })();
    return () => controller.abort();
  }, [query, open]);

  const handleSelect = (url: string) => {
    if (onNavigate) onNavigate(url);
    else window.location.href = url;
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (results[0]) handleSelect(results[0].url);
  };

  if (!open) return null;

  return (
    <div role="dialog" className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24">
      <div className="w-full max-w-md rounded bg-white p-4 shadow">
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full border-b p-2 outline-none"
          />
        </form>
        <ul className="mt-2 max-h-60 overflow-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => handleSelect(r.url)}
                className="w-full rounded p-2 text-left hover:bg-neutral-100"
              >
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-xs text-neutral-500">{r.type}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t pt-2 text-sm text-neutral-500">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSelect('/assets/new')}
              className="rounded bg-neutral-100 px-2 py-1 hover:bg-neutral-200"
            >
              + Asset
            </button>
            <button
              type="button"
              onClick={() => handleSelect('/work-orders/new')}
              className="rounded bg-neutral-100 px-2 py-1 hover:bg-neutral-200"
            >
              + Work Order
            </button>
            <button
              type="button"
              onClick={() => handleSelect('/parts/new')}
              className="rounded bg-neutral-100 px-2 py-1 hover:bg-neutral-200"
            >
              + Part
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
