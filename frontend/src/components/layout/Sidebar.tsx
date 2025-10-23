/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ClipboardList,
  FileStack,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Settings,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import clsx from "clsx";

type SidebarProps = {
  collapsed?: boolean;
};

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

const navigation: NavItem[] = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
  { label: "Work Orders", to: "/work-orders", icon: ClipboardList },
  { label: "Maintenance", to: "/maintenance", icon: FolderKanban },
  { label: "Assets", to: "/assets", icon: Warehouse },
  { label: "Departments", to: "/departments", icon: Building2 },
  { label: "Inventory", to: "/inventory", icon: MapPin },
  { label: "Teams", to: "/teams", icon: Users },
  { label: "Analytics", to: "/analytics", icon: BarChart3 },
  { label: "Reports", to: "/reports", icon: FileStack },
  { label: "Vendors", to: "/vendors", icon: Briefcase },
  { label: "Messages", to: "/messages", icon: MessageSquare },
  { label: "Documentation", to: "/documentation", icon: BookOpen },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Imports", to: "/imports", icon: Activity },
];

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const groups = useMemo(() => {
    return [
      {
        id: "primary",
        title: "Operations",
        items: navigation.slice(0, 7),
      },
      {
        id: "secondary",
        title: "Management",
        items: navigation.slice(7),
      },
    ];
  }, []);

  const containerClasses = clsx(
    "hidden shrink-0 border-r border-neutral-200 bg-white/60 backdrop-blur-lg transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-900/60 lg:flex",
    collapsed ? "w-20" : "w-64",
  );

  return (
    <aside className={containerClasses}>
      <div className={clsx("flex h-full w-full flex-col gap-6 py-6", collapsed ? "px-3" : "px-5")}>
        <div
          className={clsx(
            "flex items-center gap-2 text-neutral-900 dark:text-neutral-100 transition-all",
            collapsed && "flex-col gap-1",
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 font-semibold text-white">
            WP
          </span>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">WorkPro</p>
              <p className="text-lg font-semibold">Command Center</p>
            </div>
          )}
        </div>

        <nav className={clsx("flex-1 text-sm", collapsed ? "space-y-6" : "space-y-8")}>
          {groups.map((group) => (
            <div key={group.id} className={clsx("space-y-3", collapsed && "space-y-2")}>
              {!collapsed && (
                <p className="px-2 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {group.title}
                </p>
              )}
              <ul className={clsx("space-y-1", collapsed && "space-y-1.5")}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          clsx(
                            "flex items-center rounded-xl px-3 py-2 transition",
                            collapsed ? "justify-center" : "gap-3",
                            isActive
                              ? "bg-primary-600 text-white shadow"
                              : "text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-primary-500/10 dark:hover:text-primary-100",
                          )
                        }
                      >
                        <Icon className="h-5 w-5" />
                        {!collapsed && <span className="font-medium">{item.label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">Need help?</p>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              Visit the documentation or contact support to keep the operation running smoothly.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
