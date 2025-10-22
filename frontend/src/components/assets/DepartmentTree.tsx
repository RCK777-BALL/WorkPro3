/*
 * SPDX-License-Identifier: MIT
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Building2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { ReactNode, MouseEvent } from 'react';

import type { ContextTarget, DepartmentNode } from './hierarchyTypes';

interface DepartmentTreeProps {
  department: DepartmentNode;
  isExpanded: boolean;
  onToggle: () => void;
  onAddLine: () => void;
  onContextMenu: (event: MouseEvent, target: ContextTarget) => void;
  onEdit: () => void;
  children: ReactNode;
}

const containerVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
};

const DepartmentTree = ({
  department,
  isExpanded,
  onToggle,
  onAddLine,
  onContextMenu,
  onEdit,
  children,
}: DepartmentTreeProps) => {
  return (
    <div className="border-l border-slate-800 pl-4">
      <div
        onClick={onToggle}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onContextMenu(event, {
            type: 'department',
            departmentId: department._id,
            name: department.name,
          });
        }}
        className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-slate-200 transition hover:bg-slate-800/60"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-indigo-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-indigo-400" />
        )}
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
            <Building2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-100">{department.name}</p>
            {department.notes && (
              <p className="text-xs text-slate-400 line-clamp-1">{department.notes}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          className="ml-auto hidden items-center gap-1 rounded-md bg-indigo-600/80 px-2 py-1 text-xs font-medium text-white transition group-hover:flex hover:bg-indigo-500"
          onClick={(event) => {
            event.stopPropagation();
            onAddLine();
          }}
        >
          <Plus className="h-3 w-3" /> Line
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`${department._id}-lines`}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={containerVariants}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="pl-5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DepartmentTree;
