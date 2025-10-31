/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { Select } from '@mantine/core';

import http, { SITE_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

interface PlantOption {
  value: string;
  label: string;
}

interface SettingsResponse {
  activePlant?: string;
}

const PlantSwitcher: React.FC = () => {
  const [options, setOptions] = useState<PlantOption[]>([]);
  const [activePlant, setActivePlant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadPlants = async () => {
      try {
        const [plantsRes, settingsRes] = await Promise.all([
          http.get<Array<{ _id: string; name: string }>>('/plants'),
          http.get<SettingsResponse>('/settings'),
        ]);
        if (!mounted) return;
        const plantOptions = plantsRes.data.map((plant) => ({
          value: plant._id,
          label: plant.name,
        }));
        setOptions(plantOptions);

        const resolvedActive = settingsRes.data.activePlant ?? safeLocalStorage.getItem(SITE_KEY);
        if (resolvedActive) {
          setActivePlant(resolvedActive);
          safeLocalStorage.setItem(SITE_KEY, resolvedActive);
        } else if (plantOptions.length > 0) {
          const fallback = plantOptions[0].value;
          setActivePlant(fallback);
          safeLocalStorage.setItem(SITE_KEY, fallback);
        }
      } catch (error) {
        console.error('Failed to load plant settings', error);
      }
    };

    loadPlants();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = async (value: string | null) => {
    if (!value || value === activePlant) {
      return;
    }
    setActivePlant(value);
    safeLocalStorage.setItem(SITE_KEY, value);
    setLoading(true);
    try {
      await http.post('/global/switch-plant', { plantId: value });
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch plant', error);
      setLoading(false);
    }
  };

  return (
    <Select
      placeholder={options.length ? 'Select plant' : 'No plants available'}
      data={options}
      value={activePlant}
      onChange={handleChange}
      size="xs"
      radius="sm"
      allowDeselect={false}
      disabled={options.length === 0 || loading}
      styles={{
        input: {
          minWidth: 160,
        },
      }}
    />
  );
};

export default PlantSwitcher;
