/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';

type NavItem = {
  id: string;
  label: string;
  onSelect: () => void;
  badge?: number;
};

const useBreakpoint = () => {
  const [width, setWidth] = useState<number>(() => (typeof window === 'undefined' ? 768 : window.innerWidth));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isTablet = width >= 768;
  return { isTablet };
};

const DrawerOverlay: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-30 flex touch-none bg-black/40" onClick={onClose} role="presentation">
      <div
        className="min-w-[16rem] max-w-[18rem] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal
      >
        {children}
      </div>
    </div>
  );
};

const DrawerNav: React.FC<{ title: string; items: NavItem[]; onClose: () => void }> = ({ title, items, onClose }) => (
  <div className="flex h-full flex-col gap-4 p-4 text-neutral-900">
    <header className="flex items-center justify-between">
      <p className="text-lg font-semibold">{title}</p>
      <button className="rounded bg-neutral-100 px-3 py-2 text-sm" onClick={onClose} aria-label="Close navigation">
        Close
      </button>
    </header>
    <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
      {items.map((item) => (
        <button
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:border-blue-300 active:scale-[0.98]"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
        >
          <span>{item.label}</span>
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{item.badge}</span>
          )}
        </button>
      ))}
    </nav>
  </div>
);

const Sidebar: React.FC<{ title: string; items: NavItem[] }> = ({ title, items }) => (
  <aside className="hidden h-full w-64 shrink-0 flex-col gap-3 border-r border-neutral-200 bg-white p-4 md:flex">
    <p className="text-lg font-semibold text-neutral-900">{title}</p>
    <nav className="flex flex-col gap-2" aria-label="Tablet navigation">
      {items.map((item) => (
        <button
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:border-blue-300"
          onClick={item.onSelect}
        >
          <span>{item.label}</span>
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{item.badge}</span>
          )}
        </button>
      ))}
    </nav>
  </aside>
);

interface MobileShellProps {
  title: string;
  navItems: NavItem[];
  children: React.ReactNode;
  rightRail?: React.ReactNode;
}

export const ResponsiveMobileShell: React.FC<MobileShellProps> = ({ title, navItems, children, rightRail }) => {
  const { isTablet } = useBreakpoint();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const nav = useMemo(() => navItems, [navItems]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900 md:flex-row" data-testid="responsive-shell">
      {isTablet && <Sidebar title={title} items={nav} />}
      {!isTablet && (
        <>
          <DrawerOverlay isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
            <DrawerNav title={title} items={nav} onClose={() => setIsDrawerOpen(false)} />
          </DrawerOverlay>
          <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 shadow-sm">
            <button
              className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold active:scale-[0.98]"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open navigation drawer"
            >
              Menu
            </button>
            <p className="text-base font-semibold">{title}</p>
            <div className="h-9 w-9 rounded-full bg-blue-100" aria-hidden />
          </header>
        </>
      )}

      <main className="flex w-full flex-col gap-3 p-4 md:flex-row">
        <section className="flex-1 space-y-4 rounded-lg bg-white p-4 shadow-sm">{children}</section>
        {rightRail && <section className="md:w-80 md:shrink-0 md:space-y-3">{rightRail}</section>}
      </main>
    </div>
  );
};

export default ResponsiveMobileShell;
