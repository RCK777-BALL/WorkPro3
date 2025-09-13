/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

import Header from './Header';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';


export default function Layout() {
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
      <RightPanel />
    </div>
  );
}
