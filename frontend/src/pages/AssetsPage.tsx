/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Copy,
  FileSpreadsheet,
  Pencil,
  PlayCircle,
  PlusCircle,
  RefreshCcw,
  Scan,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import AssetTable from '@/components/assets/AssetTable';
import AssetModal from '@/components/assets/AssetModal';
import WorkOrderModal from '@/components/work-orders/WorkOrderModal';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import http, { TENANT_KEY } from '@/lib/http';
import { enqueueAssetRequest, onSyncConflict, type SyncConflict } from '@/utils/offlineQueue';
import { useAssetStore } from '@/store/assetStore';
import type { Asset } from '@/types';
import { duplicateAsset } from '@/utils/duplicate';
import ConflictResolver from '@/components/offline/ConflictResolver';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { usePermissions } from '@/auth/usePermissions';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useScopeContext } from '@/context/ScopeContext';
import { useToast } from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { uploadImport, type ImportSummary } from '@/api/importExport';

const ASSET_CACHE_KEY = 'offline-assets';
const FILTER_STORAGE_VERSION = 1;

const SAVED_VIEWS = [
  { id: 'custom', label: 'Custom filters' },
  { id: 'all', label: 'All assets', search: '', status: '', criticality: '' },
  { id: 'critical', label: 'Critical assets', search: '', status: '', criticality: 'high' },
  { id: 'offline', label: 'Offline or in repair', search: '', status: 'Offline', criticality: '' },
  { id: 'healthy', label: 'Healthy running', search: '', status: 'Active', criticality: '' },
];

const SAMPLE_ASSETS: Asset[] = [
  {
    id: 'sample-robot-arm',
    tenantId: 'demo',
    plantId: 'sample-plant-1',
    name: 'Kuka Robot Arm KR 6',
    type: 'Mechanical',
    status: 'Active',
    criticality: 'high',
    location: 'Cell A3',
    line: 'Robot Assembly',
    station: 'Pick & Place',
    lastServiced: '2024-12-04',
  },
  {
    id: 'sample-conveyor',
    tenantId: 'demo',
    plantId: 'sample-plant-1',
    name: 'Dorner Conveyor 2200',
    type: 'Mechanical',
    status: 'Active',
    criticality: 'medium',
    location: 'Line 2 - Transfer',
    line: 'Packaging',
    station: 'Conveyor Zone 2',
    lastServiced: '2025-01-22',
  },
  {
    id: 'sample-plc',
    tenantId: 'demo',
    plantId: 'sample-plant-1',
    name: 'Allen-Bradley CompactLogix',
    type: 'Electrical',
    status: 'Offline',
    criticality: 'high',
    location: 'Control Cabinet CC-14',
    line: 'Filling',
    station: 'Controls',
    lastServiced: '2024-11-10',
  },
];

const AssetsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const assets = useAssetStore((s) => s.assets);
  const setAssets = useAssetStore((s) => s.setAssets);
  const addAsset = useAssetStore((s) => s.addAsset);
  const updateAsset = useAssetStore((s) => s.updateAsset);
  const removeAsset = useAssetStore((s) => s.removeAsset);

  const { addToast } = useToast();
  const { can } = usePermissions();
  const { t } = useTranslation();
  const { activePlant, loadingPlants } = useScopeContext();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [savedView, setSavedView] = useState('custom');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWO, setShowWO] = useState(false);
  const [woAsset, setWoAsset] = useState<Asset | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [showSampleData, setShowSampleData] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const isFetching = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const filterPreferenceKey = useMemo(
    () => `assets.filters.v${FILTER_STORAGE_VERSION}:${user?.id ?? 'guest'}`,
    [user],
  );

  const scopedAssets = useMemo(() => {
    if (!activePlant) return assets;
    return assets.filter((asset) => {
      const assetPlant = asset.plantId ?? asset.siteId;
      return assetPlant ? assetPlant === activePlant.id : false;
    });
  }, [activePlant, assets]);

  const filteredAssets = useMemo(() => {
    const sourceAssets = showSampleData ? SAMPLE_ASSETS : scopedAssets;
    const matchesSearch = (asset: Asset) => {
      if (!search.trim()) return true;
      return Object.values(asset).some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    };

    const filtered = sourceAssets.filter((asset) => {
      const matchesStatus = !statusFilter || (asset.status ?? '').toLowerCase() === statusFilter.toLowerCase();
      const matchesCriticality =
        !criticalityFilter || (asset.criticality ?? '').toLowerCase() === criticalityFilter.toLowerCase();

      return matchesStatus && matchesCriticality && matchesSearch(asset);
    });

    return filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [criticalityFilter, scopedAssets, search, showSampleData, statusFilter]);

  const applySavedView = useCallback(
    (viewId: string) => {
      setSavedView(viewId);
      const preset = SAVED_VIEWS.find((view) => view.id === viewId);
      if (!preset) return;

      if ('search' in preset) {
        setSearch(preset.search ?? '');
      }
      if ('status' in preset) {
        setStatusFilter(preset.status ?? '');
      }
      if ('criticality' in preset) {
        setCriticalityFilter(preset.criticality ?? '');
      }
    },
    [],
  );

  useEffect(() => {
    const stored = safeLocalStorage.getItem(filterPreferenceKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        version?: number;
        search?: string;
        status?: string;
        criticality?: string;
        savedView?: string;
      };

      if (parsed.version && parsed.version !== FILTER_STORAGE_VERSION) return;

      setSearch(parsed.search ?? '');
      setStatusFilter(parsed.status ?? '');
      setCriticalityFilter(parsed.criticality ?? '');
      setSavedView(parsed.savedView ?? 'custom');
    } catch (err) {
      console.error('Failed to load asset filter preferences', err);
    }
  }, [filterPreferenceKey]);

  useEffect(() => {
    safeLocalStorage.setItem(
      filterPreferenceKey,
      JSON.stringify({
        version: FILTER_STORAGE_VERSION,
        search,
        status: statusFilter,
        criticality: criticalityFilter,
        savedView,
      }),
    );
  }, [criticalityFilter, filterPreferenceKey, savedView, search, statusFilter]);

  const formatCriticalityLabel = (value?: Asset['criticality']) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : 'N/A';

  const formatMaintenanceLabel = (asset: Asset) =>
    asset.lastMaintenanceDate ?? asset.lastPmDate ?? asset.lastServiced ?? 'N/A';

  const formatOpenWorkOrdersLabel = (value?: number) =>
    typeof value === 'number' ? `${value} open WO${value === 1 ? '' : 's'}` : 'Open WOs: N/A';

  const formatDowntimeLabel = (value?: number) =>
    typeof value === 'number' ? `${value}h downtime` : 'Downtime: N/A';

  useEffect(() => {
    const unsub = onSyncConflict(setConflict);
    return () => unsub();
  }, []);

  const resolveConflict = async (choice: 'local' | 'server') => {
    if (!conflict) return;
    if (choice === 'local') {
      await http({ method: conflict.method, url: conflict.url, data: conflict.local });
    }
    setConflict(null);
  };

  const blockSampleEdits = (action: string) => {
    addToast(`Turn off sample data to ${action}.`, 'error');
  };

  const loadCachedAssets = () => {
    const cached = safeLocalStorage.getItem(ASSET_CACHE_KEY);
    if (cached) {
      const cachedAssets: Asset[] = JSON.parse(cached);
      setAssets(cachedAssets);
      addToast('Showing cached assets', 'error');
      return true;
    }
    return false;
  };

  const fetchAssets = useCallback(async () => {
    if (isFetching.current) return;
    if (loadingPlants) return;
    if (!activePlant) {
      setError('Select a plant to view assets');
      setAssets([]);
      return;
    }
    isFetching.current = true;
    if (!navigator.onLine) {
      if (!loadCachedAssets()) {
        setError('Failed to load assets while offline');
      }
      isFetching.current = false;
      return;
    }

    try {
      setIsLoading(true);
      interface AssetResponse extends Partial<Asset> { _id?: string; id?: string }
      const res = await http.get<AssetResponse[]>('/assets', {
        params: { plantId: activePlant.id },
      });
      const normalized: Asset[] = Array.isArray(res.data)
        ? res.data.flatMap((asset) => {
            const { _id, id: assetId, name, ...rest } = asset;
            const resolvedId = _id ?? assetId;
            if (!resolvedId) return [] as Asset[];
            const restFields: Partial<Omit<Asset, 'id' | 'name'>> = rest;
            const normalizedAsset: Asset = {
              id: resolvedId,
              tenantId: restFields.tenantId ?? safeLocalStorage.getItem(TENANT_KEY) ?? 'unknown-tenant',
              name: name ?? 'Unnamed Asset',
              ...restFields,
            };
            return [normalizedAsset];
          })
        : [];

      const filteredByPlant = normalized.filter((asset) => {
        const assetPlant = asset.plantId ?? asset.siteId;
        return assetPlant ? assetPlant === activePlant.id : false;
      });

      setAssets(filteredByPlant);
      safeLocalStorage.setItem(ASSET_CACHE_KEY, JSON.stringify(filteredByPlant));
      setError(null);
    } catch (err) {
      console.error('Error fetching assets:', err);
      if (!loadCachedAssets()) {
        setError('Failed to load assets');
      }
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [activePlant, addToast, loadingPlants, setAssets]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (searchParams.get('intent') === 'create') {
      setSelected(null);
      setModalOpen(true);
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete('intent');
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSave = (asset: Asset) => {
    if (showSampleData) {
      blockSampleEdits('add or edit assets');
      return;
    }

    const assetWithPlant = activePlant
      ? {
          ...asset,
          plantId: asset.plantId ?? activePlant.id,
          siteId: asset.siteId ?? activePlant.id,
        }
      : asset;

    if (assets.find((a) => a.id === asset.id)) {
      updateAsset(assetWithPlant);
    } else {
      addAsset(assetWithPlant);
    }
    setModalOpen(false);
  };

  const handleDuplicate = async (asset: Asset) => {
    if (showSampleData) {
      blockSampleEdits('duplicate assets');
      return;
    }

    const clone = duplicateAsset({
      ...asset,
      plantId: asset.plantId ?? activePlant?.id,
      siteId: asset.siteId ?? activePlant?.id,
    });
    if (!navigator.onLine) {
      enqueueAssetRequest('post', clone);
      addAsset({ ...clone, id: Date.now().toString() });
      return;
    }
    const res = await http.post('/assets', clone);
    addAsset({ ...res.data, id: res.data._id ?? res.data.id });
  };

  const handleDelete = async (id: string) => {
    if (showSampleData) {
      blockSampleEdits('delete assets');
      return;
    }

    if (!navigator.onLine) {
      enqueueAssetRequest('delete', { id } as Asset);
      removeAsset(id);
      return;
    }
    await http.delete(`/assets/${id}`);
    removeAsset(id);
  };

  const stats = useMemo(() => {
    const total = filteredAssets.length;
    const active = filteredAssets.filter((asset) => (asset.status ?? '').toLowerCase() === 'active').length;
    const critical = filteredAssets.filter((asset) => asset.criticality === 'high').length;
    return { total, active, critical };
  }, [filteredAssets]);

  const canManageAssets = can('hierarchy', 'write');
  const canDeleteAssets = can('hierarchy', 'delete');
  const canCreateWorkOrders = can('workRequests', 'convert');

  const handleTemplateDownload = () => {
    const anchor = document.createElement('a');
    anchor.href = '/assets-import-template.csv';
    anchor.download = 'assets-import-template.csv';
    anchor.click();
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const summary = await uploadImport('assets', file);
      setImportSummary(summary);
      addToast(`Validated ${summary.totalRows.toLocaleString()} rows from ${file.name}`, 'success');
    } catch (err) {
      console.error('Asset import failed', err);
      addToast('Import failed. Please try again.', 'error');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const displayError = showSampleData ? null : error;
  const actionsDisabled = !canManageAssets || !activePlant || showSampleData;

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-neutral-600">Assets</p>
            <h1 className="text-3xl font-bold text-neutral-900">Asset catalog</h1>
            <p className="text-neutral-600 mt-1">
              Browse the list of assets, make quick edits, and add new equipment to your hierarchy.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => navigate('/assets/scan')}
              aria-label="Scan an asset QR or barcode"
            >
              <Scan className="w-5 h-5 mr-2" />
              Scan QR/Barcode
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={fetchAssets}
              disabled={isLoading}
            >
              <RefreshCcw className="w-5 h-5 mr-2" />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                setSelected(null);
                setModalOpen(true);
              }}
              disabled={actionsDisabled}
              aria-disabled={actionsDisabled}
              title={
                !canManageAssets
                  ? t('assets.permissionWarning')
                  : showSampleData
                    ? 'Turn off sample data to add live assets'
                    : !activePlant
                      ? 'Select a plant to create assets'
                      : undefined
              }
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Add asset
            </Button>
          </div>
        </div>

        {!canManageAssets && (
          <div
            className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100"
            role="alert"
          >
            <span className="mt-0.5 text-amber-300">⚠️</span>
            <div>
              <p className="font-semibold">{t('assets.readOnlyTitle')}</p>
              <p>{t('assets.permissionWarning')}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-neutral-300 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                <input
                  type="checkbox"
                  checked={showSampleData}
                  onChange={(event) => {
                    setShowSampleData(event.target.checked);
                    if (event.target.checked) {
                      setError(null);
                    }
                  }}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                Enable sample data for demos & training
              </label>
              {showSampleData && (
                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-100">
                  Read-only mode
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Sample assets stay local to your session so you can demo search, filtering, and table actions without touching live data.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-sm text-neutral-500">Total assets</p>
            <p className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-sm text-neutral-500">Active</p>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-sm text-neutral-500">Critical</p>
            <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{stats.critical}</p>
          </div>
        </div>

        {displayError && <p className="text-red-600" role="alert">{displayError}</p>}

        <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="grid gap-3 md:grid-cols-[2fr,1fr,1fr,1fr] md:items-end">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Search</span>
              <input
                type="text"
                placeholder="Search assets..."
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:text-neutral-100 dark:placeholder:text-neutral-400"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSavedView('custom');
                  setSearch(e.target.value);
                }}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Saved view</span>
              <select
                value={savedView}
                onChange={(event) => applySavedView(event.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:text-neutral-100"
              >
                {SAVED_VIEWS.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setSavedView('custom');
                  setStatusFilter(event.target.value);
                }}
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:text-neutral-100"
              >
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Offline">Offline</option>
                <option value="In Repair">In Repair</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Criticality</span>
              <select
                value={criticalityFilter}
                onChange={(event) => {
                  setSavedView('custom');
                  setCriticalityFilter(event.target.value);
                }}
                className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-600 dark:text-neutral-100"
              >
                <option value="">All levels</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
          </div>
        </div>

        {!activePlant && !loadingPlants && !showSampleData && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100" role="alert">
            <span className="mt-0.5 text-amber-300">⚠️</span>
            <div>
              <p className="font-semibold">Select a plant to manage assets</p>
              <p>Use the plant switcher in the header to choose the site whose assets you want to view.</p>
            </div>
          </div>
        )}

        {filteredAssets.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-neutral-600">Existing assets</p>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Assets already created</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Quickly jump back into an asset to review details or make changes.
                </p>
              </div>
              <Button variant="outline" onClick={fetchAssets} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isLoading ? 'Refreshing...' : 'Refresh list'}
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white/70 px-4 py-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
                >
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{asset.name}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {asset.type ?? 'Type not specified'}
                      {asset.location ? ` • ${asset.location}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge text={`Criticality: ${formatCriticalityLabel(asset.criticality)}`} type="priority" size="sm" />
                      <Badge text={`Health: ${asset.health ?? 'N/A'}`} type="status" size="sm" />
                      <Badge text={`Last maintenance: ${formatMaintenanceLabel(asset)}`} size="sm" />
                      <Badge text={formatOpenWorkOrdersLabel(asset.openWorkOrders)} size="sm" />
                      <Badge text={formatDowntimeLabel(asset.recentDowntimeHours)} size="sm" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (showSampleData) {
                          blockSampleEdits('edit assets');
                          return;
                        }
                        setSelected(asset);
                        setModalOpen(true);
                      }}
                      disabled={!canManageAssets || showSampleData}
                      aria-disabled={!canManageAssets || showSampleData}
                      title={
                        showSampleData
                          ? 'Turn off sample data to edit live assets'
                          : !canManageAssets
                            ? t('assets.permissionWarning')
                            : undefined
                      }
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(asset)}
                      disabled={!canManageAssets || showSampleData}
                      aria-disabled={!canManageAssets || showSampleData}
                      title={
                        showSampleData
                          ? 'Turn off sample data to duplicate live assets'
                          : !canManageAssets
                            ? t('assets.permissionWarning')
                            : undefined
                      }
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(asset.id)}
                      disabled={!canDeleteAssets || showSampleData}
                      aria-disabled={!canDeleteAssets || showSampleData}
                      title={
                        showSampleData
                          ? 'Turn off sample data to delete live assets'
                          : !canDeleteAssets
                            ? t('assets.permissionWarning')
                            : undefined
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && filteredAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            <p className="text-lg font-semibold">No assets yet</p>
            <p className="max-w-xl text-sm text-neutral-600 dark:text-neutral-300">
              Start building your asset catalog to track equipment details, status, and maintenance history. You can add new assets or import them from your existing records.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setSelected(null);
                  setModalOpen(true);
                }}
                disabled={actionsDisabled}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add asset
              </Button>
              <Button variant="outline" onClick={fetchAssets} disabled={isLoading || showSampleData}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh list
              </Button>
              <Button variant="outline" onClick={handleImportClick} disabled={importing}>
                <UploadCloud className="mr-2 h-4 w-4" />
                Validate CSV import
              </Button>
              <Button variant="ghost" onClick={handleTemplateDownload}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Download CSV template
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/documentation/asset-management/assets')}
              >
                <PlayCircle className="mr-2 h-4 w-4" />
                Add first asset walkthrough
              </Button>
            </div>
            {importSummary && (
              <div className="mt-2 rounded-md bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-900/70 dark:text-neutral-300">
                Last import preview: {importSummary.validRows.toLocaleString()} valid rows out of {importSummary.totalRows.toLocaleString()} ({importSummary.errors.length.toLocaleString()} issues)
              </div>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportChange}
              className="hidden"
            />
          </div>
        )}

        <AssetTable
          assets={filteredAssets}
          search={search}
          statusFilter={statusFilter}
          criticalityFilter={criticalityFilter}
          onRowClick={(a) => { setSelected(a); setModalOpen(true); }}
          onDuplicate={handleDuplicate}
          onDelete={(a) => handleDelete(a.id)}
          onCreateWorkOrder={(a) => {
            if (showSampleData) {
              blockSampleEdits('create work orders from sample assets');
              return;
            }
            setWoAsset(a);
            setShowWO(true);
          }}
          canEdit={canManageAssets && !showSampleData}
          canDelete={canDeleteAssets && !showSampleData}
          canCreateWorkOrder={canCreateWorkOrders && !showSampleData}
          readOnlyReason={
            showSampleData
              ? 'Sample data is read-only. Turn off the toggle to edit live assets.'
              : t('assets.permissionWarning')
          }
        />

        <AssetModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          asset={selected}
          onUpdate={handleSave}
        />

        <WorkOrderModal
          isOpen={showWO}
          onClose={() => setShowWO(false)}
          workOrder={null}
          {...(woAsset ? { initialData: { assetId: woAsset.id } } : {})}
          onUpdate={async (payload) => {
            try {
              if (payload instanceof FormData) {
                await http.post('/workorders', payload, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
              } else {
                await http.post('/workorders', payload);
              }
            } catch (err) {
              console.error(err);
            }
            setShowWO(false);
          }}
        />
      </div>
      <ConflictResolver
        conflict={conflict}
        onResolve={resolveConflict}
        onClose={() => setConflict(null)}
      />
    </>
  );
};

export default AssetsPage;
