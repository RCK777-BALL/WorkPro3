import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import DepartmentModal from '../components/assets/DepartmentModal';
import DepartmentHierarchyGrid from '../components/departments/DepartmentHierarchyGrid';
import type {
  DepartmentHierarchy,
  LineWithStations,
  StationWithAssets,
  Department,
  Line,
  Station,
  Asset,
} from '../types';
import api from '../utils/api';
import { useSummary } from '../hooks/useSummaryData';
import { enqueueDepartmentRequest } from '../utils/offlineQueue';
import { useDepartmentStore } from '../store/departmentStore';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const DEPT_CACHE_KEY = 'offline-departments';
const HIER_CACHE_KEY = 'offline-hierarchies';

const mapHierarchy = (data: any): DepartmentHierarchy => ({
  id: data._id ?? data.id,
  name: data.name,
  lines: (data.lines || []).map((l: any) => ({
    id: l._id ?? l.id,
    name: l.name,
    department: data._id ?? data.id,
    stations: (l.stations || []).map((s: any) => ({
      id: s._id ?? s.id,
      name: s.name,
      line: l._id ?? l.id,
      assets: (s.assets || []).map(
        (a: any) =>
          ({
            id: a._id ?? a.id,
            name: a.name,
            type: a.type,
            location: a.location,
            status: a.status,
          } as Asset)
      ),
    })),
  })),
});

const DepartmentsPage = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const departments = useDepartmentStore((s) => s.departments);
  const setDepartments = useDepartmentStore((s) => s.setDepartments);
  const addDepartment = useDepartmentStore((s) => s.addDepartment);
  const updateDepartment = useDepartmentStore((s) => s.updateDepartment);
  const removeDepartment = useDepartmentStore((s) => s.removeDepartment);

  const [selected, setSelected] = useState<DepartmentHierarchy | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hierarchies, setHierarchies] = useState<DepartmentHierarchy[]>([]);

  const [, refreshDepartments] = useSummary<Department[]>(
    '/departments',
    [],
    { auto: false, poll: false, ttlMs: 60_000 },
  );

  const fetchDepartments = async () => {
    if (!navigator.onLine) {
      const cachedDeps = localStorage.getItem(DEPT_CACHE_KEY);
      const cachedHier = localStorage.getItem(HIER_CACHE_KEY);
      if (cachedDeps) {
        setDepartments(JSON.parse(cachedDeps));
        if (cachedHier) setHierarchies(JSON.parse(cachedHier));
        addToast('Loaded departments from cache', 'info');
      } else {
        addToast('Offline and no cached departments available', 'error');
      }
      return;
    }

    try {
      const dataRaw = await refreshDepartments();
      const data = (dataRaw || []).map((d: any) => ({ id: d._id ?? d.id, name: d.name })) as Department[];
      setDepartments(data);
      localStorage.setItem(DEPT_CACHE_KEY, JSON.stringify(data));

      const cachedHierarchies: DepartmentHierarchy[] = JSON.parse(
        localStorage.getItem(HIER_CACHE_KEY) || '[]'
      );

      const results = await Promise.allSettled(
        data.map((d) => api.get(`/departments/${d.id}/hierarchy`))
      );
      const loaded: DepartmentHierarchy[] = [];
      const failed: string[] = [];
      const fromCache: string[] = [];

      results.forEach((r, i) => {
        const dep = data[i];
        if (r.status === 'fulfilled') {
          loaded.push(mapHierarchy(r.value.data));
        } else {
          const cached = cachedHierarchies.find((h) => h.id === dep.id);
          if (cached) {
            loaded.push(cached);
            fromCache.push(dep.name);
          } else {
            failed.push(dep.name);
          }
        }
      });

      setHierarchies(loaded);
      localStorage.setItem(HIER_CACHE_KEY, JSON.stringify(loaded));

      if (fromCache.length) {
        addToast(
          `Using cached hierarchies for ${fromCache.length} department${
            fromCache.length > 1 ? 's' : ''
          }`,
          'info'
        );
      }
      if (failed.length) {
        addToast(
          `Failed to load ${failed.length} department hierarch${
            failed.length > 1 ? 'ies' : 'y'
          }`,
          'warning'
        );
      }
    } catch (err) {
      console.error(err);
      const cachedDeps = localStorage.getItem(DEPT_CACHE_KEY);
      const cachedHier = localStorage.getItem(HIER_CACHE_KEY);
      if (cachedDeps) {
        setDepartments(JSON.parse(cachedDeps));
        if (cachedHier) setHierarchies(JSON.parse(cachedHier));
        addToast('Using cached departments', 'info');
      } else {
        addToast('Failed to load departments', 'error');
      }
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleEdit = async (dep: Department) => {
    try {
      const res = await api.get(`/departments/${dep.id}/hierarchy`);
      setSelected(mapHierarchy(res.data));
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      addToast('Failed to load department', 'error');
    }
  };

  const toPayload = (dept: DepartmentHierarchy) => ({
    name: dept.name,
    lines: dept.lines.map((l) => ({
      name: l.name,
      stations: l.stations.map((s) => ({
        name: s.name,
        assets: s.assets.map((a) => ({
          name: a.name,
          type: a.type,
          location: a.location,
          status: a.status,
        })),
      })),
    })),
  });

  const handleSave = async (dep: DepartmentHierarchy) => {
    setLoading(true);
    try {
      const payload = toPayload(dep);
      let saved: Department;
      if (!navigator.onLine) {
        if (dep.id) {
          enqueueDepartmentRequest('put', { ...payload, id: dep.id });
          saved = { id: dep.id, name: dep.name };
          updateDepartment(saved);
        } else {
          enqueueDepartmentRequest('post', payload as any);
          saved = { id: Date.now().toString(), name: dep.name };
          addDepartment(saved);
        }
        addToast('Department saved', 'success');
        setModalOpen(false);
        setShowCreateModal(false);
        return;
      }
      if (dep.id) {
        const res = await api.put(`/departments/${dep.id}`, payload);
        saved = { id: res.data._id, name: res.data.name };
        updateDepartment(saved);
      } else {
        const res = await api.post('/departments', payload);
        saved = { id: res.data._id, name: res.data.name };
        addDepartment(saved);
      }
      addToast('Department saved', 'success');
      setModalOpen(false);
      setShowCreateModal(false);
    } catch (err: any) {
      console.error(err.response?.data || err);
      addToast('Failed to save department', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!navigator.onLine) {
        enqueueDepartmentRequest('delete', { id, name: '' });
        removeDepartment(id);
        addToast('Department deleted', 'success');
        return;
      }
      await api.delete(`/departments/${id}`);
      removeDepartment(id);
      addToast('Department deleted', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to delete department', 'error');
    }
  };

  const updateHierarchyState = (
    depId: string,
    updater: (d: DepartmentHierarchy) => DepartmentHierarchy
  ) => {
    setHierarchies((hs) => hs.map((h) => (h.id === depId ? updater(h) : h)));
  };

  const handleAddLine = async (depId: string) => {
    try {
      const res = await api.post('/lines', { departmentId: depId, name: '' });
      const newLine: LineWithStations = {
        id: res.data._id ?? res.data.id,
        name: '',
        department: depId,
        stations: [],
      };
      updateHierarchyState(depId, (d) => ({ ...d, lines: [...d.lines, newLine] }));
    } catch (err) {
      console.error(err);
      addToast('Failed to add line', 'error');
    }
  };

  const handleUpdateLine = async (depId: string, line: LineWithStations) => {
    try {
      await api.put(`/lines/${line.id}`, { name: line.name });
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.map((l) => (l.id === line.id ? line : l)),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to update line', 'error');
    }
  };

  const handleDeleteLine = async (depId: string, lineId: string) => {
    try {
      await api.delete(`/lines/${lineId}`);
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.filter((l) => l.id !== lineId),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to delete line', 'error');
    }
  };

  const handleAddStation = async (depId: string, lineId: string) => {
    try {
      const res = await api.post('/stations', { lineId, name: '' });
      const newStation: StationWithAssets = {
        id: res.data._id ?? res.data.id,
        name: '',
        line: lineId,
        assets: [],
      };
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.map((l) =>
          l.id === lineId ? { ...l, stations: [...l.stations, newStation] } : l
        ),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to add station', 'error');
    }
  };

  const handleUpdateStation = async (
    depId: string,
    lineId: string,
    station: StationWithAssets
  ) => {
    try {
      await api.put(`/stations/${station.id}`, { name: station.name });
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.map((l) =>
          l.id === lineId
            ? {
                ...l,
                stations: l.stations.map((s) => (s.id === station.id ? station : s)),
              }
            : l
        ),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to update station', 'error');
    }
  };

  const handleDeleteStation = async (
    depId: string,
    lineId: string,
    stationId: string
  ) => {
    try {
      await api.delete(`/stations/${stationId}`);
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.map((l) =>
          l.id === lineId
            ? { ...l, stations: l.stations.filter((s) => s.id !== stationId) }
            : l
        ),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to delete station', 'error');
    }
  };

  const handleAddAsset = async (
    depId: string,
    lineId: string,
    stationId: string
  ) => {
    try {
      const res = await api.post('/assets', {
        stationId,
        lineId,
        departmentId: depId,
        name: '',
        type: 'Electrical',
      });
      const asset: Asset = {
        id: res.data._id ?? res.data.id,
        name: '',
        type: 'Electrical',
      };
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.map((l) =>
          l.id === lineId
            ? {
                ...l,
                stations: l.stations.map((s) =>
                  s.id === stationId ? { ...s, assets: [...s.assets, asset] } : s
                ),
              }
            : l
        ),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to add asset', 'error');
    }
  };

  const handleUpdateAsset = async (
    depId: string,
    lineId: string,
    stationId: string,
    asset: Asset
  ) => {
    try {
      await api.put(`/assets/${asset.id}`, { name: asset.name, type: asset.type });
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.map((l) =>
          l.id === lineId
            ? {
                ...l,
                stations: l.stations.map((s) =>
                  s.id === stationId
                    ? {
                        ...s,
                        assets: s.assets.map((a) => (a.id === asset.id ? asset : a)),
                      }
                    : s
                ),
              }
            : l
        ),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to update asset', 'error');
    }
  };

  const handleDeleteAsset = async (
    depId: string,
    lineId: string,
    stationId: string,
    assetId: string
  ) => {
    try {
      await api.delete(`/assets/${assetId}`);
      updateHierarchyState(depId, (d) => ({
        ...d,
        lines: d.lines.map((l) =>
          l.id === lineId
            ? {
                ...l,
                stations: l.stations.map((s) =>
                  s.id === stationId
                    ? { ...s, assets: s.assets.filter((a) => a.id !== assetId) }
                    : s
                ),
              }
            : l
        ),
      }));
    } catch (err) {
      console.error(err);
      addToast('Failed to delete asset', 'error');
    }
  };

  return (
    <Layout title="Departments">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Departments</h2>
          <Button
            variant="primary"
            onClick={() => {
              setSelected(null);
              setShowCreateModal(true);
            }}
            disabled={!user}
          >
            Add Department
          </Button>
        </div>
        <div className="space-y-6">
          {hierarchies.map((h) => (
            <div key={h.id} className="border rounded-md p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{h.name}</h3>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(h)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(h.id)}>
                    Delete
                  </Button>
                </div>
              </div>
              <DepartmentHierarchyGrid
                department={h}
                onCreateLine={handleAddLine}
                onUpdateLine={(line) => handleUpdateLine(h.id, line)}
                onDeleteLine={(lineId) => handleDeleteLine(h.id, lineId)}
                onCreateStation={(lineId) => handleAddStation(h.id, lineId)}
                onUpdateStation={(station) => handleUpdateStation(h.id, station.line, station)}
                onDeleteStation={(stationId) => {
                  const line = h.lines.find((l) => l.stations.some((s) => s.id === stationId));
                  if (line) handleDeleteStation(h.id, line.id, stationId);
                }}
                onCreateAsset={(depId, lineId, stationId) => handleAddAsset(depId, lineId, stationId)}
                onUpdateAsset={(asset, depId, lineId, stationId) =>
                  handleUpdateAsset(depId, lineId, stationId, asset)
                }
                onDeleteAsset={(depId, lineId, stationId, assetId) =>
                  handleDeleteAsset(depId, lineId, stationId, assetId)
                }
              />
            </div>
          ))}
          {hierarchies.length === 0 && (
            <p className="py-2 text-neutral-500">No departments</p>
          )}
        </div>
        <DepartmentModal
          isOpen={modalOpen || showCreateModal}
          onClose={() => {
            setModalOpen(false);
            setShowCreateModal(false);
          }}
          department={showCreateModal ? null : selected}
          onUpdate={handleSave}
          loading={loading}
        />
      </div>
    </Layout>
  );
};

export default DepartmentsPage;
