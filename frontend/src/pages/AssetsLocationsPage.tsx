import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import Button from '@/components/common/Button';
import IconButton from '@/components/ui/button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import AssetFormModal, { type AssetFormValues } from '@/components/assets/AssetFormModal';
import http from '@/lib/http';
import { getErrorMessage } from '@/lib/api';

type AssetStatus = 'Active' | 'Offline' | 'In Repair';
type AssetType = 'Electrical' | 'Mechanical' | 'Tooling' | 'Interface';
type AssetCriticality = 'high' | 'medium' | 'low';

interface AssetRecord {
  id: string;
  name: string;
  location: string;
  department?: string;
  line?: string;
  station?: string;
  type: AssetType;
  status: AssetStatus;
  criticality: AssetCriticality;
  description?: string;
}

type AssetApiRecord = Partial<AssetRecord> & { _id?: string; id?: string };

const fallbackAssets: AssetRecord[] = [
  {
    id: 'asset-001',
    name: 'Main Air Compressor',
    location: 'Plant 1 - Utility Room',
    department: 'Maintenance',
    line: 'Utilities',
    station: 'Compressor Bay',
    type: 'Mechanical',
    status: 'Active',
    criticality: 'high',
    description: 'Primary compressed air source for tooling lines.',
  },
  {
    id: 'asset-002',
    name: 'Packaging Line',
    location: 'Plant 1 - Line B',
    department: 'Production',
    line: 'Line B',
    station: 'Packaging Station',
    type: 'Mechanical',
    status: 'Offline',
    criticality: 'medium',
    description: 'Automated packing conveyor and wrapping station.',
  },
  {
    id: 'asset-003',
    name: 'Warehouse Lift 3',
    location: 'Distribution Center',
    department: 'Logistics',
    line: 'Material Handling',
    station: 'Lift Zone 3',
    type: 'Tooling',
    status: 'In Repair',
    criticality: 'medium',
    description: 'Forklift undergoing scheduled maintenance.',
  },
];

const normalizeAsset = (payload: AssetApiRecord): AssetRecord | null => {
  const id = typeof payload.id === 'string' && payload.id ? payload.id : payload._id;
  if (!id) {
    return null;
  }

  const type = (payload.type as AssetType) ?? 'Mechanical';
  const status = (payload.status as AssetStatus) ?? 'Active';
  const criticality = (payload.criticality as AssetCriticality) ?? 'medium';

  return {
    id,
    name: payload.name ?? 'Unnamed Asset',
    location: payload.location ?? 'Unassigned location',
    department: payload.department,
    line: payload.line,
    station: payload.station,
    type,
    status,
    criticality,
    description: payload.description ?? '',
  };
};

const toFormValues = (asset: AssetRecord): AssetFormValues => ({
  name: asset.name,
  location: asset.location,
  department: asset.department ?? '',
  line: asset.line ?? '',
  station: asset.station ?? '',
  type: asset.type,
  status: asset.status,
  criticality: asset.criticality,
  description: asset.description ?? '',
});

const criticalityClasses: Record<AssetCriticality, string> = {
  high: 'text-error-400',
  medium: 'text-warning-400',
  low: 'text-success-400',
};

export default function AssetsLocationsPage() {
  const [assets, setAssets] = useState<AssetRecord[]>(fallbackAssets);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<AssetRecord | null>(null);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await http.get<AssetApiRecord[]>('/assets');
      const normalized = Array.isArray(response.data)
        ? response.data
            .map((asset) => normalizeAsset(asset))
            .filter((asset): asset is AssetRecord => Boolean(asset))
        : [];
      setAssets(normalized);
    } catch (error) {
      toast.error('Failed to load assets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  const handleOpenCreate = () => {
    setSelectedAsset(null);
    setIsModalOpen(true);
  };

  const handleEdit = (asset: AssetRecord) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
  };

  const handleSaveAsset = async (values: AssetFormValues) => {
    setIsSaving(true);
    try {
      if (selectedAsset) {
        const { data } = await http.put<AssetApiRecord>(`/assets/${selectedAsset.id}`, values);
        const updated = normalizeAsset(data);
        if (updated) {
          setAssets((prev) => prev.map((asset) => (asset.id === updated.id ? updated : asset)));
        } else {
          await fetchAssets();
        }
        toast.success('Asset updated successfully');
      } else {
        const { data } = await http.post<AssetApiRecord>('/assets', values);
        const created = normalizeAsset(data);
        if (created) {
          setAssets((prev) => [created, ...prev]);
        } else {
          await fetchAssets();
        }
        toast.success('Asset created successfully');
      }
      handleCloseModal();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    const id = assetToDelete.id;
    try {
      await http.delete(`/assets/${id}`);
      setAssets((prev) => prev.filter((asset) => asset.id !== id));
      toast.success('Asset deleted');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const tableColumns = useMemo(
    () => [
      { header: 'Asset', accessor: 'name' as const },
      { header: 'Location', accessor: 'location' as const },
      {
        header: 'Department',
        accessor: (asset: AssetRecord) => asset.department ?? '—',
      },
      {
        header: 'Line',
        accessor: (asset: AssetRecord) => asset.line ?? '—',
      },
      {
        header: 'Station',
        accessor: (asset: AssetRecord) => asset.station ?? '—',
      },
      { header: 'Type', accessor: 'type' as const },
      {
        header: 'Status',
        accessor: (asset: AssetRecord) => <StatusBadge status={asset.status} size="sm" />,
      },
      {
        header: 'Criticality',
        accessor: (asset: AssetRecord) => (
          <span className={`${criticalityClasses[asset.criticality]} capitalize`}>
            {asset.criticality}
          </span>
        ),
      },
      {
        header: 'Actions',
        accessor: (asset: AssetRecord) => (
          <div className="flex justify-end gap-2">
            <IconButton
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-400 hover:text-neutral-100"
              onClick={() => handleEdit(asset)}
              aria-label={`Edit ${asset.name}`}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-error-400 hover:text-error-200"
              onClick={() => setAssetToDelete(asset)}
              aria-label={`Delete ${asset.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ),
        className: 'w-28 text-right',
      },
    ],
    [],
  );

  return (
    <div className="space-y-4 p-6 text-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">Assets & Locations</h1>
          <p className="text-sm text-slate-300">
            Visualize critical equipment, locations, and their operational readiness.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<Plus className="h-4 w-4" />}
          onClick={handleOpenCreate}
        >
          Add Asset
        </Button>
      </div>

      <DataTable
        keyField="id"
        data={assets}
        isLoading={isLoading}
        columns={tableColumns}
        emptyMessage="No assets found"
        className="rounded-xl border border-slate-800 bg-slate-900/60"
      />

      <AssetFormModal
        open={isModalOpen}
        loading={isSaving}
        initialValues={selectedAsset ? toFormValues(selectedAsset) : undefined}
        onClose={handleCloseModal}
        onSubmit={handleSaveAsset}
      />

      <ConfirmDialog
        open={Boolean(assetToDelete)}
        onClose={() => setAssetToDelete(null)}
        onConfirm={handleDeleteAsset}
        title="Delete asset"
        message={
          assetToDelete
            ? `Are you sure you want to delete ${assetToDelete.name}? This action cannot be undone.`
            : 'Are you sure you want to delete this asset?'
        }
      />
    </div>
  );
}
