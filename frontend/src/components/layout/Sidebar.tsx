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
  ListChecks,
  Package,
  Factory,
  FileStack,
  FolderKanban,
  GitBranch,
  Globe2,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  Bell,
  AlertTriangle,
  MapPin,
  MessageSquare,
  ScrollText,
  Scan,
  Send,
  Settings,
  GripVertical,
  TrendingUp,
  Users,
  Warehouse,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import clsx from "clsx";

import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/auth/usePermissions";
import type { Permission } from "@/auth/permissions";
import {
  defaultOrder,
  useNavigationStore,
  type NavItemId,
} from "@/store/navigationStore";
import { useAlertsQuery } from "@/features/inventory";
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

type NavSection = "plant" | "operations" | "analytics" | "management";

type NavItem = {
  id: NavItemId;
  label: string;
  to: string;
  icon: LucideIcon;
  section: NavSection;
  permission?: Permission;
  badge?: number;
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
    permission: "workRequests.read",
  },
  "work-request-portal": {
    id: "work-request-portal",
    label: "Work Request Portal",
    to: "/public/request",
    icon: Send,
    section: "operations",
    permission: "workRequests.read",
  },
  parts: {
    id: "parts",
    label: "Parts",
    to: "/inventory/parts",
    icon: Package,
    section: "operations",
    permission: "inventory.read",
  },
  "inventory-locations": {
    id: "inventory-locations",
    label: "Locations",
    to: "/inventory/locations",
    icon: MapPin,
    section: "operations",
    permission: "inventory.read",
  },
  permits: {
    id: "permits",
    label: "Permits",
    to: "/permits",
    icon: CheckCircle2,
    section: "operations",
  },
  "pm-templates": {
    id: "pm-templates",
    label: "PM Templates",
    to: "/pm/templates",
    icon: ListChecks,
    section: "operations",
    permission: "pm.read",
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
    permission: "hierarchy.read",
  },
  "asset-scan": {
    id: "asset-scan",
    label: "Scan Assets",
    to: "/assets/scan",
    icon: Scan,
    section: "operations",
    permission: "hierarchy.read",
  },
  departments: {
    id: "departments",
    label: "Departments",
    to: "/departments",
    icon: Building2,
    section: "plant",
    permission: "hierarchy.read",
  },
  lines: {
    id: "lines",
    label: "Lines",
    to: "/lines",
    icon: GitBranch,
    section: "plant",
    permission: "hierarchy.read",
  },
  stations: {
    id: "stations",
    label: "Stations",
    to: "/stations",
    icon: Scan,
    section: "plant",
    permission: "hierarchy.read",
  },
  inventory: {
    id: "inventory",
    label: "Inventory Hub",
    to: "/inventory",
    icon: MapPin,
    section: "operations",
    permission: "inventory.read",
  },
  "inventory-analytics": {
    id: "inventory-analytics",
    label: "Inventory Analytics",
    to: "/inventory/analytics",
    icon: BarChart3,
    section: "operations",
    permission: "inventory.read",
  },
  "reorder-alerts": {
    id: "reorder-alerts",
    label: "Reorder Alerts",
    to: "/inventory/alerts",
    icon: AlertTriangle,
    section: "operations",
    permission: "inventory.read",
  },
  teams: {
    id: "teams",
    label: "Teams",
    to: "/teams",
    icon: Users,
    section: "plant",
    permission: "hierarchy.read",
  },
  analytics: {
    id: "analytics",
    label: "Plant Analytics",
    to: "/analytics",
    icon: BarChart3,
    section: "analytics",
  },
  "analytics-maintenance": {
    id: "analytics-maintenance",
    label: "Maintenance Dashboard",
    to: "/analytics/maintenance",
    icon: BarChart3,
    section: "analytics",
  },
  "pm-analytics": {
    id: "pm-analytics",
    label: "PM Analytics",
    to: "/analytics/pm",
    icon: TrendingUp,
    section: "analytics",
  },
  "iot-monitoring": {
    id: "iot-monitoring",
    label: "IoT Monitoring",
    to: "/iot",
    icon: Activity,
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
  executive: {
    id: "executive",
    label: "Executive Insights",
    to: "/executive",
    icon: Factory,
    section: "analytics",
    permission: "executive.read",
  },
  reports: {
    id: "reports",
    label: "Reports",
    to: "/reports",
    icon: FileStack,
    section: "plant",
  },
  downtime: {
    id: "downtime",
    label: "Downtime",
    to: "/downtime",
    icon: Activity,
    section: "operations",
    permission: "workOrders.read",
  },
  "downtime-events": {
    id: "downtime-events",
    label: "Downtime Events",
    to: "/downtime/events",
    icon: Activity,
    section: "operations",
    permission: "workOrders.read",
  },
  'purchase-orders': {
    id: 'purchase-orders',
    label: 'Purchase Orders',
    to: '/purchasing/purchase-orders',
    icon: Package,
    section: 'operations',
    permission: 'inventory.read',
  },
  vendors: {
    id: "vendors",
    label: "Vendors",
    to: "/vendors",
    icon: Briefcase,
    section: "operations",
    permission: "inventory.read",
  },
  messages: {
    id: "messages",
    label: "Messages",
    to: "/messages",
    icon: MessageSquare,
    section: "management",
  },
  "help-center": {
    id: "help-center",
    label: "Help Center",
    to: "/help",
    icon: LifeBuoy,
    section: "management",
  },
  "documentation-getting-started": {
    id: "documentation-getting-started",
    label: "Getting Started",
    to: "/documentation#getting-started",
    icon: BookOpen,
    section: "management",
  },
  "documentation-asset-management": {
    id: "documentation-asset-management",
    label: "Asset Management",
    to: "/documentation/asset-management",
    icon: Warehouse,
    section: "management",
  },
  settings: {
    id: "settings",
    label: "Settings",
    to: "/settings",
    icon: Settings,
    section: "management",
  },
  "notification-settings": {
    id: "notification-settings",
    label: "Notification Settings",
    to: "/notifications/settings",
    icon: Bell,
    section: "management",
  },
  imports: {
    id: "imports",
    label: "Imports",
    to: "/imports",
    icon: Activity,
    section: "management",
    permission: "importExport.import",
  },
  audit: {
    id: "audit",
    label: "Audit Logs",
    to: "/admin/audit",
    icon: ScrollText,
    section: "management",
    permission: "audit.read",
  },
};

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAuthenticated = Boolean(user);
  const {
    sidebarOrder,
    moveSidebarItem,
    pinnedItems,
    recentItems,
    pinItem,
    unpinItem,
    addRecentItem,
  } = useNavigationStore();
  const { can } = usePermissions();
  const alertsQuery = useAlertsQuery();

  const [activeId, setActiveId] = useState<NavItemId | null>(null);
  const [inventoryExpanded, setInventoryExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const navBadges: Partial<Record<NavItemId, number>> = useMemo(() => {
    const alerts = alertsQuery.data?.items ?? [];
    const openAlerts = alerts.filter((alert) => (alert.status ?? "open") === "open");
    return { "reorder-alerts": openAlerts.length };
  }, [alertsQuery.data]);

  const groups = useMemo(() => {
    const order = sidebarOrder.filter((id): id is NavItemId => Boolean(navItems[id]));
    const resolvedOrder = order.length > 0 ? order : defaultOrder;
    const uniqueOrder = Array.from(new Set(resolvedOrder));
    const completedOrder = [
      ...uniqueOrder,
      ...defaultOrder.filter((id) => !uniqueOrder.includes(id)),
    ];
    const hiddenInMainNav = new Set<NavItemId>(["parts", "inventory-locations"]);

    return sections.map((section) => ({
      ...section,
      items: completedOrder
        .map((id) => ({
          ...navItems[id],
          ...(navBadges[id] !== undefined ? { badge: navBadges[id] } : {}),
        }))
        .filter((item) => item && item.section === section.id)
        .filter((item) => !hiddenInMainNav.has(item.id))
        .filter((item) => !item.permission || can(item.permission)),
    }));
  }, [sidebarOrder, can, navBadges]);

  const inventoryChildren = useMemo<NavItem[]>(() => {
    const childIds: NavItemId[] = ["parts", "inventory-locations"];
    return childIds
      .map((id) => ({
        ...navItems[id],
        ...(navBadges[id] !== undefined ? { badge: navBadges[id] } : {}),
      }))
      .filter((item) => !item.permission || can(item.permission));
  }, [can, navBadges]);

  const pinnedNavItems = useMemo(
    () =>
      pinnedItems
        .map((id) => navItems[id])
        .filter((item): item is NavItem => Boolean(item))
        .filter((item) => !item.permission || can(item.permission)),
    [pinnedItems, can],
  );

  const recentNavItems = useMemo(
    () =>
      recentItems
        .filter((id) => !pinnedItems.includes(id))
        .map((id) => navItems[id])
        .filter((item): item is NavItem => Boolean(item))
        .filter((item) => !item.permission || can(item.permission)),
    [recentItems, pinnedItems, can],
  );

  const containerClasses = clsx(
    "hidden shrink-0 border-r border-neutral-800 bg-black text-white transition-all duration-300 lg:flex",
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
            "flex items-center gap-2 text-white transition-all",
            collapsed && "flex-col gap-1",
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-600 font-semibold text-white">
            WP
          </span>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/60">WorkPro</p>
              <p className="text-lg font-semibold text-white">Command Center</p>
            </div>
          )}
        </div>

        <nav className={clsx("flex-1 text-sm", collapsed ? "space-y-6" : "space-y-8")}>
          {(pinnedNavItems.length > 0 || recentNavItems.length > 0) && (
            <div className={clsx("space-y-4", collapsed && "space-y-3")}>
              {!collapsed && (
                <p className="px-2 text-xs font-medium uppercase tracking-wider text-white/50">
                  Pinned & recent
                </p>
              )}
              {pinnedNavItems.length > 0 && (
                <ul className={clsx("space-y-1", collapsed && "space-y-1.5")}>
                  {pinnedNavItems.map((item) => (
                    <SidebarNavItem
                      key={`pinned-${item.id}`}
                      item={item}
                      collapsed={collapsed}
                      pinned
                      onNavigate={(id) => addRecentItem(id)}
                      onTogglePin={(id) => unpinItem(id)}
                    />
                  ))}
                </ul>
              )}
              {recentNavItems.length > 0 && (
                <ul className={clsx("space-y-1", collapsed && "space-y-1.5")}>
                  {recentNavItems.map((item) => (
                    <SidebarNavItem
                      key={`recent-${item.id}`}
                      item={item}
                      collapsed={collapsed}
                      pinned={false}
                      onNavigate={(id) => addRecentItem(id)}
                      onTogglePin={(id) => pinItem(id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
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
                  <p className="px-2 text-xs font-medium uppercase tracking-wider text-white/50">
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
                        pinned={pinnedItems.includes(item.id)}
                        isPinned={(id) => pinnedItems.includes(id)}
                        onNavigate={(id) => addRecentItem(id)}
                        onTogglePin={(id) =>
                          pinnedItems.includes(id) ? unpinItem(id) : pinItem(id)
                        }
                        inventoryChildren={item.id === "inventory" ? inventoryChildren : undefined}
                        inventoryExpanded={inventoryExpanded}
                        onToggleInventory={() => setInventoryExpanded((prev) => !prev)}
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
                ? "bg-neutral-900 text-white hover:bg-neutral-800"
                : "bg-primary-600 text-white hover:bg-primary-700",
            )}
            aria-label={authLabel}
            title={authLabel}
          >
            <AuthIcon className="h-5 w-5" />
            {!collapsed && <span>{authLabel}</span>}
          </button>

          {!collapsed && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm shadow-sm">
              <p className="font-medium text-white">Need help?</p>
              <p className="mt-1 text-white/60">
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
  pinned: boolean;
  isPinned: (id: NavItemId) => boolean;
  onNavigate: (id: NavItemId) => void;
  onTogglePin: (id: NavItemId) => void;
  inventoryChildren?: NavItem[];
  inventoryExpanded?: boolean;
  onToggleInventory?: () => void;
};

function SortableSidebarItem({
  item,
  collapsed,
  isActive,
  pinned,
  isPinned,
  onNavigate,
  onTogglePin,
  inventoryChildren,
  inventoryExpanded = false,
  onToggleInventory,
}: SortableSidebarItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    style.zIndex = 10;
  }

  return (
    <li ref={setNodeRef} style={style} className="group relative space-y-1">
      <NavLink
        to={item.to}
        title={collapsed ? item.label : undefined}
        onClick={() => onNavigate(item.id)}
        className={({ isActive: linkActive }) =>
          clsx(
            "flex items-center rounded-xl px-3 py-2 transition touch-manipulation",
            collapsed ? "justify-center" : "gap-3",
            linkActive
              ? "bg-blue-600 text-white shadow"
              : "text-white/80 hover:bg-blue-900/40 hover:text-white",
            (isDragging || isActive) && "ring-2 ring-blue-400",
            isDragging ? "cursor-grabbing" : "cursor-pointer",
          )
        }
      >
        <item.icon className="h-5 w-5" />
        {!collapsed && (
          <span className="flex items-center gap-2 font-medium">
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-blue-800/60 px-2 py-0.5 text-xs font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </span>
        )}
        {!collapsed && inventoryChildren && (
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-white/60 transition hover:text-white"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleInventory?.();
            }}
            aria-label={inventoryExpanded ? "Collapse inventory links" : "Expand inventory links"}
          >
            {inventoryExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        {!collapsed && !inventoryChildren && (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className={clsx(
                "rounded-md p-1 text-white/40 transition hover:text-white",
                pinned && "text-yellow-300",
              )}
              aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTogglePin(item.id);
              }}
            >
              <Star className="h-4 w-4" />
            </button>
            <button
              type="button"
              ref={setActivatorNodeRef}
              className={clsx(
                "rounded-md p-1 text-white/40 transition group-hover:text-white",
                isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
              aria-label={`Reorder ${item.label}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </span>
        )}
        {collapsed && (
          <span className="ml-auto">
            <button
              type="button"
              ref={setActivatorNodeRef}
              className={clsx(
                "rounded-md p-1 text-white/40 transition group-hover:text-white",
                isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
              aria-label={`Reorder ${item.label}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </span>
        )}
      </NavLink>
      {!collapsed && inventoryChildren && inventoryExpanded && (
        <ul className="ml-8 space-y-1">
          {inventoryChildren.map((child) => (
            <SidebarNavItem
              key={child.id}
              item={child}
              collapsed={false}
              pinned={isPinned(child.id)}
              onNavigate={onNavigate}
              onTogglePin={onTogglePin}
              nested
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type SidebarNavItemProps = {
  item: NavItem;
  collapsed: boolean;
  pinned: boolean;
  nested?: boolean;
  onNavigate: (id: NavItemId) => void;
  onTogglePin: (id: NavItemId) => void;
};

function SidebarNavItem({
  item,
  collapsed,
  pinned,
  nested = false,
  onNavigate,
  onTogglePin,
}: SidebarNavItemProps) {
  return (
    <li className={clsx("group relative", nested && "pl-1")}>
      <NavLink
        to={item.to}
        title={collapsed ? item.label : undefined}
        onClick={() => onNavigate(item.id)}
        className={({ isActive }) =>
          clsx(
            "flex items-center rounded-xl px-3 py-2 transition",
            collapsed ? "justify-center" : "gap-3",
            isActive ? "bg-blue-600 text-white shadow" : "text-white/80 hover:bg-blue-900/40 hover:text-white",
            nested && "text-sm",
          )
        }
      >
        <item.icon className={clsx("h-4 w-4", nested ? "opacity-70" : "h-5 w-5")} />
        {!collapsed && (
          <span className="flex items-center gap-2 font-medium">
            {item.label}
            {item.badge ? (
              <span className="rounded-full bg-blue-800/60 px-2 py-0.5 text-xs font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </span>
        )}
        {!collapsed && (
          <span className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className={clsx(
                "rounded-md p-1 text-white/40 transition hover:text-white",
                pinned && "text-yellow-300",
              )}
              aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTogglePin(item.id);
              }}
            >
              <Star className="h-4 w-4" />
            </button>
          </span>
        )}
      </NavLink>
    </li>
  );
}
