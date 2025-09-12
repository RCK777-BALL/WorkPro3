/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import { Command, Menu as MenuIcon, User } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import ThemeToggle from '@common/ThemeToggle';
import { useAuthStore, type AuthState } from '@/store/authStore';

interface NavItem {
  label: string;
  to: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', roles: ['admin', 'manager', 'technician', 'viewer'] },
  { label: 'Analytics', to: '/dashboard/analytics', roles: ['admin', 'manager'] },
  { label: 'Reports', to: '/dashboard/reports', roles: ['admin', 'manager'] },
  { label: 'Departments', to: '/departments', roles: ['admin', 'manager'] },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const user = useAuthStore((s: AuthState) => s.user);
  const logout = useAuthStore((s: AuthState) => s.logout);
  const location = useLocation();

  const items = navItems.filter((n) => n.roles.includes(user?.role ?? 'viewer'));
  const segments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = segments.map((seg, idx) => {
    const to = '/' + segments.slice(0, idx + 1).join('/');
    return (
      <li key={to} className="flex items-center gap-1">
        <Link to={to} className="capitalize hover:underline">
          {seg}
        </Link>
        {idx < segments.length - 1 && <span>/</span>}
      </li>
    );
  });

  return (
    <div className="flex h-screen">
      <aside
        className={`fixed inset-y-0 z-20 w-64 transform border-r bg-gray-50 p-4 transition-transform sm:relative sm:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <nav className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block rounded px-2 py-1 text-sm hover:bg-gray-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <button
              className="p-2 sm:hidden"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center text-sm text-gray-600">
                {breadcrumbs.length ? breadcrumbs : <li>Home</li>}
              </ol>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2"
              onClick={() => setCommandOpen(true)}
              aria-label="Open command palette"
            >
              <Command className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <div className="relative">
              <button
                className="flex items-center gap-1 p-2"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <User className="h-4 w-4" />
                <span className="text-sm">{user?.name ?? 'User'}</span>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded border bg-white shadow">
                  <div className="px-4 py-2 text-sm font-medium">
                    {user?.name ?? 'Account'}
                  </div>
                  <Link
                    to="/settings"
                    className="block px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>

      {commandOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded bg-white p-4 shadow">
            <div className="mb-2 text-lg font-semibold">Command palette</div>
            <p className="text-sm">Command palette placeholder</p>
            <button
              className="mt-4 rounded bg-gray-200 px-4 py-2 text-sm"
              onClick={() => setCommandOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

