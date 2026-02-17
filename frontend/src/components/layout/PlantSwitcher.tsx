/*
 * SPDX-License-Identifier: MIT
 */

import { Loader, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { useScopeContext } from '@/context/ScopeContext';

const PlantSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { plants, activePlant, switchPlant, loadingPlants, switchingPlant, errors } = useScopeContext();

  const data = plants.map((plant) => ({ value: plant.id, label: plant.name }));
  const placeholder = plants.length ? t('context.selectSite') : t('context.noSites');
  const disabled = loadingPlants || switchingPlant || plants.length === 0;

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
      nothingFoundMessage={errors.plant ?? t('context.noSites')}
      error={errors.plant}
      rightSection={switchingPlant ? <Loader size="xs" aria-label={t('context.switchingSite')} /> : undefined}
      styles={{
        input: {
          minWidth: 160,
          backgroundColor: 'var(--wp-color-surface)',
          borderColor: 'var(--wp-color-border)',
          color: 'var(--wp-color-text)',
        },
        dropdown: {
          backgroundColor: 'var(--wp-color-surface)',
          borderColor: 'var(--wp-color-border)',
          color: 'var(--wp-color-text)',
        },
        option: {
          color: 'var(--wp-color-text)',
        },
      }}
    />
  );
};

export default PlantSwitcher;
