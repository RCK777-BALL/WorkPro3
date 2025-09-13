/*
 * SPDX-License-Identifier: MIT
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

import { useAuthStore, type AuthState } from '@/store/authStore';

interface NavItem {
  label: string;
  to: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', roles: ['admin', 'manager', 'technician', 'viewer'] },
  { label: 'Analytics', to: '/analytics', roles: ['admin', 'manager'] },
  { label: 'Reports', to: '/reports', roles: ['admin', 'manager'] },
  { label: 'Imports', to: '/imports', roles: ['admin', 'manager'] },
  { label: 'Departments', to: '/departments', roles: ['admin', 'manager'] },
];

interface SidebarProps {
  open?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ open = false }) => {
  const user = useAuthStore((s: AuthState) => s.user);
  const items = navItems.filter((n) => n.roles.includes(user?.role ?? 'tech'));
  const location = useLocation();

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 z-30 w-64 border-r bg-white p-4 transition-transform lg:relative lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="mb-6 px-2 text-2xl font-bold text-primary-600">WORKPRO</div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={clsx(
              'block rounded px-3 py-2 text-sm font-medium hover:bg-neutral-100',
              location.pathname.startsWith(item.to) && 'bg-neutral-200'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

