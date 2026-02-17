/*
 * SPDX-License-Identifier: MIT
 */

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import clsx from 'clsx';

import { useAlerts } from '@/hooks/useAlerts';

export default function AlertBell() {
  const alerts = useAlerts();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  const unread = alerts.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] text-[var(--wp-color-text)] transition',
          'hover:border-[var(--wp-color-border-strong)] hover:bg-[var(--wp-color-surface-elevated)]',
        )}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-2 shadow-lg">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--wp-color-text-muted)]">
            AI Alerts
          </h4>
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm text-[var(--wp-color-text)]">
            {alerts.slice(0, 10).map((alert) => (
              <li
                key={alert._id}
                className="rounded border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-2"
              >
                <p className="text-xs uppercase text-[var(--wp-color-text-muted)]">{alert.plant}</p>
                <p>{alert.message}</p>
              </li>
            ))}
            {alerts.length === 0 && (
              <li className="text-xs text-[var(--wp-color-text-muted)]">No alerts.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
