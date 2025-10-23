/*
 * SPDX-License-Identifier: MIT
 */

import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Filter, GitBranch, Milestone, Plus, X } from 'lucide-react';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DepartmentTable from '@/components/departments/DepartmentTable';
import DepartmentModal from '@/components/departments/DepartmentModal';
import LineModal from '@/components/departments/LineModal';
import StationModal from '@/components/departments/StationModal';
import AssetModal from '@/components/departments/AssetModal';
import QuickAddDialog from '@/components/departments/QuickAddDialog';
import {
  createAsset,
  createDepartment,
  createLine,
  createStation,
  deleteAsset,
  deleteDepartment,
  deleteLine,
  deleteStation,
  listDepartmentHierarchy,
  mapDepartmentResponse,
  updateDepartment,
  updateAsset,
  updateLine,
  updateStation,
} from '@/api/departments';
import type {
  Asset,
  DepartmentHierarchy,
  LineWithStations,
  StationWithAssets,
} from '@/types';
import { useToast } from '@/context/ToastContext';

type AssetCategory = Asset['type'] | 'All';

const PAGE_SIZE = 5;

const Departments = () => {
  const { addToast } = useToast();

  const [departments, setDepartments] = useState<DepartmentHierarchy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory>('All');
  const [page, setPage] = useState(1);

  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentEditing, setDepartmentEditing] = useState<DepartmentHierarchy | null>(null);
  const [departmentSaving, setDepartmentSaving] = useState(false);

  const [lineModalState, setLineModalState] = useState<{
    department: DepartmentHierarchy;
    line: LineWithStations | null;
  } | null>(null);
  const [lineSaving, setLineSaving] = useState(false);

  const [stationModalState, setStationModalState] = useState<{
    department: DepartmentHierarchy;
    line: LineWithStations;
    station: StationWithAssets | null;
  } | null>(null);
  const [stationSaving, setStationSaving] = useState(false);

  const [assetModalState, setAssetModalState] = useState<{
    department: DepartmentHierarchy;
    line: LineWithStations;
    station: StationWithAssets;
    asset: Asset | null;
  } | null>(null);
  const [assetSaving, setAssetSaving] = useState(false);

  const [quickAddState, setQuickAddState] = useState<{ mode: 'line' | 'station' } | null>(null);

  const replaceDepartment = useCallback((updated: DepartmentHierarchy) => {
    setDepartments((prev) =>
      prev.map((department) => (department.id === updated.id ? updated : department)),
    );
  }, []);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDepartmentHierarchy();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments', err);
      setError('Unable to load departments. Please try again.');
      addToast('Failed to load departments', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) => {
      const matchesSearch =
        normalizedSearch.length === 0 || department.name.toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;
      if (categoryFilter === 'All') return true;
      return department.lines.some((line) =>
        line.stations.some((station) => station.assets.some((asset) => asset.type === categoryFilter)),
      );
    });
  }, [departments, normalizedSearch, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDepartments.slice(start, start + PAGE_SIZE);
  }, [filteredDepartments, currentPage]);

  const handleDepartmentSave = async (values: { name: string; description?: string }) => {
    setDepartmentSaving(true);
    try {
      if (departmentEditing) {
        await updateDepartment(departmentEditing.id, values);
        setDepartments((prev) =>
          prev.map((department) =>
            department.id === departmentEditing.id
              ? {
                  ...department,
                  name: values.name,
                  description: values.description,
                  notes: values.description ?? department.notes,
                }
              : department,
          ),
        );
        addToast('Department updated', 'success');
      } else {
        const created = await createDepartment(values);
        setDepartments((prev) => [...prev, mapDepartmentResponse(created)]);
        addToast('Department created', 'success');
      }
      setDepartmentModalOpen(false);
      setDepartmentEditing(null);
    } catch (err) {
      console.error('Failed to save department', err);
      addToast('Failed to save department', 'error');
    } finally {
      setDepartmentSaving(false);
    }
  };

  const handleDepartmentDelete = async () => {
    if (!departmentEditing) return;
    setDepartmentSaving(true);
    try {
      await deleteDepartment(departmentEditing.id);
      setDepartments((prev) => prev.filter((department) => department.id !== departmentEditing.id));
      addToast('Department deleted', 'success');
      setDepartmentModalOpen(false);
      setDepartmentEditing(null);
    } catch (err) {
      console.error('Failed to delete department', err);
      addToast('Failed to delete department', 'error');
    } finally {
      setDepartmentSaving(false);
    }
  };

  const handleLineSave = async (values: { name: string; notes?: string }) => {
    if (!lineModalState) return;
    setLineSaving(true);
    try {
      const updated = lineModalState.line
        ? await updateLine(lineModalState.department.id, lineModalState.line.id, values)
        : await createLine(lineModalState.department.id, values);
      replaceDepartment(updated);
      addToast(lineModalState.line ? 'Line updated' : 'Line created', 'success');
      setLineModalState(null);
    } catch (err) {
      console.error('Failed to save line', err);
      addToast('Failed to save line', 'error');
    } finally {
      setLineSaving(false);
    }
  };

  const handleLineDelete = async () => {
    if (!lineModalState?.line) return;
    setLineSaving(true);
    try {
      const updated = await deleteLine(lineModalState.department.id, lineModalState.line.id);
      replaceDepartment(updated);
      addToast('Line deleted', 'success');
      setLineModalState(null);
    } catch (err) {
      console.error('Failed to delete line', err);
      addToast('Failed to delete line', 'error');
    } finally {
      setLineSaving(false);
    }
  };

  const handleStationSave = async (values: { name: string; notes?: string }) => {
    if (!stationModalState) return;
    setStationSaving(true);
    try {
      const updated = stationModalState.station
        ? await updateStation(
            stationModalState.department.id,
            stationModalState.line.id,
            stationModalState.station.id,
            values,
          )
        : await createStation(
            stationModalState.department.id,
            stationModalState.line.id,
            values,
          );
      replaceDepartment(updated);
      addToast(stationModalState.station ? 'Station updated' : 'Station created', 'success');
      setStationModalState(null);
    } catch (err) {
      console.error('Failed to save station', err);
      addToast('Failed to save station', 'error');
    } finally {
      setStationSaving(false);
    }
  };

  const handleStationDelete = async () => {
    if (!stationModalState?.station) return;
    setStationSaving(true);
    try {
      const updated = await deleteStation(
        stationModalState.department.id,
        stationModalState.line.id,
        stationModalState.station.id,
      );
      replaceDepartment(updated);
      addToast('Station deleted', 'success');
      setStationModalState(null);
    } catch (err) {
      console.error('Failed to delete station', err);
      addToast('Failed to delete station', 'error');
    } finally {
      setStationSaving(false);
    }
  };

  const handleSwitchToAddLine = () => {
    if (!stationModalState || stationSaving) return;
    const { department } = stationModalState;
    setStationModalState(null);
    setLineModalState({ department, line: null });
  };

  const handleSwitchToAddStation = () => {
    if (!lineModalState?.line || lineSaving) return;
    const { department, line } = lineModalState;
    setLineModalState(null);
    setStationModalState({ department, line, station: null });
  };

  const handleAssetSave = async (values: {
    name: string;
    type: Asset['type'];
    status?: string;
    description?: string;
    notes?: string;
    location?: string;
    lastServiced?: string;
  }) => {
    if (!assetModalState) return;
    setAssetSaving(true);
    try {
      const { department, line, station, asset } = assetModalState;
      const updated = asset
        ? await updateAsset(department.id, line.id, station.id, asset.id, values)
        : await createAsset(department.id, line.id, station.id, values);
      replaceDepartment(updated);
      addToast(asset ? 'Asset updated' : 'Asset created', 'success');
      setAssetModalState(null);
    } catch (err) {
      console.error('Failed to save asset', err);
      addToast('Failed to save asset', 'error');
    } finally {
      setAssetSaving(false);
    }
  };

  const handleAssetDelete = async () => {
    if (!assetModalState?.asset) return;
    setAssetSaving(true);
    try {
      const { department, line, station, asset } = assetModalState;
      const updated = await deleteAsset(department.id, line.id, station.id, asset.id);
      replaceDepartment(updated);
      addToast('Asset deleted', 'success');
      setAssetModalState(null);
    } catch (err) {
      console.error('Failed to delete asset', err);
      addToast('Failed to delete asset', 'error');
    } finally {
      setAssetSaving(false);
    }
  };

  const startDepartmentCreation = () => {
    setDepartmentEditing(null);
    setDepartmentModalOpen(true);
  };

  const openQuickAddLine = (): boolean => {
    if (departments.length === 0) {
      addToast('Create a department first before adding lines.', 'error');
      return false;
    }

    if (departments.length === 1) {
      setLineModalState({ department: departments[0], line: null });
      return true;
    }

    setQuickAddState({ mode: 'line' });
    return true;
  };

  const openQuickAddStation = (): boolean => {
    const departmentsWithLines = departments.filter((department) => department.lines.length > 0);

    if (departmentsWithLines.length === 0) {
      addToast('Add a line before creating stations.', 'error');
      return false;
    }

    if (departmentsWithLines.length === 1 && departmentsWithLines[0].lines.length === 1) {
      const [line] = departmentsWithLines[0].lines;
      setStationModalState({ department: departmentsWithLines[0], line, station: null });
      return true;
    }

    setQuickAddState({ mode: 'station' });
    return true;
  };

  const handleStartLineCreation = () => {
    const opened = openQuickAddLine();
    if (opened) {
      setCreateMenuOpen(false);
    }
  };

  const handleStartStationCreation = () => {
    const opened = openQuickAddStation();
    if (opened) {
      setCreateMenuOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900 via-indigo-800 to-blue-700 p-6 text-white shadow">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="rounded-xl bg-white/20 p-3">
              <Building2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold">Departments</h1>
              <p className="mt-1 max-w-2xl text-sm text-white/80">
                Organize your production hierarchy across departments, lines, stations, and their assets.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setCreateMenuOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
            <input
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Search departments"
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-neutral-400 dark:text-neutral-100"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <Filter className="h-4 w-4 text-neutral-500" />
            <select
              value={categoryFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setCategoryFilter(event.target.value as AssetCategory)
              }
              className="bg-transparent text-sm outline-none dark:text-neutral-100"
            >
              <option value="All">All asset types</option>
              <option value="Electrical">Electrical</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Tooling">Tooling</option>
              <option value="Interface">Interface</option>
            </select>
          </div>
        </div>

        <div className="relative mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-800 dark:bg-error-950/40 dark:text-error-200">
              {error}
            </div>
          ) : (
            <DepartmentTable
              departments={paginatedDepartments}
              categoryFilter={categoryFilter}
              onEditDepartment={(department) => {
                setDepartmentEditing(department);
                setDepartmentModalOpen(true);
              }}
              onAddLine={(department) => setLineModalState({ department, line: null })}
              onEditLine={(department, line) => setLineModalState({ department, line })}
              onDeleteLine={(department, line) => setLineModalState({ department, line })}
              onAddStation={(department, line) =>
                setStationModalState({ department, line, station: null })
              }
              onEditStation={(department, line, station) =>
                setStationModalState({ department, line, station })
              }
              onDeleteStation={(department, line, station) =>
                setStationModalState({ department, line, station })
              }
              onAddAsset={(department, line, station) =>
                setAssetModalState({ department, line, station, asset: null })
              }
              onEditAsset={(department, line, station, asset) =>
                setAssetModalState({ department, line, station, asset })
              }
              onDeleteAsset={(department, line, station, asset) =>
                setAssetModalState({ department, line, station, asset })
              }
            />
          )}
        </div>

        {!loading && !error && filteredDepartments.length > PAGE_SIZE && (
          <div className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredDepartments.length)} of{' '}
              {filteredDepartments.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <DepartmentModal
        open={departmentModalOpen}
        initial={departmentEditing}
        loading={departmentSaving}
        onClose={() => {
          if (departmentSaving) return;
          setDepartmentModalOpen(false);
          setDepartmentEditing(null);
        }}
        onSave={handleDepartmentSave}
        onDelete={departmentEditing ? handleDepartmentDelete : undefined}
      />

      <LineModal
        open={Boolean(lineModalState)}
        initial={lineModalState?.line ?? null}
        loading={lineSaving}
        onClose={() => {
          if (lineSaving) return;
          setLineModalState(null);
        }}
        onSave={handleLineSave}
        onDelete={lineModalState?.line ? handleLineDelete : undefined}
        onAddStation={lineModalState?.line ? handleSwitchToAddStation : undefined}
      />

      <StationModal
        open={Boolean(stationModalState)}
        initial={stationModalState?.station ?? null}
        loading={stationSaving}
        onClose={() => {
          if (stationSaving) return;
          setStationModalState(null);
        }}
        onSave={handleStationSave}
        onDelete={stationModalState?.station ? handleStationDelete : undefined}
        onAddLine={
          stationModalState && !stationModalState.station ? handleSwitchToAddLine : undefined
        }
      />

      <AssetModal
        open={Boolean(assetModalState)}
        initial={assetModalState?.asset ?? null}
        loading={assetSaving}
        onClose={() => {
          if (assetSaving) return;
          setAssetModalState(null);
        }}
        onSave={handleAssetSave}
        onDelete={assetModalState?.asset ? handleAssetDelete : undefined}
      />

      <QuickAddDialog
        open={Boolean(quickAddState)}
        mode={quickAddState?.mode ?? 'line'}
        departments={departments}
        onCancel={() => setQuickAddState(null)}
        onConfirm={(departmentId, lineId) => {
          const department = departments.find((item) => item.id === departmentId);
          if (!department) {
            setQuickAddState(null);
            return;
          }

          if (quickAddState?.mode === 'line') {
            setLineModalState({ department, line: null });
          } else if (quickAddState?.mode === 'station' && lineId) {
            const line = department.lines.find((item) => item.id === lineId);
            if (line) {
              setStationModalState({ department, line, station: null });
            }
          }

          setQuickAddState(null);
        }}
      />

      {createMenuOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/60 px-4">
          <div className="dark relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-1 text-white transition hover:border-white/20 hover:bg-white/10"
              onClick={() => setCreateMenuOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h2 className="text-lg font-semibold text-white">Create new</h2>
              <p className="mt-2 text-sm text-white/70">
                Choose what you want to add to your production hierarchy.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-primary-500/60 hover:bg-primary-500/10"
                onClick={() => {
                  setCreateMenuOpen(false);
                  startDepartmentCreation();
                }}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20 text-primary-200 transition group-hover:bg-primary-500/30">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">Department</p>
                  <p className="mt-1 text-xs text-white/70">Create a new department to group your operations.</p>
                </div>
              </button>

              <button
                type="button"
                className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-primary-500/60 hover:bg-primary-500/10"
                onClick={handleStartLineCreation}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20 text-primary-200 transition group-hover:bg-primary-500/30">
                  <GitBranch className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">Line</p>
                  <p className="mt-1 text-xs text-white/70">Add a production line inside an existing department.</p>
                </div>
              </button>

              <button
                type="button"
                className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-primary-500/60 hover:bg-primary-500/10"
                onClick={handleStartStationCreation}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-500/20 text-primary-200 transition group-hover:bg-primary-500/30">
                  <Milestone className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">Station</p>
                  <p className="mt-1 text-xs text-white/70">Create a station within one of your production lines.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
