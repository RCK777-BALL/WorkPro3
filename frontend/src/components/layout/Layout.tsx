/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import CommandPalette from '@/components/global/CommandPalette';

export default function Layout() {
  return (
    <>
      <CommandPalette />
      <div className="flex h-screen">
        <Sidebar />

        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
        <RightPanel />
      </div>
    </>
  );
}
