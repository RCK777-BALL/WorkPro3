import React, { useState } from 'react';
import CommandPalette from '@/components/global/CommandPalette';
import RightPanel from '@/components/layout/RightPanel';
import Breadcrumbs from './Breadcrumbs';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import PageContainer from './PageContainer';

interface AppShellProps {
  children: React.ReactNode;
  sidebarCollapsed: boolean;
  denseMode?: boolean;
}

export default function AppShell({ children, sidebarCollapsed, denseMode = false }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[var(--wp-color-background)] text-[var(--wp-color-text)] transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-10%,rgba(217,93,57,0.14),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(14,138,135,0.12),transparent_35%)]" />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar collapsed={sidebarCollapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <CommandPalette />
          <Topbar onToggleMobileSidebar={() => setMobileOpen(true)} />
          <main className={`flex-1 overflow-y-auto ${denseMode ? 'py-2' : 'py-4'}`}>
            <PageContainer>
              <div className="flex flex-col gap-6">
                <Breadcrumbs />
                {children}
              </div>
            </PageContainer>
          </main>
        </div>

        <RightPanel />
      </div>
    </div>
  );
}
