/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Factory,
  FileStack,
  FolderKanban,
  GitBranch,
  Globe2,
  Inbox,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  MessageSquare,
  ScrollText,
  Scan,
  Settings,
  Users,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import clsx from "clsx";

import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/auth/usePermissions";
import type { PermissionScope, PermissionAction } from "@/auth/permissions";
import {
  defaultOrder,
  useNavigationStore,
  type NavItemId,
} from "@/store/navigationStore";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";

type SidebarProps = {
  collapsed?: boolean;
};

type NavSection = "plant" | "operations" | "management";

type NavItem = {
  id: NavItemId;
  label: string;
  to: string;
  icon: LucideIcon;
  section: NavSection;
  permission?: { scope: PermissionScope; action: PermissionAction };
};

const sections: { id: NavSection; title: string }[] = [
  { id: "plant", title: "Plant Management" },
  { id: "operations", title: "Operations" },
  { id: "analytics", title: "Analytics" },
  { id: "management", title: "Administration" },
];

const navItems: Record<NavItemId, NavItem> = {
  dashboard: {
    id: "dashboard",
    label: "Overview",
    to: "/dashboard",
    icon: LayoutDashboard,
    section: "plant",
  },
  "work-orders": {
    id: "work-orders",
    label: "Work Orders",
    to: "/work-orders",
    icon: ClipboardList,
    section: "operations",
  },
  "work-requests": {
    id: "work-requests",
    label: "Work Requests",
    to: "/work-requests",
    icon: Inbox,
    section: "operations",
    permission: { scope: "workRequests", action: "read" },
  },
  permits: {
    id: "permits",
    label: "Permits",
    to: "/permits",
    icon: CheckCircle2,
    section: "operations",
  },
  maintenance: {
    id: "maintenance",
    label: "Maintenance",
    to: "/maintenance",
    icon: FolderKanban,
    section: "operations",
  },
  assets: {
    id: "assets",
    label: "Assets",
    to: "/assets",
    icon: Warehouse,
    section: "plant",
    permission: { scope: "hierarchy", action: "read" },
  },
  departments: {
    id: "departments",
    label: "Departments",
    to: "/departments",
    icon: Building2,
    section: "plant",
    permission: { scope: "hierarchy", action: "read" },
  },
  lines: {
    id: "lines",
    label: "Lines",
    to: "/lines",
    icon: GitBranch,
    section: "plant",
    permission: { scope: "hierarchy", action: "read" },
  },
  stations: {
    id: "stations",
    label: "Stations",
    to: "/stations",
    icon: Scan,
    section: "plant",
    permission: { scope: "hierarchy", action: "read" },
  },
  inventory: {
    id: "inventory",
    label: "Inventory",
    to: "/inventory",
    icon: MapPin,
    section: "operations",
    permission: { scope: "inventory", action: "read" },
  },
  teams: {
    id: "teams",
    label: "Teams",
    to: "/teams",
    icon: Users,
    section: "plant",
    permission: { scope: "hierarchy", action: "read" },
  },
  analytics: {
    id: "analytics",
    label: "Plant Analytics",
    to: "/analytics",
    icon: BarChart3,
    section: "analytics",
  },
  "analytics-global": {
    id: "analytics-global",
    label: "Global Analytics",
    to: "/analytics/global",
    icon: Globe2,
    section: "analytics",
  },
  "analytics-ai": {
    id: "analytics-ai",
    label: "AI Insights",
    to: "/analytics/ai",
    icon: Cpu,
    section: "analytics",
  },
  reports: {
    id: "reports",
    label: "Reports",
    to: "/reports",
    icon: FileStack,
    section: "plant",
  },
  vendors: {
    id: "vendors",
    label: "Vendors",
    to: "/vendors",
    icon: Briefcase,
    section: "management",
    permission: { scope: "inventory", action: "read" },
  },
  messages: {
    id: "messages",
    label: "Messages",
    to: "/messages",
    icon: MessageSquare,
    section: "management",
  },
  documentation: {
    id: "documentation",
    label: "Documentation",
    to: "/documentation",
    icon: BookOpen,
    section: "management",
  },
  settings: {
    id: "settings",
    label: "Settings",
    to: "/settings",
    icon: Settings,
    section: "management",
  },
  imports: {
    id: "imports",
    label: "Imports",
    to: "/imports",
    icon: Activity,
    section: "management",
    permission: { scope: "importExport", action: "import" },
  },
  audit: {
    id: "audit",
    label: "Audit Logs",
    to: "/admin/audit",
    icon: ScrollText,
    section: "management",
  },
};

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAuthenticated = Boolean(user);
  const { sidebarOrder, moveSidebarItem } = useNavigationStore();
  const { can } = usePermissions();

  const [activeId, setActiveId] = useState<NavItemId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const groups = useMemo(() => {
    const order = sidebarOrder.filter((id): id is NavItemId => Boolean(navItems[id]));
    const resolvedOrder = order.length > 0 ? order : defaultOrder;
    const uniqueOrder = Array.from(new Set(resolvedOrder));
    const completedOrder = [
      ...uniqueOrder,
      ...defaultOrder.filter((id) => !uniqueOrder.includes(id)),
    ];

    return sections.map((section) => ({
      ...section,
      items: completedOrder
        .map((id) => navItems[id])
        .filter((item) => item && item.section === section.id)
        .filter((item): item is NavItem =>
          Boolean(item) && (!item.permission || can(item.permission.scope, item.permission.action)),
        ),
    }));
  }, [sidebarOrder, can]);

  const containerClasses = clsx(
    "hidden shrink-0 border-r border-neutral-200 bg-white/60 backdrop-blur-lg transition-all duration-300 dark:border-neutral-800 dark:bg-neutral-900/60 lg:flex",
    collapsed ? "w-20" : "w-64",
  );

  const handleAuthAction = useCallback(async () => {
    if (isAuthenticated) {
      await logout();
    }
    navigate("/login");
  }, [isAuthenticated, logout, navigate]);

  const AuthIcon = isAuthenticated ? LogOut : LogIn;
  const authLabel = isAuthenticated ? "Log out" : "Log in";

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active?.id;
    if (typeof id === "string") {
      setActiveId(id as NavItemId);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      if (!over || active.id === over.id) return;

      const activeId = active.id as NavItemId;
      const overId = over.id as NavItemId;

      if (!navItems[activeId] || !navItems[overId]) return;
      if (navItems[activeId].section !== navItems[overId].section) return;

      moveSidebarItem(activeId, overId);
    },
    [moveSidebarItem],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToParentElement, restrictToVerticalAxis]}
          >
            {groups.map((group) => (
              <div key={group.id} className={clsx("space-y-3", collapsed && "space-y-2")}>
                {!collapsed && (
                  <p className="px-2 text-xs font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {group.title}
                  </p>
                )}
                <SortableContext items={group.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  <ul className={clsx("space-y-1", collapsed && "space-y-1.5")}>
                    {group.items.map((item) => (
                      <SortableSidebarItem
                        key={item.id}
                        item={item}
                        collapsed={collapsed}
                        isActive={activeId === item.id}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </div>
            ))}
          </DndContext>
        </nav>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              void handleAuthAction();
            }}
            className={clsx(
              "flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
              collapsed ? "justify-center" : "gap-3",
              isAuthenticated
                ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                : "bg-primary-600 text-white hover:bg-primary-700",
            )}
            aria-label={authLabel}
            title={authLabel}
          >
            <AuthIcon className="h-5 w-5" />
            {!collapsed && <span>{authLabel}</span>}
          </button>

          {!collapsed && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <p className="font-medium text-neutral-900 dark:text-neutral-100">Need help?</p>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">
                Visit the documentation or contact support to keep the operation running smoothly.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

type SortableSidebarItemProps = {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
};

function SortableSidebarItem({ item, collapsed, isActive }: SortableSidebarItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    style.zIndex = 10;
  }

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <NavLink
        to={item.to}
        title={collapsed ? item.label : undefined}
        className={({ isActive: linkActive }) =>
          clsx(
            "flex items-center rounded-xl px-3 py-2 transition cursor-grab active:cursor-grabbing touch-manipulation",
            collapsed ? "justify-center" : "gap-3",
            linkActive
              ? "bg-primary-600 text-white shadow"
              : "text-neutral-600 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-primary-500/10 dark:hover:text-primary-100",
            (isDragging || isActive) && "ring-2 ring-primary-400 dark:ring-primary-500",
          )
        }
      >
        <item.icon className="h-5 w-5" />
        {!collapsed && <span className="font-medium">{item.label}</span>}
      </NavLink>
    </li>
  );
}
