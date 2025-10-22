/*
 * SPDX-License-Identifier: MIT
 */

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, GitBranch, Plus } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';

import type { ContextTarget, LineNode } from './hierarchyTypes';

interface LineTreeProps {
  line: LineNode;
  isExpanded: boolean;
  onToggle: () => void;
  onAddStation: () => void;
  onContextMenu: (event: MouseEvent, target: ContextTarget) => void;
  onEdit: () => void;
  children: ReactNode;
}

const containerVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1 },
};

const LineTree = ({
  line,
  isExpanded,
  onToggle,
  onAddStation,
  onContextMenu,
  onEdit,
  children,
}: LineTreeProps) => {
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
            type: 'line',
            lineId: line._id,
            name: line.name,
          });
        }}
        className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-slate-200 transition hover:bg-slate-800/60"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-emerald-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-emerald-400" />
        )}
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
            <GitBranch className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-100">{line.name}</p>
            {line.notes && <p className="text-xs text-slate-400 line-clamp-1">{line.notes}</p>}
          </div>
        </div>
        <button
          type="button"
          className="ml-auto hidden items-center gap-1 rounded-md bg-emerald-600/80 px-2 py-1 text-xs font-medium text-white transition group-hover:flex hover:bg-emerald-500"
          onClick={(event) => {
            event.stopPropagation();
            onAddStation();
          }}
        >
          <Plus className="h-3 w-3" /> Station
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={`${line._id}-stations`}
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

export default LineTree;
