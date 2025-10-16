/*
 * SPDX-License-Identifier: MIT
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  BookOpen,
  Boxes,
  ClipboardList,
  Clock,
  FileCheck,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  MessageSquare,
  Package,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/utils/cn';

type NavItem = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type NavSection = {
  heading: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    heading: 'Operations',
    items: [
      {
        to: '/dashboard',
        label: 'Dashboard',
        description: 'Live command center overview',
        icon: LayoutDashboard,
      },
      {
        to: '/dashboard/work-orders',
        label: 'Work Orders',
        description: 'Plan, dispatch & complete jobs',
        icon: ClipboardList,
      },
      {
        to: '/dashboard/preventive-maintenance',
        label: 'Preventive Maintenance',
        description: 'Recurring tasks & compliance cadence',
        icon: Clock,
      },
      {
        to: '/dashboard/assets',
        label: 'Assets & Locations',
        description: 'Hierarchy, locations & uptime',
        icon: Package,
      },
      {
        to: '/dashboard/permits',
        label: 'Permits / Safety',
        description: 'Lockout, safety and compliance',
        icon: ShieldCheck,
      },
    ],
  },
  {
    heading: 'Resources',
    items: [
      {
        to: '/dashboard/parts-inventory',
        label: 'Parts & Inventory',
        description: 'Stock levels & reorder points',
        icon: Boxes,
      },
      {
        to: '/dashboard/vendors-purchasing',
        label: 'Vendors & Purchasing',
        description: 'Suppliers, contracts & sourcing',
        icon: Store,
      },
      {
        to: '/dashboard/labor',
        label: 'Labor / Technicians',
        description: 'Teams, certifications & availability',
        icon: Users,
      },
      {
        to: '/dashboard/meters',
        label: 'Meters / Readings',
        description: 'Runtime & condition tracking',
        icon: Gauge,
      },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      {
        to: '/dashboard/analytics',
        label: 'Analytics & KPIs',
        description: 'Performance dashboards & trends',
        icon: LineChart,
      },
      {
        to: '/dashboard/reports',
        label: 'Reports',
        description: 'Exportable summaries & PDFs',
        icon: FileSpreadsheet,
      },
      {
        to: '/dashboard/knowledge-base',
        label: 'Knowledge Base',
        description: 'SOPs, manuals & best practices',
        icon: BookOpen,
      },
      {
        to: '/dashboard/chat',
        label: 'Chat / Collaboration',
        description: 'Team messaging & handoffs',
        icon: MessageSquare,
      },
    ],
  },
  {
    heading: 'System',
    items: [
      {
        to: '/dashboard/notifications',
        label: 'Notifications',
        description: 'Alerts & in-app updates',
        icon: Bell,
      },
      {
        to: '/dashboard/integrations',
        label: 'Integrations / API',
        description: 'Connectors, webhooks & API keys',
        icon: Plug,
      },
      {
        to: '/dashboard/compliance',
        label: 'Compliance / Audit Logs',
        description: 'Traceability & policy history',
        icon: FileCheck,
      },
      {
        to: '/dashboard/admin',
        label: 'Admin Settings',
        description: 'Sites, teams & system config',
        icon: Settings,
      },
    ],
  },
];

const renderLink = ({ to, label, description, icon: Icon }: NavItem) => (
  <NavLink
    key={to}
    to={to}
    title={description}
    className={({ isActive }) =>
      cn(
        'group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white hover:shadow-lg hover:shadow-primary-500/10',
        'ring-1 ring-transparent hover:ring-white/10',
        isActive && 'bg-white/10 text-white shadow-lg shadow-primary-500/10 ring-white/20',
      )
    }
  >
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/80 transition group-hover:bg-white/10 group-hover:text-white">
      <Icon className="h-5 w-5" />
    </span>
    <span className="flex flex-1 flex-col">
      <span className="font-semibold leading-tight">{label}</span>
      <span className="text-xs text-white/50">{description}</span>
    </span>
  </NavLink>
);

export default function Sidebar() {
  return (
    <aside className="relative hidden w-72 flex-col border-r border-white/10 bg-slate-900/40 px-6 py-8 backdrop-blur-xl lg:flex xl:w-80">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/40">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-semibold text-white">WorkPro</span>
          <span className="text-xs uppercase tracking-[0.3em] text-white/50">Operations</span>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-6">
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-white/40">{section.heading}</p>
            <div className="space-y-2">{section.items.map(renderLink)}</div>
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary-500/15 via-primary-500/5 to-white/5 p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <LifeBuoy className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Need a hand?</p>
              <p className="mt-1 text-xs text-white/70">
                Press <kbd className="rounded bg-white/15 px-1 text-[10px]">⌘</kbd>
                <span className="mx-1">+</span>
                <kbd className="rounded bg-white/15 px-1 text-[10px]">K</kbd> for the command palette.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">Status</p>
          <p className="mt-2 text-sm font-semibold text-white">Systems operational</p>
          <p className="mt-1 text-xs text-white/60">All integrations responding in under 200ms.</p>
        </div>
      </div>
    </aside>
  );
}

