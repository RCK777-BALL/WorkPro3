/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/common/Button';
import type { DepartmentHierarchy, LineWithStations } from '@/types';

type Mode = 'line' | 'station';

interface QuickAddDialogProps {
  open: boolean;
  mode: Mode;
  departments: DepartmentHierarchy[];
  onCancel: () => void;
  onConfirm: (departmentId: string, lineId?: string) => void;
}

const QuickAddDialog = ({ open, mode, departments, onCancel, onConfirm }: QuickAddDialogProps) => {
  const eligibleDepartments = useMemo(() => {
    if (mode === 'station') {
      return departments.filter((department) => department.lines.length > 0);
    }
    return departments;
  }, [departments, mode]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedLineId, setSelectedLineId] = useState('');

  useEffect(() => {
    if (!open) return;
    const firstDepartment = eligibleDepartments[0];
    setSelectedDepartmentId(firstDepartment?.id ?? '');
  }, [open, eligibleDepartments]);

  useEffect(() => {
    if (!open || mode !== 'station') return;
    const department = eligibleDepartments.find((item) => item.id === selectedDepartmentId);
    const firstLine = department?.lines[0];
    setSelectedLineId(firstLine?.id ?? '');
  }, [open, eligibleDepartments, mode, selectedDepartmentId]);

  const selectedDepartment = eligibleDepartments.find((department) => department.id === selectedDepartmentId);
  const selectedLine: LineWithStations | null =
    mode === 'station'
      ? selectedDepartment?.lines.find((line) => line.id === selectedLineId) ?? null
      : null;

  const canConfirm = mode === 'line' ? Boolean(selectedDepartment) : Boolean(selectedDepartment && selectedLine);

  const title = mode === 'line' ? 'Choose a department for the new line' : 'Choose a line for the new station';
  const description =
    mode === 'line'
      ? 'Pick the department where the new line should be created.'
      : 'Select the department and line that should contain this station.';
  const confirmLabel = mode === 'line' ? 'Continue to line details' : 'Continue to station details';

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[color-mix(in_srgb,var(--wp-color-background)_70%,transparent)] px-4">
      <div className="dark w-full max-w-md rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-6 text-[var(--wp-color-text)] shadow-2xl">
        <div>
          <h2 className="text-lg font-semibold text-[var(--wp-color-text)]">{title}</h2>
          <p className="mt-2 text-sm text-[var(--wp-color-text)]/70">{description}</p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)]" htmlFor="quick-add-department">
              Department
            </label>
            <select
              id="quick-add-department"
              value={selectedDepartmentId}
              onChange={(event) => setSelectedDepartmentId(event.target.value)}
              className="mt-2 w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)] shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {eligibleDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {eligibleDepartments.length === 0 && (
              <p className="mt-2 text-xs text-[var(--wp-color-text)]/60">No departments available.</p>
            )}
          </div>

          {mode === 'station' && (
            <div>
              <label className="block text-sm font-medium text-[var(--wp-color-text)]" htmlFor="quick-add-line">
                Line
              </label>
              <select
                id="quick-add-line"
                value={selectedLineId}
                onChange={(event) => setSelectedLineId(event.target.value)}
                disabled={!selectedDepartment || selectedDepartment.lines.length === 0}
                className="mt-2 w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)] shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {(selectedDepartment?.lines ?? []).map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
              {selectedDepartment && selectedDepartment.lines.length === 0 && (
                <p className="mt-2 text-xs text-[var(--wp-color-text)]/60">This department does not have any lines yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={!canConfirm}
            onClick={() => {
              if (!selectedDepartmentId) return;
              onConfirm(selectedDepartmentId, mode === 'station' ? selectedLineId : undefined);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickAddDialog;

