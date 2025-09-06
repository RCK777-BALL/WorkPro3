import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/common/Button';
import Drawer from '../components/ui/Drawer';
import NameDrawerForm from '../components/common/NameDrawerForm';
import { DepartmentForm, type DepartmentPayload } from '../components/departments/forms';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment as apiDeleteDepartment,
} from '../api/departments';

type StationItem = { id: string; name: string; assets: number };
type LineItem = { id: string; name: string; stations: StationItem[] };
type DeptItem = { id: string; name: string; description?: string; lines: LineItem[] };

const toStationItem = (s: { _id?: string; id?: string; name: string; assets?: number }): StationItem => ({
  id: s._id ?? s.id ?? '',
  name: s.name,
  assets: s.assets ?? 0,
});

const toLineItem = (l: { _id?: string; id?: string; name: string; stations?: any[] }): LineItem => ({
  id: l._id ?? l.id ?? '',
  name: l.name,
  stations: (l.stations ?? []).map(toStationItem),
});

const toDeptItem = (
  d: {
    _id?: string;
    id?: string;
    name: string;
    description?: string;
    lines?: any[];
  },
): DeptItem => ({
  id: d._id ?? d.id ?? '',
  name: d.name,
  description: d.description,
  lines: (d.lines ?? []).map(toLineItem),
});

type DrawerState =
  | { kind: 'none' }
  | { kind: 'create-dept' }
  | { kind: 'edit-dept'; dep: DeptItem }
  | { kind: 'create-line'; depId: string }
  | { kind: 'edit-line'; depId: string; line: LineItem }
  | { kind: 'create-station'; depId: string; lineId: string }
  | {
      kind: 'edit-station';
      depId: string;
      lineId: string;
      station: StationItem;
    };

export default function Departments() {
  const [items, setItems] = useState<DeptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>({ kind: 'none' });
  const [expandedDeps, setExpandedDeps] = useState<Record<string, boolean>>({});
  const [expandedLines, setExpandedLines] = useState<
    Record<string, Record<string, boolean>>
  >({});

  useEffect(() => {
    setLoading(true);
    listDepartments()
      .then((deps) => deps.map(toDeptItem))
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const toggleDep = (id: string) =>
    setExpandedDeps((s) => ({ ...s, [id]: !s[id] }));

  const toggleLine = (depId: string, lineId: string) =>
    setExpandedLines((s) => ({
      ...s,
      [depId]: { ...s[depId], [lineId]: !s[depId]?.[lineId] },
    }));

  const assetCount = (dep: DeptItem) =>
    dep.lines.reduce(
      (sum, l) => sum + l.stations.reduce((s, st) => s + st.assets, 0),
      0
    );

  const handleFormSubmit = (values: { name: string; assets?: number }) => {
    switch (drawer.kind) {
      case 'create-line':
        setItems((prev) =>
          prev.map((d) =>
            d.id === drawer.depId
              ? {
                  ...d,
                  lines: [
                    { id: Date.now().toString(), name: values.name, stations: [] },
                    ...d.lines,
                  ],
                }
              : d
          )
        );
        break;
      case 'edit-line':
        setItems((prev) =>
          prev.map((d) =>
            d.id === drawer.depId
              ? {
                  ...d,
                  lines: d.lines.map((l) =>
                    l.id === drawer.line.id ? { ...l, name: values.name } : l
                  ),
                }
              : d
          )
        );
        break;
      case 'create-station':
        setItems((prev) =>
          prev.map((d) =>
            d.id === drawer.depId
              ? {
                  ...d,
                  lines: d.lines.map((l) =>
                    l.id === drawer.lineId
                      ? {
                          ...l,
                          stations: [
                            {
                              id: Date.now().toString(),
                              name: values.name,
                              assets: values.assets ?? 0,
                            },
                            ...l.stations,
                          ],
                        }
                      : l
                  ),
                }
              : d
          )
        );
        break;
      case 'edit-station':
        setItems((prev) =>
          prev.map((d) =>
            d.id === drawer.depId
              ? {
                  ...d,
                  lines: d.lines.map((l) =>
                    l.id === drawer.lineId
                      ? {
                          ...l,
                          stations: l.stations.map((s) =>
                            s.id === drawer.station.id
                              ? {
                                  ...s,
                                  name: values.name,
                                  assets: values.assets ?? s.assets,
                                }
                              : s
                          ),
                        }
                      : l
                  ),
                }
              : d
          )
        );
        break;
      default:
        break;
    }
    setDrawer({ kind: 'none' });
  };

  const confirmDelete = (msg: string) => window.confirm(msg);

  const removeDepartment = (id: string) => {
    if (!confirmDelete('Delete department?')) return;
    setItems((prev) => prev.filter((d) => d.id !== id));
    apiDeleteDepartment(id).catch(() => {
      // rollback could be added here
    });
  };

  const removeLine = (depId: string, lineId: string) => {
    if (!confirmDelete('Delete line?')) return;
    setItems((prev) =>
      prev.map((d) =>
        d.id === depId
          ? { ...d, lines: d.lines.filter((l) => l.id !== lineId) }
          : d
      )
    );
  };

  const removeStation = (depId: string, lineId: string, stationId: string) => {
    if (!confirmDelete('Delete station?')) return;
    setItems((prev) =>
      prev.map((d) =>
        d.id === depId
          ? {
              ...d,
              lines: d.lines.map((l) =>
                l.id === lineId
                  ? {
                      ...l,
                      stations: l.stations.filter((s) => s.id !== stationId),
                    }
                  : l
              ),
            }
          : d
      )
    );
  };

  return (
    <Layout title="Departments">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Departments</h1>
          <Button onClick={() => setDrawer({ kind: 'create-dept' })}>
            Add Department
          </Button>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {items.map((d) => (
              <li key={d.id} className="py-2 flex items-center justify-between">
                {d.name}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDrawer({ kind: 'edit-dept', dep: d })}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Drawer
          open={drawer.kind === 'create-dept' || drawer.kind === 'edit-dept'}
          onClose={() => setDrawer({ kind: 'none' })}
          title={drawer.kind === 'edit-dept' ? 'Edit Department' : 'Add Department'}
        >
          <DepartmentForm
            initial={
              drawer.kind === 'edit-dept'
                ? { name: drawer.dep.name, description: drawer.dep.description }
                : undefined
            }
            onCancel={() => setDrawer({ kind: 'none' })}
            onSubmit={async (payload: DepartmentPayload) => {
              if (drawer.kind === 'edit-dept') {
                const updated = await updateDepartment(drawer.dep.id, payload).then(
                  toDeptItem,
                );
                setItems((prev) =>
                  prev.map((d) => (d.id === updated.id ? updated : d))
                );
              } else {
                const dep = await createDepartment(payload).then(toDeptItem);
                setItems((prev) => [dep, ...prev]);
              }
              setDrawer({ kind: 'none' });
            }}
          />
        </Drawer>

        <NameDrawerForm
          open={
            drawer.kind !== 'none' &&
            drawer.kind !== 'create-dept' &&
            drawer.kind !== 'edit-dept'
          }
          title={
            drawer.kind === 'create-line'
              ? 'Add Line'
              : drawer.kind === 'edit-line'
              ? 'Edit Line'
              : drawer.kind === 'create-station'
              ? 'Add Station'
              : drawer.kind === 'edit-station'
              ? 'Edit Station'
              : ''
          }
          initialName={
            drawer.kind === 'edit-line'
              ? drawer.line.name
              : drawer.kind === 'edit-station'
              ? drawer.station.name
              : ''
          }
          initialAssets={
            drawer.kind === 'edit-station' ? drawer.station.assets : 0
          }
          showAssetInput={
            drawer.kind === 'create-station' || drawer.kind === 'edit-station'
          }
          onSubmit={handleFormSubmit}
          onClose={() => setDrawer({ kind: 'none' })}
        />
      </div>
    </Layout>
  );
}
