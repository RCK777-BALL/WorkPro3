/*
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pencil, PlusCircle, RefreshCcw, Scan } from 'lucide-react';
import AssetTable from '@/components/assets/AssetTable';
import AssetModal from '@/components/assets/AssetModal';
import WorkOrderModal from '@/components/work-orders/WorkOrderModal';
import Button from '@/components/common/Button';
import http from '@/lib/http';
import { enqueueAssetRequest, onSyncConflict, type SyncConflict } from '@/utils/offlineQueue';
import { useAssetStore } from '@/store/assetStore';
import type { Asset } from '@/types';
import { duplicateAsset } from '@/utils/duplicate';
import ConflictResolver from '@/components/offline/ConflictResolver';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { usePermissions } from '@/auth/usePermissions';
import { useTranslation } from 'react-i18next';
import { useScopeContext } from '@/context/ScopeContext';
import { useToast } from '@/context/ToastContext';

const ASSET_CACHE_KEY = 'offline-assets';

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

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWO, setShowWO] = useState(false);
  const [woAsset, setWoAsset] = useState<Asset | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);
  const isFetching = useRef(false);
  const navigate = useNavigate();

  const scopedAssets = useMemo(() => {
    if (!activePlant) return assets;
    return assets.filter((asset) => {
      const assetPlant = asset.plantId ?? asset.siteId;
      return assetPlant ? assetPlant === activePlant.id : false;
    });
  }, [activePlant, assets]);

  const normalizedAssets = useMemo(
    () => scopedAssets.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [scopedAssets],
  );

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
    if (!navigator.onLine) {
      enqueueAssetRequest('delete', { id } as Asset);
      removeAsset(id);
      return;
    }
    await http.delete(`/assets/${id}`);
    removeAsset(id);
  };

  const stats = useMemo(() => {
    const total = scopedAssets.length;
    const active = scopedAssets.filter((asset) => (asset.status ?? '').toLowerCase() === 'active').length;
    const critical = scopedAssets.filter((asset) => asset.criticality === 'high').length;
    return { total, active, critical };
  }, [scopedAssets]);

  const canManageAssets = can('hierarchy', 'write');
  const canDeleteAssets = can('hierarchy', 'delete');
  const canCreateWorkOrders = can('workRequests', 'convert');

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm text-neutral-600">Assets</p>
            <h1 className="text-3xl font-bold text-neutral-900">Asset catalog</h1>
            <p className="text-neutral-600 mt-1">
              Browse the list of assets, make quick edits, and add new equipment to your hierarchy.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => navigate('/assets/scan')}
              aria-label="Scan an asset QR code"
            >
              <Scan className="w-4 h-4 mr-2" />
              Scan asset
            </Button>
            <Button variant="outline" onClick={fetchAssets} disabled={isLoading}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSelected(null);
                setModalOpen(true);
              }}
              disabled={!canManageAssets || !activePlant}
              aria-disabled={!canManageAssets || !activePlant}
              title={
                !canManageAssets
                  ? t('assets.permissionWarning')
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

        {!activePlant && !loadingPlants && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100" role="alert">
            <span className="mt-0.5 text-amber-300">⚠️</span>
            <div>
              <p className="font-semibold">Select a plant to manage assets</p>
              <p>Use the plant switcher in the header to choose the site whose assets you want to view.</p>
            </div>
          </div>
        )}

        {normalizedAssets.length > 0 && (
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
              {normalizedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white/70 px-4 py-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60"
                >
                  <div>
                    <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{asset.name}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {asset.type ?? 'Type not specified'}
                      {asset.location ? ` • ${asset.location}` : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelected(asset); setModalOpen(true); }}
                    disabled={!canManageAssets}
                    aria-disabled={!canManageAssets}
                    title={!canManageAssets ? t('assets.permissionWarning') : undefined}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && scopedAssets.length === 0 && (
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
                disabled={!canManageAssets}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add asset
              </Button>
              <Button variant="outline" onClick={fetchAssets} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh list
              </Button>
            </div>
          </div>
        )}

        <AssetTable
          assets={scopedAssets}
          search={search}
          onRowClick={(a) => { setSelected(a); setModalOpen(true); }}
          onDuplicate={handleDuplicate}
          onDelete={(a) => handleDelete(a.id)}
          onCreateWorkOrder={(a) => { setWoAsset(a); setShowWO(true); }}
          canEdit={canManageAssets}
          canDelete={canDeleteAssets}
          canCreateWorkOrder={canCreateWorkOrders}
          readOnlyReason={t('assets.permissionWarning')}
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
