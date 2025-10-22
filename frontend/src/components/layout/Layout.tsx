/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Header from './Header';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import CommandPalette from '@/components/global/CommandPalette';
import { useTheme } from '@/context/ThemeContext';

export default function Layout() {
  const { pathname } = useLocation();
  const { backgroundColor, textColor } = useTheme();
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot');

  if (isAuthRoute) {
    return <Outlet />;
  }

  return (
    <div
      className="relative min-h-screen transition-colors duration-300"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-500/30 blur-3xl" />
        <div className="absolute bottom-[-40%] left-1/2 h-80 w-[32rem] -translate-x-1/2 rounded-full bg-primary-700/20 blur-3xl" />
        <div className="absolute top-1/2 right-[-25%] h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-sky-500/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_55%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <CommandPalette />
          <Header />
          <main className="flex-1 overflow-y-auto px-6 pb-10 pt-6 md:px-10">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
              <Outlet />
            </div>
          </main>
        </div>
        <RightPanel />
      </div>
    </div>
  );
}
