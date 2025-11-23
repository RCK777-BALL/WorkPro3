/*
 * SPDX-License-Identifier: MIT
 */

import { Loader, Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { useScopeContext } from '@/context/ScopeContext';

const TenantSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { tenants, activeTenant, switchTenant, loadingTenants, switchingTenant, errors } = useScopeContext();

  const data = tenants.map((tenant) => ({ value: tenant.id, label: tenant.name }));
  const placeholder = tenants.length ? t('context.selectTenant') : t('context.noTenants');
  const disabled = loadingTenants || switchingTenant || tenants.length === 0;

  return (
    <Select
      aria-label={t('context.tenantSelectorLabel')}
      placeholder={placeholder}
      data={data}
      value={activeTenant?.id ?? null}
      onChange={(value) => value && switchTenant(value)}
      size="xs"
      radius="sm"
      allowDeselect={false}
      disabled={disabled}
      nothingFound={errors.tenant ?? t('context.noTenants')}
      error={errors.tenant}
      rightSection={switchingTenant ? <Loader size="xs" aria-label={t('context.switchingTenant')} /> : undefined}
      styles={{
        input: {
          minWidth: 160,
        },
      }}
    />
  );
};

export default TenantSwitcher;
