import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Warehouse, Settings, X, TrendingUp, Activity } from 'lucide-react';
import ExistingSidebar from '@/components/layout/Sidebar';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const mobileLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/work-orders', label: 'Work Orders', icon: ClipboardList },
  { to: '/assets', label: 'Assets', icon: Warehouse },
  { to: '/analytics/reliability', label: 'Reliability', icon: TrendingUp },
  { to: '/integrations/catalog', label: 'Integrations', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <ExistingSidebar collapsed={collapsed} />
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation drawer">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />
          <aside className="relative z-10 h-full w-72 border-r border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 text-[var(--wp-color-text)] shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wide text-[var(--wp-color-text-muted)]">WorkPro</span>
              <button type="button" onClick={onCloseMobile} className="rounded-md p-2 hover:bg-black/5" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {mobileLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-[var(--wp-color-primary)] text-white'
                        : 'text-[var(--wp-color-text)] hover:bg-black/5'
                    }`
                  }
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
