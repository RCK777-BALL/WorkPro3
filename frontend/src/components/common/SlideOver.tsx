/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function SlideOver({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* panel */}
      <aside
        className={`dark absolute right-0 top-0 h-full w-full max-w-xl bg-neutral-950 text-white shadow-2xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-5 py-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md bg-neutral-900 p-1.5 text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
          >
            ✕
          </button>
        </header>
        <div className="h-[calc(100%-4rem-4rem)] overflow-auto bg-neutral-950 px-5 py-5">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-neutral-800 bg-neutral-950 px-5 py-4">{footer}</footer>
      </aside>
    </div>
  );
}
