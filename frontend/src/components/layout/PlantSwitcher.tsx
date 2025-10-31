/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import clsx from 'clsx';

import http from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { SITE_KEY } from '@/lib/http';

interface PlantOption {
  _id: string;
  name: string;
}

export default function PlantSwitcher() {
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [open, setOpen] = useState(false);
  const [activePlant, setActivePlant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [plantRes, settingsRes] = await Promise.all([
          http.get<PlantOption[]>('/plants'),
          http.get<{ activePlant?: string | null }>('/settings'),
        ]);
        if (cancelled) return;
        setPlants(plantRes.data ?? []);
        const active =
          settingsRes.data?.activePlant ?? safeLocalStorage.getItem(SITE_KEY);
        setActivePlant(active && active !== 'null' ? active : null);
      } catch (err) {
        console.error('Failed to load plants', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = async (plantId: string) => {
    setLoading(true);
    try {
      setActivePlant(plantId);
      safeLocalStorage.setItem(SITE_KEY, plantId);
      await http.post('/global/switch-plant', { plantId });
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch plant', err);
      setLoading(false);
    }
  };

  if (!plants.length) {
    return null;
  }

  const activeName = plants.find((p) => p._id === activePlant)?.name ?? 'Select Plant';

  return (
    <div className="relative">
      <button
        type="button"
        className={clsx(
          'flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 shadow-sm',
          'transition-colors hover:border-slate-600 hover:bg-slate-900/80',
        )}
        onClick={() => setOpen((prev) => !prev)}
        disabled={loading}
      >
        <span className="truncate max-w-[160px]">{activeName}</span>
        <ChevronsUpDown size={16} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-slate-700 bg-slate-900 shadow-lg">
          <ul className="max-h-64 overflow-y-auto py-1 text-sm text-slate-200">
            {plants.map((plant) => (
              <li key={plant._id}>
                <button
                  type="button"
                  className={clsx(
                    'flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-800',
                    plant._id === activePlant && 'bg-slate-800',
                  )}
                  onClick={() => {
                    setOpen(false);
                    if (plant._id !== activePlant) {
                      void handleSelect(plant._id);
                    }
                  }}
                >
                  <span>{plant.name}</span>
                  {plant._id === activePlant && <span className="text-xs text-emerald-400">Active</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
