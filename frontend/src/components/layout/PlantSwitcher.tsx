/*
 * SPDX-License-Identifier: MIT
 */

import { Loader, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import http from '@/lib/http';
import { useSite } from '@/context/SiteContext';

interface PlantOption {
  value: string;
  label: string;
}

interface SettingsResponse {
  activePlant?: string;
}

const PlantSwitcher: React.FC = () => {
  const [options, setOptions] = useState<PlantOption[]>([]);
  const { siteId, setSiteId } = useSite();
  const [activePlant, setActivePlant] = useState<string | null>(siteId ?? null);
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

        const resolvedActive = settingsRes.data.activePlant ?? siteId;
        if (resolvedActive) {
          setActivePlant(resolvedActive);
          setSiteId(resolvedActive);
        } else if (plantOptions.length > 0) {
          const fallback = plantOptions[0].value;
          setActivePlant(fallback);
          setSiteId(fallback);
        }
      } catch (error) {
        console.error('Failed to load plant settings', error);
      }
    };

    loadPlants();
    return () => {
      mounted = false;
    };
  }, [siteId, setSiteId]);

  const handleChange = async (value: string | null) => {
    if (!value || value === activePlant) {
      return;
    }
    setActivePlant(value);
    setSiteId(value);
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
      aria-label={t('context.siteSelectorLabel')}
      placeholder={placeholder}
      data={data}
      value={activePlant?.id ?? null}
      onChange={(value) => value && switchPlant(value)}
      size="xs"
      radius="sm"
      allowDeselect={false}
      disabled={disabled}
      nothingFound={errors.plant ?? t('context.noSites')}
      error={errors.plant}
      rightSection={switchingPlant ? <Loader size="xs" aria-label={t('context.switchingSite')} /> : undefined}
      styles={{
        input: {
          minWidth: 160,
        },
      }}
    />
  );
};

export default PlantSwitcher;
