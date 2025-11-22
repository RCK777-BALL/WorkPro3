/*
 * SPDX-License-Identifier: MIT
 */

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCcw } from 'lucide-react';
import AssetTable from '@/components/assets/AssetTable';
import AssetModal from '@/components/assets/AssetModal';
import Button from '@/components/common/Button';
import http from '@/lib/http';
import { useAssetStore } from '@/store/assetStore';
import type { Asset } from '@/types';
import { duplicateAsset } from '@/utils/duplicate';
import { enqueueAssetRequest } from '@/utils/offlineQueue';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { useToast } from '@/context/ToastContext';
import ConflictResolver from '@/components/offline/ConflictResolver';
import { onSyncConflict, type SyncConflict } from '@/utils/offlineQueue';

const ASSET_CACHE_KEY = 'offline-manage-assets';

const ManageAssets = () => {
  const assets = useAssetStore((s) => s.assets);
  const setAssets = useAssetStore((s) => s.setAssets);
  const addAsset = useAssetStore((s) => s.addAsset);
  const updateAsset = useAssetStore((s) => s.updateAsset);
  const removeAsset = useAssetStore((s) => s.removeAsset);

  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
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
      setAssets(JSON.parse(cached));
      addToast('Showing cached assets', 'error');
      return true;
    }
    return false;
  }, [addToast, setAssets]);

  const fetchAssets = useCallback(async () => {
    if (isLoadingRef.current) return;
    if (!navigator.onLine) {
      if (!loadCachedAssets()) {
        setError('Failed to load assets while offline');
      }
      return;
    }

    try {
      isLoadingRef.current = true;
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
    }
  }, [loadCachedAssets, setAssets]);

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

      <AssetTable
        assets={assets}
        search={search}
        onRowClick={(a) => { setSelected(a); setModalOpen(true); }}
        onDuplicate={handleDuplicate}
        onDelete={(a) => handleDelete(a.id)}
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
    </div>
  );
};

export default ManageAssets;
