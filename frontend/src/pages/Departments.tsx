/*
 * SPDX-License-Identifier: MIT
 */

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Building2,
  Download,
  Factory,
  Filter,
  GitBranch,
  Layers,
  Plus,
  RefreshCcw,
  Search,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { saveAs } from 'file-saver';
import Button from '@/components/common/Button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import DepartmentTable from '@/components/departments/DepartmentTable';
import DepartmentModal, { type DepartmentFormValues } from '@/components/departments/DepartmentModal';
import LineModal from '@/components/departments/LineModal';
import StationModal from '@/components/departments/StationModal';
import AssetModal from '@/components/departments/AssetModal';
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
  exportDepartmentsExcel,
  importDepartmentsExcel,
  updateDepartment,
  updateAsset,
  updateLine,
  updateStation,
  type DepartmentPayload,
} from '@/api/departments';
import type {
  Asset,
  DepartmentHierarchy,
  LineWithStations,
  StationWithAssets,
} from '@/types';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/utils/cn';

type AssetCategory = Asset['type'] | 'All';

const PAGE_SIZE = 5;
const ASSET_TYPE_OPTIONS: Array<{ value: AssetCategory; label: string }> = [
  { value: 'All', label: 'All assets' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'Mechanical', label: 'Mechanical' },
  { value: 'Tooling', label: 'Tooling' },
  { value: 'Interface', label: 'Interface' },
];

const Departments = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<DepartmentHierarchy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory>('All');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentEditing, setDepartmentEditing] = useState<DepartmentHierarchy | null>(null);
  const [departmentSaving, setDepartmentSaving] = useState(false);

  const [lineModalState, setLineModalState] = useState<{
    department: DepartmentHierarchy;
    line: LineWithStations | null;
  } | null>(null);
  const [lineSaving, setLineSaving] = useState(false);
  const [lineDeleteState, setLineDeleteState] = useState<{
    department: DepartmentHierarchy;
    line: LineWithStations;
  } | null>(null);

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

  const handleEditPlant = useCallback(
    (plant: DepartmentHierarchy['plant']) => {
      if (!plant || !plant.id || plant.id === 'unassigned') {
        navigate('/plants');
        return;
      }
      navigate(`/plants?plantId=${plant.id}`);
    },
    [navigate],
  );

  const resolvePlantId = useCallback(
    (department: DepartmentHierarchy) =>
      department.plant?.id && department.plant.id !== 'unassigned'
        ? department.plant.id
        : undefined,
    [],
  );

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

  const hierarchyStats = useMemo(() => {
    const plantIds = new Set<string>();
    let lines = 0;
    let stations = 0;
    let assets = 0;

    departments.forEach((department) => {
      const plantId = department.plant?.id;
      if (plantId && plantId !== 'unassigned') {
        plantIds.add(plantId);
      }

      department.lines.forEach((line) => {
        lines += 1;
        line.stations.forEach((station) => {
          stations += 1;
          assets += station.assets.length;
        });
      });
    });

    return {
      plants: plantIds.size,
      departments: departments.length,
      lines,
      stations,
      assets,
    };
  }, [departments]);

  const assetOptions = useMemo(() => {
    const uniqueAssets = new Map<string, string>();
    departments.forEach((department) => {
      department.lines.forEach((line) => {
        line.stations.forEach((station) => {
          station.assets.forEach((asset) => {
            if (!uniqueAssets.has(asset.id)) {
              uniqueAssets.set(asset.id, asset.name);
            }
          });
        });
      });
    });
    return Array.from(uniqueAssets, ([id, name]) => ({ id, name }));
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((department) => {
      const plantName = department.plant?.name?.toLowerCase() ?? '';
      const plantLocation = department.plant?.location?.toLowerCase() ?? '';
      const plantDescription = department.plant?.description?.toLowerCase() ?? '';

      const matchesSearch =
        normalizedSearch.length === 0 ||
        department.name.toLowerCase().includes(normalizedSearch) ||
        plantName.includes(normalizedSearch) ||
        plantLocation.includes(normalizedSearch) ||
        plantDescription.includes(normalizedSearch) ||
        department.lines.some((line) => {
          if (line.name.toLowerCase().includes(normalizedSearch)) {
            return true;
          }
          return line.stations.some((station) => {
            if (station.name.toLowerCase().includes(normalizedSearch)) {
              return true;
            }
            return station.assets.some((asset) => {
              const assetName = asset.name?.toLowerCase() ?? '';
              if (assetName.includes(normalizedSearch)) {
                return true;
              }
              return asset.type?.toLowerCase() === normalizedSearch;
            });
          });
        });
      if (!matchesSearch) return false;
      if (categoryFilter === 'All') return true;
      return department.lines.some((line) =>
        line.stations.some((station) => station.assets.some((asset) => asset.type === categoryFilter)),
      );
    });
  }, [departments, normalizedSearch, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const paginatedDepartments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDepartments.slice(start, start + PAGE_SIZE);
  }, [filteredDepartments, currentPage]);

  const hasActiveFilters = normalizedSearch.length > 0 || categoryFilter !== 'All';
  const hasDepartments = departments.length > 0;
  const hasUnassignedDepartments = useMemo(
    () => departments.some((department) => !department.plant || department.plant.id === 'unassigned'),
    [departments],
  );

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('All');
  };

  const handleDepartmentSave = async (values: DepartmentFormValues) => {
    setDepartmentSaving(true);
    try {
      const { plantId, plant } = values;
      if (departmentEditing) {
        const departmentPayload: DepartmentPayload = {
          name: values.name,
          plantId,
        };
        if (values.description !== undefined) {
          departmentPayload.description = values.description ?? '';
        }
        await updateDepartment(departmentEditing.id, departmentPayload);

        const trimmedLines = values.lines.map((line) => ({
          ...line,
          name: line.name.trim(),
          stations: line.stations.map((station) => ({
            ...station,
            name: station.name.trim(),
          })),
        }));

        const existingLines = departmentEditing.lines;

        const linesToDelete = existingLines.filter(
          (line) => !trimmedLines.some((candidate) => candidate.id === line.id),
        );

        const linesToUpdate = trimmedLines.filter((line) => {
          if (!line.id) return false;
          const existing = existingLines.find((candidate) => candidate.id === line.id);
          return existing ? existing.name !== line.name : false;
        });

        const linesToCreate = trimmedLines.filter((line) => !line.id);

        let currentDepartment: DepartmentHierarchy = departmentEditing;
        const lineIdByKey = new Map<string, string>();
        existingLines.forEach((line) => {
          lineIdByKey.set(line.id, line.id);
        });

        for (const line of linesToDelete) {
          const updatedDepartment = await deleteLine(currentDepartment.id, line.id, { plantId });
          currentDepartment = updatedDepartment;
          lineIdByKey.delete(line.id);
          replaceDepartment(updatedDepartment);
        }

        for (const line of linesToUpdate) {
          const updatedDepartment = await updateLine(
            currentDepartment.id,
            line.id!,
            { name: line.name },
            { plantId },
          );
          currentDepartment = updatedDepartment;
          replaceDepartment(updatedDepartment);
        }

        for (const line of linesToCreate) {
          const previousLineIds = new Set(currentDepartment.lines.map((candidate) => candidate.id));
          const updatedDepartment = await createLine(currentDepartment.id, { name: line.name }, { plantId });
          currentDepartment = updatedDepartment;
          replaceDepartment(updatedDepartment);
          const createdLine = updatedDepartment.lines.find(
            (candidate) => !previousLineIds.has(candidate.id) && candidate.name === line.name,
          );
          if (createdLine) {
            lineIdByKey.set(line.key, createdLine.id);
          }
        }

        trimmedLines.forEach((line) => {
          if (line.id) {
            lineIdByKey.set(line.key, line.id);
          }
        });

        for (const line of trimmedLines) {
          const lineId = line.id ?? lineIdByKey.get(line.key);
          if (!lineId) continue;

          let existingStations =
            currentDepartment.lines.find((candidate) => candidate.id === lineId)?.stations ?? [];

          const stationsToDelete = existingStations.filter(
            (station) => !line.stations.some((candidate) => candidate.id === station.id),
          );

          for (const station of stationsToDelete) {
            const updatedDepartment = await deleteStation(currentDepartment.id, lineId, station.id, {
              plantId,
            });
            currentDepartment = updatedDepartment;
            replaceDepartment(updatedDepartment);
          }

          existingStations =
            currentDepartment.lines.find((candidate) => candidate.id === lineId)?.stations ?? [];

          const stationsToUpdate = line.stations.filter((station) => {
            if (!station.id) return false;
            const existing = existingStations.find((candidate) => candidate.id === station.id);
            return existing ? existing.name !== station.name : false;
          });

          for (const station of stationsToUpdate) {
            const updatedDepartment = await updateStation(
              currentDepartment.id,
              lineId,
              station.id!,
              {
                name: station.name,
              },
              { plantId },
            );
            currentDepartment = updatedDepartment;
            replaceDepartment(updatedDepartment);
          }

          const stationsToCreate = line.stations.filter((station) => !station.id);
          for (const station of stationsToCreate) {
            const updatedDepartment = await createStation(
              currentDepartment.id,
              lineId,
              {
                name: station.name,
              },
              { plantId },
            );
            currentDepartment = updatedDepartment;
            replaceDepartment(updatedDepartment);
          }
        }

        const descriptionProvided = values.description !== undefined;
        const nextDescription =
          values.description === null
            ? ''
            : values.description ?? currentDepartment.description ?? '';

        currentDepartment = {
          ...currentDepartment,
          name: values.name,
          ...(descriptionProvided ? { description: nextDescription, notes: nextDescription } : {}),
          plant: plant ?? currentDepartment.plant,
        };
        replaceDepartment(currentDepartment);
        addToast('Department updated', 'success');
      } else {
        const departmentPayload: DepartmentPayload = {
          name: values.name,
          plantId,
        };
        if (values.description !== undefined) {
          departmentPayload.description = values.description ?? '';
        }

        const created = await createDepartment(departmentPayload);
        let currentDepartment = mapDepartmentResponse(created);

        const trimmedLines = values.lines.map((line) => ({
          ...line,
          name: line.name.trim(),
          stations: line.stations.map((station) => ({
            ...station,
            name: station.name.trim(),
          })),
        }));

        for (const line of trimmedLines) {
          if (!line.name) continue;
          const previousLineIds = new Set(currentDepartment.lines.map((candidate) => candidate.id));
          currentDepartment = await createLine(currentDepartment.id, { name: line.name }, { plantId });
          const createdLine = currentDepartment.lines.find(
            (candidate) => !previousLineIds.has(candidate.id) && candidate.name === line.name,
          );
          if (!createdLine) {
            continue;
          }
          for (const station of line.stations) {
            if (!station.name) continue;
            currentDepartment = await createStation(currentDepartment.id, createdLine.id, {
              name: station.name,
            }, { plantId });
          }
        }

        setDepartments((prev) => [...prev, currentDepartment]);
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
      const plantId = resolvePlantId(lineModalState.department);
      const updated = lineModalState.line
        ? await updateLine(
            lineModalState.department.id,
            lineModalState.line.id,
            values,
            { plantId },
          )
        : await createLine(lineModalState.department.id, values, { plantId });
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

  const handleLineDelete = async (
    target?: { department: DepartmentHierarchy; line: LineWithStations } | null,
  ) => {
    const fallback =
      lineModalState?.line && lineModalState.department
        ? { department: lineModalState.department, line: lineModalState.line }
        : null;
    const current = target ?? fallback;
    if (!current) return;
    setLineSaving(true);
    try {
      const plantId = resolvePlantId(current.department);
      const updated = await deleteLine(current.department.id, current.line.id, { plantId });
      replaceDepartment(updated);
      addToast('Line deleted', 'success');
      setLineModalState((prev) =>
        prev?.line?.id === current.line.id ? null : prev,
      );
      setLineDeleteState((prev) =>
        prev?.line.id === current.line.id ? null : prev,
      );
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
      const plantId = resolvePlantId(stationModalState.department);
      const updated = stationModalState.station
        ? await updateStation(
            stationModalState.department.id,
            stationModalState.line.id,
            stationModalState.station.id,
            values,
            { plantId },
          )
        : await createStation(
            stationModalState.department.id,
            stationModalState.line.id,
            values,
            { plantId },
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
      const plantId = resolvePlantId(stationModalState.department);
      const updated = await deleteStation(
        stationModalState.department.id,
        stationModalState.line.id,
        stationModalState.station.id,
        { plantId },
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
      const plantId = resolvePlantId(department);
      const updated = asset
        ? await updateAsset(department.id, line.id, station.id, asset.id, values, { plantId })
        : await createAsset(department.id, line.id, station.id, values, { plantId });
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
      const plantId = resolvePlantId(department);
      const updated = await deleteAsset(department.id, line.id, station.id, asset.id, { plantId });
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportDepartmentsExcel();
      const timestamp = new Date().toISOString().split('T')[0];
      saveAs(blob, `departments-${timestamp}.xlsx`);
      addToast('Departments exported', 'success');
    } catch (err) {
      console.error('Failed to export departments', err);
      addToast('Failed to export departments', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    if (importing) return;
    fileInputRef.current?.click();
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? [];
    if (!file) return;
    setImporting(true);
    try {
      const summary = await importDepartmentsExcel(file);
      addToast(
        `Imported ${summary.createdDepartments} departments (${summary.createdLines} lines, ${summary.createdStations} stations, ${summary.createdAssets} assets)`,
        'success',
      );
      if (summary.warnings.length > 0) {
        console.warn('Department import warnings:', summary.warnings);
        addToast(`${summary.warnings.length} rows skipped during import`, 'error');
      }
      await loadDepartments();
    } catch (err) {
      console.error('Failed to import departments', err);
      addToast('Failed to import departments', 'error');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-900 via-indigo-800 to-blue-700 p-6 text-white shadow">
        <div className="absolute -right-24 top-1/2 hidden h-48 w-48 -translate-y-1/2 rounded-full bg-white/10 blur-3xl md:block" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="rounded-xl bg-white/20 p-3">
                <Building2 className="h-6 w-6" />
              </span>
              <div className="space-y-2">
                <div>
                  <h1 className="text-2xl font-semibold">Departments</h1>
                  <p className="mt-1 max-w-2xl text-sm text-white/80">
                    Audit, enrich, and maintain the full production hierarchy so frontline teams always know where work lives.
                  </p>
                </div>
                {hasUnassignedDepartments && (
                  <div className="flex items-start gap-2 rounded-xl border border-white/30 bg-white/10 p-3 text-sm backdrop-blur">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                    <p className="text-white/90">
                      Some departments are not linked to a plant. Assign them to keep planning, maintenance, and reporting aligned.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/plants')}
                className="backdrop-blur-sm bg-white/15 text-white hover:bg-white/20"
              >
                <Factory className="mr-2 h-4 w-4" />
                Manage plants
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={startDepartmentCreation}
                className="bg-white text-primary-700 hover:bg-white/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                New department
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                loading={importing}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                {!importing && <Upload className="mr-2 h-4 w-4" />}
                Import Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                loading={exporting}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                {!exporting && <Download className="mr-2 h-4 w-4" />}
                Export Excel
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportChange}
            />
          </div>

          {hasDepartments && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[{
                label: 'Plants represented',
                value: hierarchyStats.plants,
                icon: <Factory className="h-4 w-4" />,
              },
              {
                label: 'Departments',
                value: hierarchyStats.departments,
                icon: <Building2 className="h-4 w-4" />,
              },
              {
                label: 'Lines',
                value: hierarchyStats.lines,
                icon: <GitBranch className="h-4 w-4" />,
              },
              {
                label: 'Stations',
                value: hierarchyStats.stations,
                icon: <Layers className="h-4 w-4" />,
              },
              {
                label: 'Assets tracked',
                value: hierarchyStats.assets,
                icon: <Boxes className="h-4 w-4" />,
              }].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur"
                >
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wide text-white/70">{stat.label}</span>
                    <p className="text-lg font-semibold">{stat.value.toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-white/20 p-2 text-white">{stat.icon}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
            <Search className="h-4 w-4 text-neutral-500" />
            <input
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              placeholder="Search departments, lines, stations, or assets"
              className="w-full border-none bg-transparent text-sm outline-none placeholder:text-neutral-400 dark:text-neutral-100"
            />
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              <Filter className="h-4 w-4" /> Asset type focus
            </span>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPE_OPTIONS.map((option) => {
                const isActive = option.value === categoryFilter;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategoryFilter(option.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900',
                      isActive
                        ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700',
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-neutral-200 pt-4 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            {loading
              ? 'Loading hierarchy…'
              : filteredDepartments.length === 0
              ? 'No departments match the current view.'
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                  currentPage * PAGE_SIZE,
                  filteredDepartments.length,
                )} of ${filteredDepartments.length} departments`}
          </span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reset filters
            </Button>
          )}
        </div>

        <div className="relative mt-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-800/60"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-3 w-64 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-8 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((__, idx) => (
                      <div
                        key={idx}
                        className="h-20 rounded-lg border border-dashed border-neutral-200 bg-white/60 dark:border-neutral-700 dark:bg-neutral-900/40"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-error-200 bg-error-50 p-6 text-sm text-error-700 dark:border-error-800 dark:bg-error-950/40 dark:text-error-200">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={() => void loadDepartments()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : !hasDepartments ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
              <Building2 className="h-10 w-10 text-neutral-400" />
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Start mapping your production network</h2>
                <p className="max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                  Import from Excel or build departments manually to give technicians a dependable source of truth for every asset location.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" onClick={startDepartmentCreation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create first department
                </Button>
                <Button variant="outline" onClick={handleImportClick}>
                  <Upload className="mr-2 h-4 w-4" />
                  Import from Excel
                </Button>
              </div>
            </div>
          ) : (
            <DepartmentTable
              departments={paginatedDepartments}
              categoryFilter={categoryFilter}
              onEditPlant={handleEditPlant}
              onEditDepartment={(department) => {
                setDepartmentEditing(department);
                setDepartmentModalOpen(true);
              }}
              onAddLine={(department) => setLineModalState({ department, line: null })}
              onEditLine={(department, line) => setLineModalState({ department, line })}
              onDeleteLine={(department, line) => setLineDeleteState({ department, line })}
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

        {!loading && !error && hasDepartments && filteredDepartments.length > PAGE_SIZE && (
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
        {...(departmentEditing ? { onDelete: handleDepartmentDelete } : {})}
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
        {...(lineModalState?.line ? { onDelete: () => handleLineDelete() } : {})}
        {...(lineModalState?.line ? { onAddStation: handleSwitchToAddStation } : {})}
      />

      <ConfirmDialog
        open={Boolean(lineDeleteState)}
        title="Delete line?"
        message={
          lineDeleteState
            ? `Deleting "${lineDeleteState.line.name}" will remove all stations and assets tied to this line.`
            : undefined
        }
        confirmText="Delete line"
        onClose={() => setLineDeleteState(null)}
        onConfirm={() => handleLineDelete(lineDeleteState)}
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
        {...(stationModalState?.station ? { onDelete: handleStationDelete } : {})}
        {...(stationModalState && !stationModalState.station ? { onAddLine: handleSwitchToAddLine } : {})}
      />

      <AssetModal
        open={Boolean(assetModalState)}
        initial={assetModalState?.asset ?? null}
        loading={assetSaving}
        assetOptions={assetOptions}
        onClose={() => {
          if (assetSaving) return;
          setAssetModalState(null);
        }}
        onSave={handleAssetSave}
        {...(assetModalState?.asset ? { onDelete: handleAssetDelete } : {})}
      />

    </div>
  );
};

export default Departments;
