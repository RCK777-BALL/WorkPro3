/*
 * SPDX-License-Identifier: MIT
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '@/store/dashboardStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Card from '@/components/common/Card';
import {
  ArrowUp,
  ArrowDown,
  PenTool as Tool,
  Clipboard,
  CheckCircle,
  AlertTriangle,
  Plus,
  Users,
  Clock,
  Activity,
  DollarSign,
  Gauge,
  Wrench,
  Package,
  BarChart2,
  GripVertical,
} from 'lucide-react';

interface StatCardProps {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  iconBg?: string;
  linkTo?: string;
  onClick?: () => void;          // single, optional click handler
  onRemove?: () => void;
  tooltip?: string;
}

// Available KPIs that can be added
const availableKPIs = [
  { id: 'labor_utilization', title: 'Labor Utilization', icon: Users, value: '87%', change: 2.3, iconBg: 'bg-accent-50' },
  { id: 'mttr', title: 'Mean Time to Repair', icon: Clock, value: '2.4h', change: -0.5, iconBg: 'bg-teal-50' },
  { id: 'oee', title: 'Overall Equipment Effectiveness', icon: Activity, value: '92%', change: 1.8, iconBg: 'bg-primary-50' },
  {
    id: 'maintenance_cost',
    title: 'Maintenance Cost',
    icon: DollarSign,
    value: '$12,450',
    change: -3.2,
    iconBg: 'bg-warning-50',
    linkTo: '/analytics?view=cost',
    tooltip: 'Total cost incurred for maintenance activities.',
  },
  { id: 'equipment_reliability', title: 'Equipment Reliability', icon: Gauge, value: '95%', change: 0.8, iconBg: 'bg-success-50' },
  {
    id: 'pm_completion',
    title: 'PM Completion Rate',
    icon: Wrench,
    value: '89%',
    change: 4.2,
    iconBg: 'bg-primary-50',
    linkTo: '/pm-tasks',
    tooltip: 'Percentage of preventive maintenance tasks completed on schedule.',
  },
  { id: 'parts_turnover', title: 'Parts Turnover Rate', icon: Package, value: '3.2x', change: 0.4, iconBg: 'bg-teal-50' },
  {
    id: 'energy_efficiency',
    title: 'Energy Efficiency',
    icon: BarChart2,
    value: '94%',
    change: 2.1,
    iconBg: 'bg-success-50',
    linkTo: '/analytics?view=energy',
    tooltip: 'Measures how efficiently energy is used compared to production.',
  },
];

const SortableStatCard: React.FC<StatCardProps> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  const navigate = useNavigate();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = () => {
    if (props.onClick) {
      props.onClick();
    } else if (props.linkTo) {
      navigate(props.linkTo);
    }
  };

  return (
    <div ref={setNodeRef} style={style} title={props.tooltip}>
      <Card
        className={`h-full transition-all duration-150 group ${
          (props.onClick || props.linkTo) ? 'cursor-pointer hover:border-primary-300 hover:shadow-md dark:hover:border-primary-700' : ''
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center">
          <div className="flex items-center">
            <button
              {...attributes}
              {...listeners}
              className="mr-2 p-1 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing"
            >
              <GripVertical size={16} />
            </button>
            <div className={`p-3 rounded-lg ${props.iconBg} dark:bg-opacity-20`}>
              {props.icon}
            </div>
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{props.title}</h3>
              {props.onRemove && (
                <button
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation();
                    props.onRemove?.();
                  }}
                  className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-error-500 transition-opacity"
                >
                  <AlertTriangle size={16} />
                </button>
              )}
            </div>
            <p className="text-2xl font-semibold mt-1 text-neutral-900 dark:text-white">{props.value}</p>

            {props.change !== undefined && (
              <div className="flex items-center mt-1">
                {props.change > 0 ? (
                  <ArrowUp size={14} className="text-success-500" />
                ) : (
                  <ArrowDown size={14} className="text-error-500" />
                )}
                <span
                  className={`text-xs font-medium ml-1 ${props.change > 0 ? 'text-success-500' : 'text-error-500'}`}
                >
                  {Math.abs(props.change)}% {props.changeLabel || ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

interface DashboardStatsProps {
  stats: {
    totalAssets: number;
    activeWorkOrders: number;
    maintenanceCompliance: number;
    inventoryAlerts: number;
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const [showKPISelector, setShowKPISelector] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const {
    selectedKPIs,
    setSelectedKPIs,
    addKPI,
    removeKPI,
    selectedRole,
  } = useDashboardStore((s) => ({
    selectedKPIs: s.selectedKPIs,
    setSelectedKPIs: s.setSelectedKPIs,
    addKPI: s.addKPI,
    removeKPI: s.removeKPI,
    selectedRole: s.selectedRole,
  }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Default KPIs that are always shown (role-aware)
  const baseKPIs: StatCardProps[] = [
    {
      id: 'total_assets',
      title: 'Total Assets',
      value: stats.totalAssets,
      change: 5.2,
      changeLabel: 'from last month',
      icon: <Tool className="h-6 w-6 text-primary-700 dark:text-primary-400" />,
      iconBg: 'bg-primary-50',
      linkTo: '/assets',
    },
    {
      id: 'work_orders',
      title: 'Work Orders',
      value: stats.activeWorkOrders,
      change: -2.4,
      changeLabel: 'from last week',
      icon: <Clipboard className="h-6 w-6 text-teal-600 dark:text-teal-400" />,
      iconBg: 'bg-teal-50',
      linkTo: '/work-orders?status=open',
    },
    {
      id: 'pm_tasks',
      title: 'PM Tasks',
      value: `${stats.maintenanceCompliance}%`,
      change: 3.1,
      changeLabel: 'from target',
      icon: <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400" />,
      iconBg: 'bg-success-50',
      linkTo: '/maintenance',
    },
    {
      id: 'inventory',
      title: 'Inventory',
      value: stats.inventoryAlerts,
      icon: <AlertTriangle className="h-6 w-6 text-error-600 dark:text-error-400" />,
      iconBg: 'bg-error-50',
      linkTo: '/inventory?filter=alerts',
    },
  ];

  const role = selectedRole;
  const defaultKPIs: StatCardProps[] =
    role === 'tech'
      ? baseKPIs.filter((kpi) => ['work_orders', 'pm_tasks', 'inventory'].includes(kpi.id))
      : baseKPIs;

  const navigate = useNavigate();

  // Build extra KPIs from selection (null-safe)
  const extraKPIs: StatCardProps[] = selectedKPIs
    .map((kpiId: string) => {
      const kpi = availableKPIs.find((k) => k.id === kpiId);
      if (!kpi) return null;

      const textColor = kpi.iconBg.replace('bg-', 'text-').replace('50', '600');
      const textColorDark = kpi.iconBg.replace('bg-', 'text-').replace('50', '400');

      return {
        id: kpi.id,
        title: kpi.title,
        value: kpi.value,
        change: kpi.change,
        icon: <kpi.icon className={`h-6 w-6 ${textColor} dark:${textColorDark}`} />,
        iconBg: kpi.iconBg,
        linkTo: kpi.linkTo,
        tooltip: kpi.tooltip,
        onClick: kpi.linkTo ? () => navigate(kpi.linkTo!) : undefined,
        onRemove: () => removeKPI(kpi.id),
      } as StatCardProps;
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);

  const allKPIs: StatCardProps[] = [...defaultKPIs, ...extraKPIs];
  const kpiIds = allKPIs.map((k) => k.id);

  const handleAddKPI = (kpiId: string) => {
    addKPI(kpiId);
    setShowKPISelector(false);
  };


  const handleDragStart = (event: any) => setActiveId(event.active.id);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedKPIs.indexOf(active.id);
      const newIndex = selectedKPIs.indexOf(over.id);
      const newOrder = arrayMove(selectedKPIs, oldIndex, newIndex);
      setSelectedKPIs(newOrder);
    }
    setActiveId(null);
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <SortableContext items={kpiIds} strategy={rectSortingStrategy}>
            {allKPIs.map((kpi) => (
              <SortableStatCard key={kpi.id} {...kpi} />
            ))}
          </SortableContext>

          {/* Add KPI Button */}
          <button
            onClick={() => setShowKPISelector(!showKPISelector)}
            className="h-full min-h-[120px] border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors flex items-center justify-center"
          >
            <div className="text-center">
              <Plus className="h-8 w-8 mx-auto text-neutral-400 dark:text-neutral-500" />
              <span className="mt-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400">Add KPI</span>
            </div>
          </button>
        </div>

        <DragOverlay>
          {activeId ? (
            <Card className="h-full opacity-50">
              {allKPIs.find((k) => k.id === activeId)?.title}
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* KPI Selector Dropdown */}
      {showKPISelector && (
        <div className="absolute z-50 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Add KPI</h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">Select a KPI to add to your dashboard</p>
          </div>
          <div className="p-2">
            {availableKPIs
              .filter((kpi) => !selectedKPIs.includes(kpi.id))
              .map((kpi) => (
                <button
                  key={kpi.id}
                  className="w-full text-left px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                  onClick={() => handleAddKPI(kpi.id)}
                >
                  <div className="flex items-center">
                    <kpi.icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
                    <span className="ml-3 text-neutral-900 dark:text-white">{kpi.title}</span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
