import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

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
    department: toOptionalString(payload.department),
    line: toOptionalString(payload.line),
    station: toOptionalString(payload.station),
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

const hierarchyTemplateHeaders = [
  'Department Name*',
  'Department Notes (optional)',
  'Line Name*',
  'Line Notes (optional)',
  'Station Name*',
  'Station Number (optional)',
  'Station Notes (optional)',
  'Station Increment (optional)',
];

const hierarchyTemplateExampleRows: string[][] = [
  [
    'Maintenance',
    'Oversees facility upkeep and repairs.',
    'Utilities Support',
    'Provides compressed air for tooling lines.',
    'Compressor Bay',
    'ST-100',
    'Primary compressor servicing area.',
    '+5',
  ],
  [
    'Production',
    'Manages packaging and assembly operations.',
    'Line B',
    'High-volume packaging line.',
    'Packaging Station',
    'PK-12',
    'Automated wrapping and palletizing.',
    'None',
  ],
];

const toCsvValue = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const createHierarchyTemplateCsv = (): string => {
  const rows = [hierarchyTemplateHeaders, ...hierarchyTemplateExampleRows];
  return rows
    .map((row) => row.map((cell) => toCsvValue(cell)).join(','))
    .join('\r\n');
};

export default function AssetsLocationsPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<AssetRecord[]>(fallbackAssets);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<AssetRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');
  const [page, setPage] = useState(1);

  const pageSize = 10;

  const statusFilterOptions: Array<{ label: string; value: 'all' | AssetStatus }> = [
    { label: 'All statuses', value: 'all' },
    { label: 'Active', value: 'Active' },
    { label: 'Offline', value: 'Offline' },
    { label: 'In Repair', value: 'In Repair' },
  ];

  const statusLegendItems: Array<{ label: string; color: string }> = [
    { label: 'Active', color: 'bg-emerald-500' },
    { label: 'Offline', color: 'bg-red-500' },
    { label: 'In Repair', color: 'bg-amber-500' },
  ];
  const handleDownloadTemplate = () => {
    const csvContent = createHierarchyTemplateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'asset-hierarchy-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

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
          setPage(1);
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

  const filteredAssets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return assets.filter((asset) => {
      const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
      if (!matchesStatus) return false;

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        asset.name,
        asset.location,
        asset.department,
        asset.line,
        asset.station,
        asset.type,
        asset.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [assets, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / pageSize));
  const paginatedAssets = useMemo(
    () => filteredAssets.slice((page - 1) * pageSize, page * pageSize),
    [filteredAssets, page, pageSize],
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
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
    <div className="space-y-5 p-6 text-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">Assets & Locations</h1>
          <p className="text-sm text-slate-300">
            Visualize critical equipment, locations, and their operational readiness.
          </p>
          <p className="text-xs text-slate-400">
            Download the hierarchy template to bulk prepare departments, lines, and stations for asset dropdowns.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="md"
            icon={<Download className="h-4 w-4" />}
            onClick={handleDownloadTemplate}
          >
            Download Hierarchy Template
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => navigate('/imports')}
          >
            Import Hierarchy
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Add Asset
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search assets or locations…"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | AssetStatus)}
        >
          {statusFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {(searchTerm || statusFilter !== 'all') && (
          <button
            type="button"
            className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600"
            onClick={handleResetFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {statusLegendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${item.color}`} />
            <span className="text-sm text-slate-300">{item.label}</span>
          </div>
        ))}
      </div>

      <DataTable
        keyField="id"
        data={paginatedAssets}
        isLoading={isLoading}
        columns={tableColumns}
        emptyMessage="No assets found"
        variant="dark"
      />

      <div className="flex items-center gap-3 text-sm text-slate-300">
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
        >
          Next
        </button>
      </div>

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
