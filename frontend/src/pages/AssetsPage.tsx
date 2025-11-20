/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AssetTable from '@/components/assets/AssetTable';
import AssetModal from '@/components/assets/AssetModal';
import WorkOrderModal from '@/components/work-orders/WorkOrderModal';
import Button from '@/components/common/Button';
import http from '@/lib/http';
import { enqueueAssetRequest, onSyncConflict, type SyncConflict } from '@/utils/offlineQueue';
import { useAssetStore } from '@/store/assetStore';
import type { Asset } from '@/types';
import { duplicateAsset } from '@/utils/duplicate';
import { useToast } from '@/context/ToastContext';
import ConflictResolver from '@/components/offline/ConflictResolver';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

const ASSET_CACHE_KEY = 'offline-assets';

const AssetsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const assets = useAssetStore((s) => s.assets);
  const setAssets = useAssetStore((s) => s.setAssets);
  const addAsset = useAssetStore((s) => s.addAsset);
  const updateAsset = useAssetStore((s) => s.updateAsset);
  const removeAsset = useAssetStore((s) => s.removeAsset);

  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWO, setShowWO] = useState(false);
  const [woAsset, setWoAsset] = useState<Asset | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);

  useEffect(() => {
    const unsub = onSyncConflict(setConflict);
    return () => {
      unsub();
    };
  }, []);

  const resolveConflict = async (choice: 'local' | 'server') => {
    if (!conflict) return;
    if (choice === 'local') {
      await http({ method: conflict.method, url: conflict.url, data: conflict.local });
    }
    setConflict(null);
  };

  const fetchAssets = async () => {
    const loadCached = () => {
      const cached = safeLocalStorage.getItem(ASSET_CACHE_KEY);
      if (cached) {
        setAssets(JSON.parse(cached));
        addToast('Showing cached assets', 'error');
        return true;
      }
      return false;
    };

    if (!navigator.onLine) {
      if (!loadCached()) {
        setError('Failed to load assets');
      }
      return;
    }

    try {
      interface AssetResponse extends Partial<Asset> { _id?: string; id?: string }
      const res = await http.get<AssetResponse[]>('/assets');
      const normalized: Asset[] = Array.isArray(res.data)
        ? res.data.flatMap((asset) => {
            const { _id, id: assetId, name, ...rest } = asset;
            const resolvedId = _id ?? assetId;
            if (!resolvedId) {
              return [] as Asset[];
            }
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
    } catch (err) {
      console.error('Error fetching assets:', err);
      if (!loadCached()) {
        setError('Failed to load assets');
      }
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

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
    if (assets.find(a => a.id === asset.id)) {
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
    addAsset({ ...res.data, id: res.data._id });
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
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Assets</h2>
          <Button variant="primary" onClick={() => { setSelected(null); setModalOpen(true); }}>
            Add Asset
          </Button>
        </div>
        {error && <p className="text-red-600">{error}</p>}
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
          onCreateWorkOrder={(a) => { setWoAsset(a); setShowWO(true); }}

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
