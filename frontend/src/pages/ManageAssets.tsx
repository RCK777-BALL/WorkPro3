/*
 * SPDX-License-Identifier: MIT
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCcw } from 'lucide-react';
import AssetTable from '@/components/assets/AssetTable';
import AssetModal from '@/components/assets/AssetModal';
import Button from '@/components/common/Button';
import http, { TENANT_KEY } from '@/lib/http';
import { useAssetStore } from '@/store/assetStore';
import type { Asset } from '@/types';
import { duplicateAsset } from '@/utils/duplicate';
import { enqueueAssetRequest } from '@/utils/offlineQueue';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { useToast } from '@/context/ToastContext';
import ConflictResolver from '@/components/offline/ConflictResolver';
import { onSyncConflict, type SyncConflict } from '@/utils/offlineQueue';
import AssetQRCode from '@/components/qr/AssetQRCode';

const ASSET_CACHE_KEY = 'offline-manage-assets';

const ManageAssets = () => {
  const assets = useAssetStore((s) => s.assets);
  const setAssets = useAssetStore((s) => s.setAssets);
  const addAsset = useAssetStore((s) => s.addAsset);
  const updateAsset = useAssetStore((s) => s.updateAsset);
  const removeAsset = useAssetStore((s) => s.removeAsset);

  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<NonNullable<Asset['status']>>('Active');
  const [bulkSite, setBulkSite] = useState('');
  const [bulkTenant, setBulkTenant] = useState('');
  const [qrPreviewAsset, setQrPreviewAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);

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

  const loadCachedAssets = useCallback(() => {
    const cached = safeLocalStorage.getItem(ASSET_CACHE_KEY);
    if (cached) {
      try {
        setAssets(JSON.parse(cached));
        addToast('Showing cached assets', 'error');
        return true;
      } catch (err) {
        console.error('Failed to read cached assets', err);
        safeLocalStorage.removeItem(ASSET_CACHE_KEY);
      }
    }
    return false;
  }, [addToast, setAssets]);

  const fetchAssets = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    if (!navigator.onLine) {
      if (!loadCachedAssets()) {
        setError('Failed to load assets while offline');
      }
      isLoadingRef.current = false;
      setIsLoading(false);
      return;
    }

    try {
      interface AssetResponse extends Partial<Asset> { _id?: string; id?: string }
      const res = await http.get<AssetResponse[]>('/assets');
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

      setAssets(normalized);
      safeLocalStorage.setItem(ASSET_CACHE_KEY, JSON.stringify(normalized));
      setError(null);
    } catch (err) {
      console.error('Error fetching assets', err);
      if (!loadCachedAssets()) {
        setError('Unable to load assets');
      }
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [loadCachedAssets, setAssets]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => assets.some((asset) => asset.id === id)));
  }, [assets]);

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
    if (assets.find((a) => a.id === asset.id)) {
      updateAsset(asset);
    } else {
      addAsset(asset);
    }
    setModalOpen(false);
  };

  const handleDuplicate = async (asset: Asset) => {
    const clone = duplicateAsset(asset);
    if (!navigator.onLine) {
      enqueueAssetRequest('post', clone);
      addAsset({ ...clone, id: Date.now().toString() });
      return;
    }
    const res = await http.post('/assets', clone);
    addAsset({ ...res.data, id: res.data._id ?? res.data.id });
  };

  const handleDelete = async (id: string) => {
    if (!navigator.onLine) {
      enqueueAssetRequest('delete', { id } as Asset);
      removeAsset(id);
      return;
    }
    await http.delete(`/assets/${id}`);
    removeAsset(id);
  };

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.includes(asset.id)),
    [assets, selectedIds]
  );

  const persistAsset = async (asset: Asset) => {
    if (!navigator.onLine) {
      enqueueAssetRequest('put', asset);
      return;
    }
    await http.put(`/assets/${asset.id}`, asset);
  };

  const applyBulkUpdate = async (changes: Partial<Asset>, successMessage: string) => {
    if (!selectedAssets.length) return;
    try {
      await Promise.all(
        selectedAssets.map(async (asset) => {
          const updated: Asset = { ...asset, ...changes } as Asset;
          await persistAsset(updated);
          updateAsset(updated);
        })
      );
      addToast(successMessage, 'success');
      setSelectedIds([]);
    } catch (err) {
      console.error('Bulk update failed', err);
      addToast('Unable to update selected assets', 'error');
    }
  };

  const handleBulkStatusChange = (status: NonNullable<Asset['status']>) =>
    applyBulkUpdate({ status }, `Updated status for ${selectedAssets.length} assets`);

  const handleBulkReassign = () =>
    applyBulkUpdate(
      { ...(bulkSite ? { siteId: bulkSite } : {}), ...(bulkTenant ? { tenantId: bulkTenant } : {}) },
      `Reassigned ${selectedAssets.length} assets`
    );

  const handleArchiveSelection = () =>
    applyBulkUpdate({ status: 'Offline' }, `Archived ${selectedAssets.length} assets`);

  const handleExportSelection = () => {
    if (!selectedAssets.length) return;
    const headers = ['Name', 'Status', 'Location', 'Department', 'Site', 'Tenant', 'Serial Number'];
    const rows = selectedAssets.map((asset) => [
      asset.name,
      asset.status ?? '',
      asset.location ?? '',
      asset.department ?? '',
      asset.siteId ?? '',
      asset.tenantId ?? '',
      asset.serialNumber ?? '',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assets-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${selectedAssets.length} assets to CSV`, 'success');
  };

  const handleCreateWorkOrder = (asset: Asset) => {
    navigate(`/workorders/new?assetId=${asset.id}`);
  };

  const handleViewHistory = (asset: Asset) => {
    navigate(`/assets/${asset.id}?tab=history`);
  };

  const handleViewQr = (asset: Asset) => {
    setQrPreviewAsset(asset);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-neutral-600">Assets</p>
          <h1 className="text-2xl font-bold text-neutral-900">Manage Assets</h1>
          <p className="text-neutral-600 mt-1">Add new equipment, edit details, duplicate templates, or remove retired assets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAssets} disabled={isLoading}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="primary" onClick={() => { setSelected(null); setModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {error && <p className="text-red-600" role="alert">{error}</p>}

      <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700">
        <input
          type="text"
          placeholder="Search assets..."
          className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {selectedIds.length} assets selected
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                Update status, reassign site/tenant, archive, or export these records.
              </p>
            </div>
            <Button variant="outline" onClick={() => setSelectedIds([])}>
              Clear selection
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm text-neutral-600 dark:text-neutral-300">Bulk status</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as NonNullable<Asset['status']>)}
                >
                  <option value="Active">Active</option>
                  <option value="Offline">Offline</option>
                  <option value="In Repair">In Repair</option>
                </select>
                <Button variant="primary" onClick={() => handleBulkStatusChange(bulkStatus)}>
                  Update
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-600 dark:text-neutral-300">Reassign site</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  value={bulkSite}
                  onChange={(e) => setBulkSite(e.target.value)}
                  placeholder="Site id"
                />
                <Button variant="secondary" onClick={handleBulkReassign}>
                  Apply
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-neutral-600 dark:text-neutral-300">Reassign tenant</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  value={bulkTenant}
                  onChange={(e) => setBulkTenant(e.target.value)}
                  placeholder="Tenant id"
                />
                <Button variant="secondary" onClick={handleBulkReassign}>
                  Apply
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleArchiveSelection}>
              Archive
            </Button>
            <Button variant="outline" onClick={handleExportSelection}>
              Export CSV
            </Button>
          </div>
        </div>
      )}

      <AssetTable
        assets={assets}
        search={search}
        onRowClick={(a) => { setSelected(a); setModalOpen(true); }}
        onDuplicate={handleDuplicate}
        onDelete={(a) => handleDelete(a.id)}
        onCreateWorkOrder={handleCreateWorkOrder}
        onViewMaintenance={handleViewHistory}
        onViewQrCode={handleViewQr}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <AssetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        asset={selected}
        onUpdate={handleSave}
      />

      <ConflictResolver
        conflict={conflict}
        onResolve={resolveConflict}
        onClose={() => setConflict(null)}
      />

      {qrPreviewAsset && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{qrPreviewAsset.name}</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Scan to jump directly to this asset.</p>
              </div>
              <button
                type="button"
                className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                onClick={() => setQrPreviewAsset(null)}
                aria-label="Close QR preview"
              >
                ×
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <AssetQRCode value={qrPreviewAsset.qrCode ?? qrPreviewAsset.id} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAssets;
