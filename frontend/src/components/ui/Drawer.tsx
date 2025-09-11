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
        className={`absolute right-0 top-0 h-full bg-white shadow-xl transform transition-transform ${widthClass} ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="px-4 py-3 border-b flex items-center justify-between">
          {title && <h3 className="font-semibold">{title}</h3>}
          <button aria-label="Close" onClick={onClose} className="text-neutral-500 hover:text-neutral-700">
            ✕
          </button>
        </header>
        <div className="p-4 overflow-auto h-[calc(100%-3.5rem)]">{children}</div>
      </aside>
    </div>
  );

  return createPortal(drawer, portalRef.current);
}
