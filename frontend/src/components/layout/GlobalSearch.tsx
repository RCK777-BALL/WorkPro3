/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Command, Search } from "lucide-react";

import clsx from "clsx";

type GlobalSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchAction = {
  id: string;
  label: string;
  description: string;
  href: string;
  shortcut?: string;
};

const ACTIONS: SearchAction[] = [
  {
    id: "work-orders",
    label: "Create work order",
    description: "Open the new work order form",
    href: "/work-orders/new",
    shortcut: "W",
  },
  {
    id: "assets",
    label: "Assets",
    description: "Browse all assets",
    href: "/assets",
    shortcut: "A",
  },
  {
    id: "reports",
    label: "Reports",
    description: "View compliance and downtime reports",
    href: "/reports",
    shortcut: "R",
  },
  {
    id: "vendors",
    label: "Vendors",
    description: "Manage vendor and supplier records",
    href: "/vendors",
    shortcut: "V",
  },
];

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onOpenChange]);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return ACTIONS;
    return ACTIONS.filter((action) =>
      [action.label, action.description].some((value) => value.toLowerCase().includes(trimmed)),
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 p-6 backdrop-blur" role="dialog" aria-modal>
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search destinations, commands, or modules"
            className="flex-1 border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400 transition hover:text-slate-200"
          >
            Esc
          </button>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-slate-400">No results. Try a different keyword.</li>
          ) : (
            results.map((action) => (
              <li key={action.id}>
                <Link
                  to={action.href}
                  onClick={() => onOpenChange(false)}
                  className={clsx(
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200",
                    "hover:bg-slate-800 hover:text-slate-50 focus:bg-slate-800 focus:outline-none",
                  )}
                >
                  <span>
                    <span className="block font-medium text-slate-100">{action.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {action.description}
                    </span>
                  </span>
                  {action.shortcut ? (
                    <kbd className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[10px] uppercase text-slate-300">
                      <Command className="h-3 w-3" />
                      {action.shortcut}
                    </kbd>
                  ) : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
