/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderTree, Search } from 'lucide-react';

import Button from '@common/Button';
import AssetTable from '@/components/assets/AssetTable';
import DepartmentTree from '@/components/assets/DepartmentTree';
import LineTree from '@/components/assets/LineTree';
import StationTree from '@/components/assets/StationTree';
import DepartmentModal from '@/components/modals/DepartmentModal';
import LineModal from '@/components/modals/LineModal';
import StationModal from '@/components/modals/StationModal';
import AssetModal from '@/components/modals/AssetModal';
import http from '@/lib/http';
import { useToast } from '@/context/ToastContext';
import type { Asset } from '@/types';
import type {
  AssetNode,
  ContextTarget,
  DepartmentNode,
  LineNode,
  StationNode,
} from '@/components/assets/hierarchyTypes';

const LOCAL_STORAGE_KEY = 'assets-hierarchy-expanded';

type ExpandedState = {
  departments: Set<string>;
  lines: Set<string>;
  stations: Set<string>;
};

interface FilterResult {
  data: DepartmentNode[];
  autoExpanded: ExpandedState;
}

const createExpandedState = (): ExpandedState => ({
  departments: new Set<string>(),
  lines: new Set<string>(),
  stations: new Set<string>(),
});

const normalize = (value?: string) => value?.toLowerCase() ?? '';

const filterHierarchy = (departments: DepartmentNode[], term: string): FilterResult => {
  if (!term.trim()) {
    return { data: departments, autoExpanded: createExpandedState() };
  }

  const query = term.toLowerCase();
  const autoExpanded = createExpandedState();
  const filteredDepartments: DepartmentNode[] = [];

  departments.forEach((department) => {
    const deptMatches =
      department.name.toLowerCase().includes(query) || normalize(department.notes).includes(query);
    const filteredLines: LineNode[] = [];

    department.lines.forEach((line) => {
      const lineMatches = line.name.toLowerCase().includes(query) || normalize(line.notes).includes(query);
      const filteredStations: StationNode[] = [];

      line.stations.forEach((station) => {
        const stationMatches =
          station.name.toLowerCase().includes(query) || normalize(station.notes).includes(query);
        const filteredAssets = station.assets.filter((asset) => {
          const typeMatch = (asset.type ?? '').toString().toLowerCase().includes(query);
          const statusMatch = (asset.status ?? '').toLowerCase().includes(query);
          const locationMatch = (asset.location ?? '').toLowerCase().includes(query);
          const criticalityMatch = (asset.criticality ?? '').toLowerCase().includes(query);
          return (
            asset.name.toLowerCase().includes(query) ||
            typeMatch ||
            statusMatch ||
            locationMatch ||
            criticalityMatch ||
            normalize(asset.notes).includes(query)
          );
        });

        if (stationMatches || filteredAssets.length > 0) {
          autoExpanded.stations.add(station._id);
          filteredStations.push({
            ...station,
            assets: filteredAssets,
          });
        }
      });

      if (lineMatches || filteredStations.length > 0) {
        autoExpanded.lines.add(line._id);
        filteredLines.push({
          ...line,
          stations: filteredStations,
        });
      }
    });

    if (deptMatches || filteredLines.length > 0) {
      autoExpanded.departments.add(department._id);
      filteredDepartments.push({
        ...department,
        lines: filteredLines,
      });
    }
  });

  return { data: filteredDepartments, autoExpanded };
};

const mapAssetNodeToAsset = (
  asset: AssetNode,
  departmentName?: string,
  lineName?: string,
  stationName?: string,
): Asset => ({
  id: asset._id,
  name: asset.name,
  type: asset.type as Asset['type'],
  status: asset.status as Asset['status'],
  location: asset.location ?? stationName ?? '',
  department: departmentName,
  line: lineName,
  station: stationName,
  criticality: asset.criticality as Asset['criticality'],
  notes: asset.notes,
});

interface ContextMenuState {
  x: number;
  y: number;
  target: ContextTarget;
}

type SelectionPath = {
  departmentId?: string;
  departmentName?: string;
  lineId?: string;
  lineName?: string;
  stationId?: string;
  stationName?: string;
};

const AssetsPage = () => {
  const { addToast } = useToast();
  const [departments, setDepartments] = useState<DepartmentNode[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<ExpandedState>(() => {
    const base = createExpandedState();
    if (typeof window === 'undefined') return base;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return base;
      const parsed = JSON.parse(raw) as {
        departments?: string[];
        lines?: string[];
        stations?: string[];
      };
      return {
        departments: new Set(parsed.departments ?? []),
        lines: new Set(parsed.lines ?? []),
        stations: new Set(parsed.stations ?? []),
      };
    } catch (err) {
      console.warn('Failed to read hierarchy expansion state', err);
      return base;
    }
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectionPath>({});
  const [loadingHierarchy, setLoadingHierarchy] = useState(false);

  const [departmentModalState, setDepartmentModalState] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    department: null as DepartmentNode | null,
    loading: false,
  });

  const [lineModalState, setLineModalState] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    departmentId: '',
    departmentName: '',
    line: null as LineNode | null,
    loading: false,
  });

  const [stationModalState, setStationModalState] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    departmentId: '',
    departmentName: '',
    lineId: '',
    lineName: '',
    station: null as StationNode | null,
    loading: false,
  });

  const [assetModalState, setAssetModalState] = useState({
    open: false,
    mode: 'create' as 'create' | 'edit',
    departmentId: '',
    lineId: '',
    stationId: '',
    path: {} as { department?: string; line?: string; station?: string },
    asset: null as AssetNode | null,
    loading: false,
  });

  const fetchHierarchy = useCallback(async () => {
    try {
      setLoadingHierarchy(true);
      const { data } = await http.get<DepartmentNode[]>('/api/departments', {
        params: { include: 'lines,stations,assets' },
      });
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load hierarchy', error);
      addToast('Failed to load hierarchy', 'error');
    } finally {
      setLoadingHierarchy(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      departments: Array.from(expanded.departments),
      lines: Array.from(expanded.lines),
      stations: Array.from(expanded.stations),
    };
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  }, [expanded]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu]);

  const { data: filteredHierarchy, autoExpanded } = useMemo(
    () => filterHierarchy(departments, searchTerm),
    [departments, searchTerm],
  );

  const isDepartmentExpanded = (id: string) =>
    expanded.departments.has(id) || autoExpanded.departments.has(id);
  const isLineExpanded = (id: string) => expanded.lines.has(id) || autoExpanded.lines.has(id);
  const isStationExpanded = (id: string) => expanded.stations.has(id) || autoExpanded.stations.has(id);

  const toggleExpanded = (level: keyof ExpandedState, id: string) => {
    setExpanded((prev) => {
      const next: ExpandedState = {
        departments: new Set(prev.departments),
        lines: new Set(prev.lines),
        stations: new Set(prev.stations),
      };
      const target = next[level];
      if (target.has(id)) target.delete(id);
      else target.add(id);
      return next;
    });
  };

  const findLineById = (lineId: string) => {
    for (const department of departments) {
      const line = department.lines.find((item) => item._id === lineId);
      if (line) return { department, line };
    }
    return null;
  };

  const findStationById = (stationId: string) => {
    for (const department of departments) {
      for (const line of department.lines) {
        const station = line.stations.find((item) => item._id === stationId);
        if (station) {
          return { department, line, station };
        }
      }
    }
    return null;
  };

  const findAssetById = (assetId: string) => {
    for (const department of departments) {
      for (const line of department.lines) {
        for (const station of line.stations) {
          const asset = station.assets.find((item) => item._id === assetId);
          if (asset) {
            return { department, line, station, asset };
          }
        }
      }
    }
    return null;
  };

  useEffect(() => {
    if (!selectedContext.stationId) return;
    const stationInfo = findStationById(selectedContext.stationId);
    if (!stationInfo) {
      setSelectedAssets([]);
      setSelectedAssetId(null);
      return;
    }
    setSelectedContext((prev) => {
      if (
        prev.departmentName === stationInfo.department.name &&
        prev.lineName === stationInfo.line.name &&
        prev.stationName === stationInfo.station.name
      ) {
        return prev;
      }
      return {
        ...prev,
        departmentName: stationInfo.department.name,
        lineName: stationInfo.line.name,
        stationName: stationInfo.station.name,
      };
    });
    setSelectedAssets(
      stationInfo.station.assets.map((asset) =>
        mapAssetNodeToAsset(asset, stationInfo.department.name, stationInfo.line.name, stationInfo.station.name),
      ),
    );
    setSelectedAssetId((prev) =>
      prev && stationInfo.station.assets.some((asset) => asset._id === prev) ? prev : null,
    );
  }, [departments, selectedContext.stationId]);

  const handleStationToggle = (department: DepartmentNode, line: LineNode, station: StationNode) => {
    toggleExpanded('stations', station._id);
    setSelectedContext({
      departmentId: department._id,
      departmentName: department.name,
      lineId: line._id,
      lineName: line.name,
      stationId: station._id,
      stationName: station.name,
    });
    setSelectedAssets(
      station.assets.map((asset) => mapAssetNodeToAsset(asset, department.name, line.name, station.name)),
    );
    setSelectedAssetId((prev) =>
      prev && station.assets.some((asset) => asset._id === prev) ? prev : null,
    );
  };

  const handleAssetSelect = (
    asset: AssetNode,
    department: DepartmentNode,
    line: LineNode,
    station: StationNode,
  ) => {
    setSelectedContext({
      departmentId: department._id,
      departmentName: department.name,
      lineId: line._id,
      lineName: line.name,
      stationId: station._id,
      stationName: station.name,
    });
    setSelectedAssets(
      station.assets.map((item) => mapAssetNodeToAsset(item, department.name, line.name, station.name)),
    );
    setSelectedAssetId(asset._id);
  };

  const openContextMenu = (event: React.MouseEvent, target: ContextTarget) => {
    const { clientX, clientY } = event;
    const menuWidth = 200;
    const menuHeight = 160;
    const x = typeof window !== 'undefined' ? Math.min(clientX, window.innerWidth - menuWidth) : clientX;
    const y = typeof window !== 'undefined' ? Math.min(clientY, window.innerHeight - menuHeight) : clientY;
    setContextMenu({ x, y, target });
  };

  const openDepartmentModal = (mode: 'create' | 'edit', department?: DepartmentNode) => {
    setDepartmentModalState({
      open: true,
      mode,
      department: department ?? null,
      loading: false,
    });
  };

  const openLineModal = (mode: 'create' | 'edit', department: DepartmentNode, line?: LineNode) => {
    setLineModalState({
      open: true,
      mode,
      departmentId: department._id,
      departmentName: department.name,
      line: line ?? null,
      loading: false,
    });
  };

  const openStationModal = (
    mode: 'create' | 'edit',
    department: DepartmentNode,
    line: LineNode,
    station?: StationNode,
  ) => {
    setStationModalState({
      open: true,
      mode,
      departmentId: department._id,
      departmentName: department.name,
      lineId: line._id,
      lineName: line.name,
      station: station ?? null,
      loading: false,
    });
  };

  const openAssetModal = (
    mode: 'create' | 'edit',
    department: DepartmentNode,
    line: LineNode,
    station: StationNode,
    asset?: AssetNode,
  ) => {
    setAssetModalState({
      open: true,
      mode,
      departmentId: department._id,
      lineId: line._id,
      stationId: station._id,
      path: {
        department: department.name,
        line: line.name,
        station: station.name,
      },
      asset: asset ?? null,
      loading: false,
    });
  };

  const handleDepartmentSubmit = async (form: { name: string; notes: string }) => {
    setDepartmentModalState((prev) => ({ ...prev, loading: true }));
    try {
      if (departmentModalState.mode === 'create') {
        await http.post('/api/departments', form);
        addToast('Department created', 'success');
      } else if (departmentModalState.department) {
        await http.put(`/api/departments/${departmentModalState.department._id}`, form);
        addToast('Department updated', 'success');
      }
      setDepartmentModalState({ open: false, mode: 'create', department: null, loading: false });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to save department', error);
      addToast('Failed to save department', 'error');
      setDepartmentModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDepartmentDelete = async () => {
    if (!departmentModalState.department) return;
    setDepartmentModalState((prev) => ({ ...prev, loading: true }));
    try {
      await http.delete(`/api/departments/${departmentModalState.department._id}`);
      addToast('Department deleted', 'success');
      setDepartmentModalState({ open: false, mode: 'create', department: null, loading: false });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to delete department', error);
      addToast('Failed to delete department', 'error');
      setDepartmentModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleLineSubmit = async (form: { name: string; notes: string }) => {
    if (!lineModalState.departmentId) return;
    setLineModalState((prev) => ({ ...prev, loading: true }));
    try {
      if (lineModalState.mode === 'create') {
        await http.post('/api/lines', {
          name: form.name,
          notes: form.notes,
          departmentId: lineModalState.departmentId,
        });
        addToast('Line created', 'success');
      } else if (lineModalState.line) {
        await http.put(`/api/lines/${lineModalState.line._id}`, {
          name: form.name,
          notes: form.notes,
        });
        addToast('Line updated', 'success');
      }
      setLineModalState({
        open: false,
        mode: 'create',
        departmentId: '',
        departmentName: '',
        line: null,
        loading: false,
      });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to save line', error);
      addToast('Failed to save line', 'error');
      setLineModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleLineDelete = async () => {
    if (!lineModalState.line) return;
    setLineModalState((prev) => ({ ...prev, loading: true }));
    try {
      await http.delete(`/api/lines/${lineModalState.line._id}`);
      addToast('Line deleted', 'success');
      setLineModalState({
        open: false,
        mode: 'create',
        departmentId: '',
        departmentName: '',
        line: null,
        loading: false,
      });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to delete line', error);
      addToast('Failed to delete line', 'error');
      setLineModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStationSubmit = async (form: { name: string; notes: string }) => {
    if (!stationModalState.lineId) return;
    setStationModalState((prev) => ({ ...prev, loading: true }));
    try {
      if (stationModalState.mode === 'create') {
        await http.post('/api/stations', {
          name: form.name,
          notes: form.notes,
          lineId: stationModalState.lineId,
        });
        addToast('Station created', 'success');
      } else if (stationModalState.station) {
        await http.put(`/api/stations/${stationModalState.station._id}`, {
          name: form.name,
          notes: form.notes,
        });
        addToast('Station updated', 'success');
      }
      setStationModalState({
        open: false,
        mode: 'create',
        departmentId: '',
        departmentName: '',
        lineId: '',
        lineName: '',
        station: null,
        loading: false,
      });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to save station', error);
      addToast('Failed to save station', 'error');
      setStationModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStationDelete = async () => {
    if (!stationModalState.station) return;
    setStationModalState((prev) => ({ ...prev, loading: true }));
    try {
      await http.delete(`/api/stations/${stationModalState.station._id}`);
      addToast('Station deleted', 'success');
      setStationModalState({
        open: false,
        mode: 'create',
        departmentId: '',
        departmentName: '',
        lineId: '',
        lineName: '',
        station: null,
        loading: false,
      });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to delete station', error);
      addToast('Failed to delete station', 'error');
      setStationModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleAssetSubmit = async (form: {
    name: string;
    type: AssetNode['type'];
    status: string;
    location: string;
    notes: string;
    criticality: 'high' | 'medium' | 'low';
  }) => {
    if (!assetModalState.stationId) return;
    setAssetModalState((prev) => ({ ...prev, loading: true }));
    try {
      if (assetModalState.mode === 'create') {
        await http.post('/api/assets', {
          ...form,
          stationId: assetModalState.stationId,
        });
        addToast('Asset created', 'success');
      } else if (assetModalState.asset) {
        await http.put(`/api/assets/${assetModalState.asset._id}`, form);
        addToast('Asset updated', 'success');
      }
      setAssetModalState({
        open: false,
        mode: 'create',
        departmentId: '',
        lineId: '',
        stationId: '',
        path: {},
        asset: null,
        loading: false,
      });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to save asset', error);
      addToast('Failed to save asset', 'error');
      setAssetModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleAssetDelete = async () => {
    if (!assetModalState.asset) return;
    setAssetModalState((prev) => ({ ...prev, loading: true }));
    try {
      await http.delete(`/api/assets/${assetModalState.asset._id}`);
      addToast('Asset deleted', 'success');
      setAssetModalState({
        open: false,
        mode: 'create',
        departmentId: '',
        lineId: '',
        stationId: '',
        path: {},
        asset: null,
        loading: false,
      });
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to delete asset', error);
      addToast('Failed to delete asset', 'error');
      setAssetModalState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleAssetDuplicate = async (asset: Asset) => {
    const assetInfo = findAssetById(asset.id);
    if (!assetInfo) return;
    try {
      await http.post('/api/assets', {
        name: `${asset.name} Copy`,
        type: (asset.type as AssetNode['type']) ?? 'Electrical',
        status: asset.status ?? 'Active',
        location: asset.location ?? '',
        notes: asset.notes ?? '',
        criticality: asset.criticality ?? 'medium',
        stationId: assetInfo.station._id,
      });
      addToast('Asset duplicated', 'success');
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to duplicate asset', error);
      addToast('Failed to duplicate asset', 'error');
    }
  };

  const handleAssetRowClick = (asset: Asset) => {
    const assetInfo = findAssetById(asset.id);
    if (!assetInfo) return;
    openAssetModal(
      'edit',
      assetInfo.department,
      assetInfo.line,
      assetInfo.station,
      assetInfo.asset,
    );
    setContextMenu(null);
  };

  const handleAssetDeleteFromTable = async (asset: Asset) => {
    try {
      await http.delete(`/api/assets/${asset.id}`);
      addToast('Asset deleted', 'success');
      await fetchHierarchy();
    } catch (error) {
      console.error('Failed to delete asset', error);
      addToast('Failed to delete asset', 'error');
    }
  };

  const handleContextEdit = (target: ContextTarget) => {
    switch (target.type) {
      case 'department': {
        const department = departments.find((item) => item._id === target.departmentId);
        if (department) openDepartmentModal('edit', department);
        break;
      }
      case 'line': {
        if (!target.lineId) break;
        const info = findLineById(target.lineId);
        if (info) openLineModal('edit', info.department, info.line);
        break;
      }
      case 'station': {
        if (!target.stationId) break;
        const info = findStationById(target.stationId);
        if (info) openStationModal('edit', info.department, info.line, info.station);
        break;
      }
      case 'asset': {
        if (!target.assetId) break;
        const info = findAssetById(target.assetId);
        if (info) openAssetModal('edit', info.department, info.line, info.station, info.asset);
        break;
      }
      default:
        break;
    }
    setContextMenu(null);
  };

  const handleContextAdd = (target: ContextTarget) => {
    switch (target.type) {
      case 'department': {
        const department = departments.find((item) => item._id === target.departmentId);
        if (department) openLineModal('create', department);
        break;
      }
      case 'line': {
        if (!target.lineId) break;
        const info = findLineById(target.lineId);
        if (info) openStationModal('create', info.department, info.line);
        break;
      }
      case 'station': {
        if (!target.stationId) break;
        const info = findStationById(target.stationId);
        if (info) openAssetModal('create', info.department, info.line, info.station);
        break;
      }
      default:
        break;
    }
    setContextMenu(null);
  };

  const handleContextDelete = async (target: ContextTarget) => {
    setContextMenu(null);
    try {
      switch (target.type) {
        case 'department': {
          if (!target.departmentId) break;
          const department = departments.find((item) => item._id === target.departmentId);
          if (!department) break;
          if (typeof window !== 'undefined' && !window.confirm(`Delete department "${department.name}"?`)) return;
          await http.delete(`/api/departments/${department._id}`);
          addToast('Department deleted', 'success');
          await fetchHierarchy();
          break;
        }
        case 'line': {
          if (!target.lineId) break;
          const info = findLineById(target.lineId);
          if (!info) break;
          if (typeof window !== 'undefined' && !window.confirm(`Delete line "${info.line.name}"?`)) return;
          await http.delete(`/api/lines/${info.line._id}`);
          addToast('Line deleted', 'success');
          await fetchHierarchy();
          break;
        }
        case 'station': {
          if (!target.stationId) break;
          const info = findStationById(target.stationId);
          if (!info) break;
          if (typeof window !== 'undefined' && !window.confirm(`Delete station "${info.station.name}"?`)) return;
          await http.delete(`/api/stations/${info.station._id}`);
          addToast('Station deleted', 'success');
          await fetchHierarchy();
          break;
        }
        case 'asset': {
          if (!target.assetId) break;
          const info = findAssetById(target.assetId);
          if (!info) break;
          if (typeof window !== 'undefined' && !window.confirm(`Delete asset "${info.asset.name}"?`)) return;
          await http.delete(`/api/assets/${info.asset._id}`);
          addToast('Asset deleted', 'success');
          await fetchHierarchy();
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('Failed to delete item', error);
      addToast('Failed to delete item', 'error');
    }
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const { x, y, target } = contextMenu;
    const items: { label: string; action: () => void }[] = [];

    if (target.type === 'department') {
      items.push({ label: 'Add Line', action: () => handleContextAdd(target) });
      items.push({ label: 'Edit Department', action: () => handleContextEdit(target) });
      items.push({ label: 'Delete Department', action: () => handleContextDelete(target) });
    } else if (target.type === 'line') {
      items.push({ label: 'Add Station', action: () => handleContextAdd(target) });
      items.push({ label: 'Edit Line', action: () => handleContextEdit(target) });
      items.push({ label: 'Delete Line', action: () => handleContextDelete(target) });
    } else if (target.type === 'station') {
      items.push({ label: 'Add Asset', action: () => handleContextAdd(target) });
      items.push({ label: 'Edit Station', action: () => handleContextEdit(target) });
      items.push({ label: 'Delete Station', action: () => handleContextDelete(target) });
    } else if (target.type === 'asset') {
      items.push({ label: 'Edit Asset', action: () => handleContextEdit(target) });
      items.push({ label: 'Delete Asset', action: () => handleContextDelete(target) });
    }

    return (
      <div
        className="fixed z-50 w-48 rounded-lg border border-slate-700 bg-slate-900/95 text-sm text-slate-100 shadow-xl"
        style={{ top: y, left: x }}
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className="block w-full px-4 py-2 text-left hover:bg-slate-800"
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <div className="lg:w-1/3 rounded-xl bg-slate-900/95 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <FolderTree className="h-5 w-5 text-indigo-400" /> Hierarchy
            </h2>
            <Button variant="primary" size="sm" onClick={() => openDepartmentModal('create')}>
              + Department
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              className="w-full rounded-md border border-slate-800 bg-slate-800/70 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
              placeholder="Search departments, stations, assets..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="mt-4 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {loadingHierarchy ? (
              <p className="text-sm text-slate-500">Loading hierarchy…</p>
            ) : filteredHierarchy.length === 0 ? (
              <p className="text-sm text-slate-500">
                {searchTerm ? 'No matches found.' : 'No departments configured yet.'}
              </p>
            ) : (
              filteredHierarchy.map((department) => (
                <DepartmentTree
                  key={department._id}
                  department={department}
                  isExpanded={isDepartmentExpanded(department._id)}
                  onToggle={() => toggleExpanded('departments', department._id)}
                  onAddLine={() => openLineModal('create', department)}
                  onContextMenu={(event) =>
                    openContextMenu(event, {
                      type: 'department',
                      departmentId: department._id,
                      name: department.name,
                    })
                  }
                  onEdit={() => openDepartmentModal('edit', department)}
                >
                  {department.lines.map((line) => (
                    <LineTree
                      key={line._id}
                      line={line}
                      isExpanded={isLineExpanded(line._id)}
                      onToggle={() => toggleExpanded('lines', line._id)}
                      onAddStation={() => openStationModal('create', department, line)}
                      onContextMenu={(event) =>
                        openContextMenu(event, {
                          type: 'line',
                          departmentId: department._id,
                          lineId: line._id,
                          name: line.name,
                        })
                      }
                      onEdit={() => openLineModal('edit', department, line)}
                    >
                      {line.stations.map((station) => (
                        <StationTree
                          key={station._id}
                          station={station}
                          isExpanded={isStationExpanded(station._id)}
                          onToggle={() => handleStationToggle(department, line, station)}
                          onAddAsset={() => openAssetModal('create', department, line, station)}
                          onSelectAsset={(asset) => handleAssetSelect(asset, department, line, station)}
                          onContextMenu={(event, target) =>
                            openContextMenu(event, {
                              ...target,
                              departmentId: department._id,
                              lineId: line._id,
                              stationId: station._id,
                            })
                          }
                          selectedAssetId={selectedAssetId}
                          onEdit={() => openStationModal('edit', department, line, station)}
                        />
                      ))}
                    </LineTree>
                  ))}
                </DepartmentTree>
              ))
            )}
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-slate-900/95 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Assets &amp; Locations</h2>
            {selectedContext.stationName && (
              <span className="text-xs text-slate-400">
                Viewing {selectedContext.stationName}
                {selectedContext.lineName ? ` · ${selectedContext.lineName}` : ''}
                {selectedContext.departmentName ? ` · ${selectedContext.departmentName}` : ''}
              </span>
            )}
          </div>
          <AssetTable
            assets={selectedAssets}
            search={searchTerm}
            onRowClick={handleAssetRowClick}
            onDuplicate={handleAssetDuplicate}
            onDelete={handleAssetDeleteFromTable}
          />
        </div>
      </div>
      {renderContextMenu()}
      <DepartmentModal
        isOpen={departmentModalState.open}
        mode={departmentModalState.mode}
        initialData={departmentModalState.department ?? undefined}
        onSubmit={handleDepartmentSubmit}
        onDelete={departmentModalState.mode === 'edit' ? handleDepartmentDelete : undefined}
        onClose={() => setDepartmentModalState({ open: false, mode: 'create', department: null, loading: false })}
        loading={departmentModalState.loading}
      />
      <LineModal
        isOpen={lineModalState.open}
        mode={lineModalState.mode}
        departmentName={lineModalState.departmentName}
        initialData={lineModalState.line ?? undefined}
        onSubmit={handleLineSubmit}
        onDelete={lineModalState.mode === 'edit' ? handleLineDelete : undefined}
        onClose={() =>
          setLineModalState({
            open: false,
            mode: 'create',
            departmentId: '',
            departmentName: '',
            line: null,
            loading: false,
          })
        }
        loading={lineModalState.loading}
      />
      <StationModal
        isOpen={stationModalState.open}
        mode={stationModalState.mode}
        departmentName={stationModalState.departmentName}
        lineName={stationModalState.lineName}
        initialData={stationModalState.station ?? undefined}
        onSubmit={handleStationSubmit}
        onDelete={stationModalState.mode === 'edit' ? handleStationDelete : undefined}
        onClose={() =>
          setStationModalState({
            open: false,
            mode: 'create',
            departmentId: '',
            departmentName: '',
            lineId: '',
            lineName: '',
            station: null,
            loading: false,
          })
        }
        loading={stationModalState.loading}
      />
      <AssetModal
        isOpen={assetModalState.open}
        mode={assetModalState.mode}
        hierarchyPath={assetModalState.path}
        initialData={assetModalState.asset ?? undefined}
        onSubmit={handleAssetSubmit}
        onDelete={assetModalState.mode === 'edit' ? handleAssetDelete : undefined}
        onClose={() =>
          setAssetModalState({
            open: false,
            mode: 'create',
            departmentId: '',
            lineId: '',
            stationId: '',
            path: {},
            asset: null,
            loading: false,
          })
        }
        loading={assetModalState.loading}
      />
    </div>
  );
};

export default AssetsPage;
