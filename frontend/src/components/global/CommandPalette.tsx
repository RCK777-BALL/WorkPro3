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
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[color-mix(in_srgb,var(--wp-color-background)_80%,transparent)] px-4 py-12 backdrop-blur" role="dialog" aria-modal>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] text-[var(--wp-color-text)] shadow-xl">
        <header className="flex items-center gap-2 border-b border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-4 py-3 text-sm font-medium text-[var(--wp-color-text)]">
          <Command className="h-4 w-4" />
          Quick command palette
        </header>
        <div className="border-b border-[var(--wp-color-border)] px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to filter commands"
            className="w-full border-none bg-transparent text-sm text-[var(--wp-color-text)] placeholder:text-[var(--wp-color-text-muted)] focus:outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto px-2 py-3 text-sm">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-[var(--wp-color-text-muted)]">No commands match that search.</p>
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
                    className="w-full rounded-xl px-3 py-2 text-left text-[var(--wp-color-text)] transition hover:bg-[var(--wp-color-surface-elevated)] focus:bg-[var(--wp-color-surface-elevated)] focus:outline-none"
                  >
                    <span className="block font-medium text-[var(--wp-color-text)]">{command.label}</span>
                    <span className="mt-0.5 block text-xs text-[var(--wp-color-text-muted)]">
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
