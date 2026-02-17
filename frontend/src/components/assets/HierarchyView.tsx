/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import http from '@/lib/http';
import type { DepartmentHierarchy, LineWithStations, StationWithAssets, Asset } from '@/types';
import { useToast } from '@/context/ToastContext';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { SITE_KEY } from '@/lib/http';

interface SettingsResponse {
  activePlant?: string;
}

const HierarchyView: React.FC = () => {
  const [data, setData] = useState<DepartmentHierarchy[]>([]);
  const [activePlant, setActivePlant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchHierarchy = async (plantId: string) => {
    try {
      setLoading(true);
      const response = await http.get<DepartmentHierarchy[]>(
        `/departments/plant/${plantId}?include=lines,stations,assets`
      );
      setData(response.data);
    } catch (error) {
      addToast('Failed to load departments', 'error');
      console.error('Hierarchy load error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await http.get<SettingsResponse>('/settings');
        const plantId = settings.data.activePlant;
        if (plantId) {
          setActivePlant(plantId);
          await fetchHierarchy(plantId);
        } else {
          setData([]);
        }
      } catch (error) {
        console.error('Failed to load settings', error);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-4">
      {!activePlant && !loading ? (
        <div className="rounded border border-dashed border-[var(--wp-color-border)] p-4 text-sm text-[var(--wp-color-text-muted)]">
          Select a plant to view its hierarchy.
        </div>
      ) : null}
      {data.map((dep) => (
        <div key={dep.id} className="rounded border border-[var(--wp-color-border)] bg-[color-mix(in_srgb,var(--wp-color-surface)_70%,transparent)] p-4">
          <h3 className="font-semibold text-[var(--wp-color-text)]">{dep.name}</h3>
          {dep.lines.map((line: LineWithStations) => (
            <div key={line.id} className="ml-4 mt-2">
              <p className="font-medium text-[var(--wp-color-text)]">{line.name}</p>
              {line.stations.map((st: StationWithAssets) => (
                <div key={st.id} className="ml-4 mt-1">
                  <p className="text-[var(--wp-color-text)]">{st.name}</p>
                  <ul className="ml-4 list-disc text-[var(--wp-color-text-muted)]">
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
      {loading ? (
        <div className="text-sm text-[var(--wp-color-text-muted)]">Loading hierarchy...</div>
      ) : null}
    </div>
  );
};

export default HierarchyView;

