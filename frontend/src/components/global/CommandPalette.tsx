/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "lucide-react";

type CommandAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

const COMMANDS: CommandAction[] = [
  { id: "new-work-order", label: "New work order", description: "Start a maintenance request", href: "/work-orders/new" },
  { id: "calendar", label: "Maintenance calendar", description: "Open the PM scheduler", href: "/maintenance" },
  { id: "inventory", label: "Inventory dashboard", description: "Review parts and stock levels", href: "/inventory" },
  { id: "reports", label: "Monthly reports", description: "Analyze KPIs and downtime", href: "/reports" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return COMMANDS;
    return COMMANDS.filter((command) =>
      [command.label, command.description].some((value) => value.toLowerCase().includes(trimmed)),
    );
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/80 px-4 py-12 backdrop-blur" role="dialog" aria-modal>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-xl">
        <header className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200">
          <Command className="h-4 w-4" />
          Quick command palette
        </header>
        <div className="border-b border-slate-800 px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to filter commands"
            className="w-full border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto px-2 py-3 text-sm">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-slate-400">No commands match that search.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((command) => (
                <li key={command.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(command.href);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-slate-200 transition hover:bg-slate-800 hover:text-slate-50 focus:bg-slate-800 focus:outline-none"
                  >
                    <span className="block font-medium text-slate-100">{command.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {command.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
