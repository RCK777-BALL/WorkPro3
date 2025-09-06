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
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* panel */}
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl
          transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-modal="true"
      >
        <header className="px-5 py-4 border-b flex items-center justify-between bg-slate-50">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-700">✕</button>
        </header>
        <div className="p-5 overflow-auto h-[calc(100%-4rem-4rem)]">{children}</div>
        <footer className="px-5 py-4 border-t bg-slate-50 flex justify-end gap-2">{footer}</footer>
      </aside>
    </div>
  );
}
