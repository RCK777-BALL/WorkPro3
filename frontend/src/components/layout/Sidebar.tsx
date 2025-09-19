/*
 * SPDX-License-Identifier: MIT
 */

import { NavLink } from 'react-router-dom';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/permits', label: 'Safety Permits' },
  { to: '/workorders', label: 'Work Orders' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-neutral-50 p-4">
      <nav className="space-y-2 text-sm font-medium text-neutral-700">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block rounded px-3 py-2 transition hover:bg-neutral-100 ${isActive ? 'bg-neutral-200 text-neutral-900' : ''}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

