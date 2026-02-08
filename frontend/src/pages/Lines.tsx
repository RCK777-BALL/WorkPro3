/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import SlideOver from '@/components/common/SlideOver';
import { useScopeContext } from '@/context/ScopeContext';
import { useToast } from '@/context/ToastContext';
import { createLine, deleteLine, listDepartments, updateLine } from '@/api/departments';
import http from '@/lib/http';

interface LineResponse {
  _id: string;
  name: string;
  departmentId: string;
  notes?: string;
  stations: string[];
}

interface DepartmentOption {
  id: string;
  name: string;
}

const Lines: React.FC = () => {
  const { addToast } = useToast();
  const { activePlant } = useScopeContext();
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineName, setLineName] = useState('');
  const [lineNotes, setLineNotes] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [lineTouched, setLineTouched] = useState(false);
  const [lineSaving, setLineSaving] = useState(false);
  const [editingLine, setEditingLine] = useState<LineResponse | null>(null);

  const fetchLines = useCallback(async () => {
    setLoading(true);
    try {
      const response = await http.get<LineResponse[]>('/lines');
      setLines(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load lines', err);
      setError('Unable to load production lines');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const response = await listDepartments();
      setDepartments(
        response.map((department) => ({
          id: department._id,
          name: department.name,
        })),
      );
    } catch (err) {
      console.error('Failed to load departments', err);
      addToast('Unable to load departments', 'error');
    } finally {
      setDepartmentsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchLines();
  }, [fetchLines]);

  useEffect(() => {
    if (!lineModalOpen) return;
    void fetchDepartments();
  }, [fetchDepartments, lineModalOpen]);

  const resetLineForm = useCallback(() => {
    setLineName('');
    setLineNotes('');
    setSelectedDepartmentId('');
    setLineTouched(false);
    setEditingLine(null);
  }, []);

  const handleLineSave = async () => {
    if (!lineName.trim() || !selectedDepartmentId) {
      setLineTouched(true);
      return;
    }

    setLineSaving(true);
    try {
      if (editingLine) {
        await updateLine(
          editingLine.departmentId,
          editingLine._id,
          { name: lineName.trim(), notes: lineNotes.trim() || undefined },
          { plantId: activePlant?.id },
        );
        addToast('Line updated', 'success');
      } else {
        await createLine(
          selectedDepartmentId,
          { name: lineName.trim(), notes: lineNotes.trim() || undefined },
          { plantId: activePlant?.id },
        );
        addToast('Line created', 'success');
      }
      setLineModalOpen(false);
      resetLineForm();
      void fetchLines();
    } catch (err) {
      console.error(`Failed to ${editingLine ? 'update' : 'create'} line`, err);
      addToast(`Unable to ${editingLine ? 'update' : 'create'} line`, 'error');
    } finally {
      setLineSaving(false);
    }
  };

  const handleLineEdit = (line: LineResponse) => {
    setEditingLine(line);
    setLineName(line.name);
    setLineNotes(line.notes ?? '');
    setSelectedDepartmentId(line.departmentId);
    setLineTouched(false);
    setLineModalOpen(true);
  };

  const handleLineDelete = async (line: LineResponse) => {
    const confirmed = window.confirm(`Delete the ${line.name} line? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteLine(line.departmentId, line._id, { plantId: activePlant?.id });
      addToast('Line deleted', 'success');
      void fetchLines();
    } catch (err) {
      console.error('Failed to delete line', err);
      addToast('Unable to delete line', 'error');
    }
  };

  const departmentError = useMemo(() => {
    if (!lineTouched) return null;
    return selectedDepartmentId ? null : 'Department is required';
  }, [lineTouched, selectedDepartmentId]);

  const lineNameError = useMemo(() => {
    if (!lineTouched) return null;
    return lineName.trim() ? null : 'Line name is required';
  }, [lineName, lineTouched]);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">Plant Lines</h1>
          <p className="text-sm text-neutral-400">
            Review departments and associated production lines for the active plant.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setLineModalOpen(true);
            resetLineForm();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Line
        </Button>
      </header>
      <Card title="Lines overview">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-700 text-sm text-neutral-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Line</th>
                  <th className="px-3 py-2 text-left font-medium">Department</th>
                  <th className="px-3 py-2 text-left font-medium">Stations</th>
                  <th className="px-3 py-2 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={4}>
                      Loading lines…
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line._id}>
                      <td className="px-3 py-3 font-medium text-white">{line.name}</td>
                      <td className="px-3 py-3">{line.departmentId}</td>
                      <td className="px-3 py-3">{line.stations.length}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="xs"
                            variant="outline"
                            type="button"
                            title={`Edit ${line.name}`}
                            aria-label={`Edit ${line.name}`}
                            onClick={() => handleLineEdit(line)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            type="button"
                            title={`Delete ${line.name}`}
                            aria-label={`Delete ${line.name}`}
                            onClick={() => void handleLineDelete(line)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && lines.length === 0 && !error ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={4}>
                      No lines available for this plant.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <SlideOver
        open={lineModalOpen}
        title={editingLine ? 'Edit Line' : 'Add Line'}
        onClose={() => {
          if (lineSaving) return;
          setLineModalOpen(false);
        }}
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLineModalOpen(false)} disabled={lineSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleLineSave} loading={lineSaving}>
              {editingLine ? 'Update' : 'Save'}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLineSave();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Department
            </label>
            <select
              value={selectedDepartmentId}
              onChange={(event) => setSelectedDepartmentId(event.target.value)}
              onBlur={() => setLineTouched(true)}
              disabled={departmentsLoading || Boolean(editingLine)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {departmentError && <p className="mt-1 text-sm text-error-600">{departmentError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Line name
            </label>
            <input
              value={lineName}
              onChange={(event) => setLineName(event.target.value)}
              onBlur={() => setLineTouched(true)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Packaging Line"
            />
            {lineNameError && <p className="mt-1 text-sm text-error-600">{lineNameError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Notes
            </label>
            <textarea
              value={lineNotes}
              onChange={(event) => setLineNotes(event.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              rows={3}
              placeholder="Optional context for the line"
            />
          </div>
        </form>
      </SlideOver>
    </div>
  );
};

export default Lines;
