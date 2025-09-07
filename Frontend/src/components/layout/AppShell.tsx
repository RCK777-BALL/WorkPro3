import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type Props = { children: ReactNode };

export default function AppShell({ children }: Props) {
  const { pathname } = useLocation();
  const isActive = (p: string) =>
    pathname === p ? "bg-neutral-200/60 dark:bg-neutral-800" : "hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/80 dark:bg-neutral-900/80 backdrop-blur">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="font-semibold">WorkPro</Link>
          <nav className="text-sm space-x-4">
            <Link className={`rounded px-3 py-1 transition ${isActive("/dashboard")}`} to="/dashboard">Dashboard</Link>
            <Link className={`rounded px-3 py-1 transition ${isActive("/departments")}`} to="/departments">Departments</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
