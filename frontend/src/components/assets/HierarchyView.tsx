/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import http from '@/lib/http';
import type { DepartmentHierarchy, LineWithStations, StationWithAssets, Asset } from '@/types';
import { useToast } from '@/context/ToastContext';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { SITE_KEY } from '@/lib/http';

const HierarchyView: React.FC = () => {
  const [data, setData] = useState<DepartmentHierarchy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlant, setActivePlant] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const loadHierarchy = async () => {
      setLoading(true);
      try {
        const settingsRes = await http.get<{ activePlant?: string | null }>('/settings');
        const plantId = settingsRes.data?.activePlant ?? safeLocalStorage.getItem(SITE_KEY);

        if (!plantId) {
          if (!cancelled) {
            setActivePlant(null);
            setData([]);
          }
          safeLocalStorage.removeItem(SITE_KEY);
          return;
        }

        safeLocalStorage.setItem(SITE_KEY, plantId);
        if (!cancelled) {
          setActivePlant(plantId);
        }

        const departmentsRes = await http.get<DepartmentHierarchy[]>('/departments', {
          params: { include: 'lines,stations,assets' },
        });

        if (!cancelled) {
          setData(departmentsRes.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setData([]);
          addToast('Failed to load plant hierarchy', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, [addToast]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading plant hierarchy…</p>;
  }

  if (!activePlant) {
    return <p className="text-sm text-slate-400">Select a plant to view the hierarchy.</p>;
  }

  if (data.length === 0) {
    return <p className="text-sm text-slate-400">No departments found for this plant yet.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((dep) => (
        <div key={dep.id} className="rounded border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="text-lg font-semibold text-slate-100">{dep.name}</h3>
          {dep.lines.map((line: LineWithStations) => (
            <div key={line.id} className="ml-4 mt-2">
              <p className="font-medium text-slate-200">{line.name}</p>
              {line.stations.map((st: StationWithAssets) => (
                <div key={st.id} className="ml-4 mt-1">
                  <p className="text-slate-300">{st.name}</p>
                  <ul className="ml-4 list-disc text-sm text-slate-400">
                    {st.assets.map((a: Asset) => (
                      <li key={a.id}>{a.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default HierarchyView;
