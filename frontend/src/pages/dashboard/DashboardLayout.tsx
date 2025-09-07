import { NavLink, Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-neutral-100 dark:bg-neutral-900 p-4">
        <nav className="space-y-2">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${
                isActive
                  ? 'bg-neutral-200 dark:bg-neutral-800'
                  : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/dashboard/analytics"
            className={({ isActive }) =>
              `block px-3 py-2 rounded ${
                isActive
                  ? 'bg-neutral-200 dark:bg-neutral-800'
                  : 'hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`
            }
          >
            Analytics
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}

