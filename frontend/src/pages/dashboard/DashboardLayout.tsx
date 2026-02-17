/*
 * SPDX-License-Identifier: MIT
 */

import { NavLink, Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 p-4 border-r">
        <nav className="space-y-2">
          <NavLink to="/dashboard" end>Dashboard</NavLink>
          <NavLink to="/dashboard/analytics">Analytics</NavLink>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}

