import React from 'react';
import { Menu } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useSettingsStore } from '@/store/settingsStore';

interface TopbarProps {
  onToggleMobileSidebar: () => void;
}

export default function Topbar({ onToggleMobileSidebar }: TopbarProps) {
  const sidebarCollapsed = useSettingsStore((state) => state.theme.sidebarCollapsed);
  const setTheme = useSettingsStore((state) => state.setTheme);

  return (
    <div className="border-b border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]">
      <div className="flex items-center justify-between px-3 py-2 lg:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onToggleMobileSidebar}
          className="rounded-lg border border-[var(--wp-color-border)] p-2 text-[var(--wp-color-text)] hover:bg-black/5"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold tracking-wide text-[var(--wp-color-text)]">WorkPro</span>
      </div>
      <div className="hidden px-3 py-2 lg:flex">
        <button
          type="button"
          onClick={() => setTheme({ sidebarCollapsed: !sidebarCollapsed })}
          className="rounded-lg border border-[var(--wp-color-border)] px-3 py-1.5 text-xs font-semibold text-[var(--wp-color-text-muted)] hover:bg-black/5"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        </button>
      </div>
      <Header />
    </div>
  );
}
