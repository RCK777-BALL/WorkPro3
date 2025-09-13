/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import { Search, Package, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useNavigate } from 'react-router-dom';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Asset { id: string; name: string }
interface WorkOrder { id: string; title: string }

type Result =
  | { type: 'asset'; id: string; name: string }
  | { type: 'workorder'; id: string; title: string };

export default function GlobalSearch({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    async function load() {
      try {
        const [assetsRes, workRes] = await Promise.all([
          fetch(`/api/assets?search=${encodeURIComponent(query)}`).then(r => r.json()),
          fetch(`/api/workorders?search=${encodeURIComponent(query)}`).then(r => r.json()),
        ]);
        if (!active) return;
        const assets = (assetsRes as Asset[]).map(a => ({ type: 'asset', id: a.id, name: a.name }));
        const works = (workRes as WorkOrder[]).map(w => ({ type: 'workorder', id: w.id, title: w.title }));
        setResults([...assets, ...works]);
        setSelected(0);
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setSelected(0);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      const r = results[selected];
      if (r.type === 'asset') navigate(`/assets/${r.id}`);
      else navigate(`/work-orders/${r.id}`);
      onOpenChange(false);
    } else if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="space-y-4" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border rounded px-2 py-1">
          <Search size={16} />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search..."
            className="ml-2 flex-1 bg-transparent outline-none"
          />
        </div>
        <ul className="max-h-60 overflow-y-auto">
          {results.map((r, idx) => (
            <li
              key={`${r.type}-${r.id}`}
              className={`flex items-center px-2 py-1 cursor-pointer ${idx === selected ? 'bg-neutral-100 dark:bg-neutral-700' : ''}`}
            >
              {r.type === 'asset' ? <Package size={16} className="mr-2" /> : <ClipboardList size={16} className="mr-2" />}
              <span>{r.type === 'asset' ? r.name : r.title}</span>
            </li>
          ))}
          {query && results.length === 0 && (
            <li className="px-2 py-1 text-sm text-neutral-500">No results</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
