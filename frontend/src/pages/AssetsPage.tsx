import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import AssetTable from '../components/assets/AssetTable';
import AssetModal from '../components/assets/AssetModal';
import WorkOrderModal from '../components/work-orders/WorkOrderModal';
import Button from '../components/common/Button';
import http from '../lib/http';
import { enqueueAssetRequest } from '../utils/offlineQueue';
import { useAssetStore } from '../store/assetStore';
import type { Asset } from '../types';
import { duplicateAsset } from '../utils/duplicate';
import { useToast } from '../context/ToastContext';

const ASSET_CACHE_KEY = 'offline-assets';

const AssetsPage = () => {
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

  const fetchAssets = async () => {
    const loadCached = () => {
      const cached = localStorage.getItem(ASSET_CACHE_KEY);
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
      const res = await http.get('/assets');
      const data = (res.data as any[]).map((a) => ({
        ...a,
        id: a._id ?? a.id,
      })) as Asset[];
      setAssets(data);
      localStorage.setItem(ASSET_CACHE_KEY, JSON.stringify(data));
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
    <Layout title="Assets">
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
            className="flex-1 bg-transparent border-none outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          initialData={woAsset ? { assetId: woAsset.id } : undefined}
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
    </Layout>
  );
};

export default AssetsPage;
