import React, { useState } from 'react';
import {
  Home,
  Clipboard,
  Settings,
  PenTool as Tool,
  Package,
  Calendar,
  PieChart,
  Users,
  LogOut,
  MessageSquare,
  Book,
  Building2,
  GripVertical,
 
  Clock,
 
} from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuthStore, isAdmin as selectIsAdmin, isManager as selectIsManager } from '../../store/authStore';
import { useSummary } from '../../hooks/useSummaryData';
import type { DashboardSummary } from '../../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigationStore, NavItemId } from '../../store/navigationStore';
 

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse
}) => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(selectIsAdmin);
  const isManager = useAuthStore(selectIsManager);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOrder, moveSidebarItem } = useNavigationStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const SortableNavItem: React.FC<{
    id: NavItemId;
    path: string;
    label: string;
    icon: JSX.Element;
  }> = ({ id, path, label, icon }) => {
    const { setNodeRef, attributes, listeners, transform, transition } =
      useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style}>
        <NavLink
          to={path}
          className={({ isActive }) => `
                flex items-center px-4 py-3 rounded-lg transition-colors duration-150
                ${isActive
                  ? 'bg-primary-800 dark:bg-neutral-700 text-white'
                  : 'text-primary-300 dark:text-neutral-400 hover:bg-primary-900 dark:hover:bg-neutral-800 hover:text-white'}
              `}
        >
          <button
            {...attributes}
            {...listeners}
            className="mr-2 text-neutral-400 hover:text-neutral-200 cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
          <span className={collapsed ? 'mx-auto' : 'mr-3'}>{icon}</span>
          {!collapsed && <span>{label}</span>}
        </NavLink>
      </div>
    );
  };
   
  const navItems: Record<NavItemId, { path: string; label: string; icon: JSX.Element; requireAdmin?: boolean }> = {
    dashboard: { path: '/dashboard', label: 'Dashboard', icon: <Home size={20} /> },
    assets: { path: '/assets', label: 'Assets', icon: <Tool size={20} />, requireAdmin: true },
    'work-orders': { path: '/work-orders', label: 'Work Orders', icon: <Clipboard size={20} /> },
    maintenance: { path: '/maintenance', label: 'Maintenance', icon: <Calendar size={20} /> },
    'pm-tasks': { path: '/pm-tasks', label: 'PM Tasks', icon: <Calendar size={20} /> },
    inventory: { path: '/inventory', label: 'Inventory', icon: <Package size={20} /> },
 
    timesheets: { path: '/timesheets', label: 'Timesheets', icon: <Clock size={20} /> },
 
    messages: { path: '/messages', label: 'Messages', icon: <MessageSquare size={20} /> },
    departments: { path: '/departments', label: 'Departments', icon: <Building2 size={20} />, requireAdmin: true },
    analytics: { path: '/analytics', label: 'Analytics', icon: <PieChart size={20} />, requireAdmin: true },
    teams: { path: '/teams', label: 'Team', icon: <Users size={20} />, requireAdmin: true },
    settings: { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    documentation: { path: '/documentation', label: 'Documentation', icon: <Book size={20} /> },
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [summary] = useSummary<DashboardSummary>('/summary', []);
  const completion =
    summary && summary.totalWorkOrders > 0
      ? Math.round((summary.completedWorkOrders / summary.totalWorkOrders) * 100)
      : 0;

  const filteredNavItems = sidebarOrder
    .map((id) => [id, navItems[id]] as const)
    .filter(([, item]) => item && (!item.requireAdmin || isAdmin || isManager));

  return (
    <aside className={`
      h-screen bg-primary-950 text-white transition-all duration-300 ease-in-out dark:bg-neutral-900
      ${collapsed ? 'w-20' : 'w-64'}
      flex flex-col fixed top-0 left-0 z-40
    `}>
      <div className="flex items-center h-16 px-4 border-b border-primary-800 dark:border-neutral-800">
        {!collapsed && (
          <div className="text-xl font-bold ml-2">
            MaintainPro
          </div>
        )}
        {collapsed && (
          <div className="mx-auto text-lg font-bold">
            MP
          </div>
        )}
        <button 
          onClick={onToggleCollapse}
          className="ml-auto p-1.5 rounded-lg hover:bg-primary-800 dark:hover:bg-neutral-800 focus:outline-none"
        >
          {collapsed ? (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              const { active, over } = e;
              if (over && active.id !== over.id) {
                moveSidebarItem(active.id as NavItemId, over.id as NavItemId);
              }
            }}
          >
            <SortableContext
              items={filteredNavItems.map(([id]) => id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredNavItems.map(([id, item]) => (
                <SortableNavItem
                  key={id}
                  id={id}
                  path={item.path}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </SortableContext>
          </DndContext>
        </nav>
      </div>

      <div className="p-4 border-t border-primary-800 dark:border-neutral-800">
        <div className="mb-4">
          {!collapsed && (
            <p className="text-sm text-neutral-300 mb-1">{completion}% complete</p>
          )}
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2">
            <div
              className="bg-success-500 h-2 rounded-full"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleLogout}
          className={`
            flex items-center px-4 py-2.5 rounded-lg text-primary-300 dark:text-neutral-400 hover:bg-primary-900 dark:hover:bg-neutral-800 hover:text-white
            transition-colors duration-150 w-full
          `}
        >
          <LogOut size={20} className={collapsed ? 'mx-auto' : 'mr-3'} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
