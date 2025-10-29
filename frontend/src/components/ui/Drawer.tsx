/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClass?: string;
}

export default function Drawer({ open, onClose, title, children, widthClass = 'max-w-md w-full' }: Props) {
  const portalRef = useRef<HTMLDivElement | null>(
    typeof document !== 'undefined' ? document.createElement('div') : null
  );

  // append portal container to body
  useEffect(() => {
    const el = portalRef.current;
    if (!el) return;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  // lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!portalRef.current) return null;

  const drawer = (
    <div className={`fixed inset-0 z-[1000] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full border-l border-slate-800 bg-slate-900 text-slate-100 shadow-xl transition-transform ${widthClass} ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
          {title && <h3 className="font-semibold text-slate-100">{title}</h3>}
          <button aria-label="Close" onClick={onClose} className="text-slate-400 transition hover:text-slate-200">
            ✕
          </button>
        </header>
        <div className="h-[calc(100%-3.5rem)] overflow-auto p-4">{children}</div>
      </aside>
    </div>
  );

  return createPortal(drawer, portalRef.current);
}
