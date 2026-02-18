/* eslint-disable react-refresh/only-export-components */
/*
 * SPDX-License-Identifier: MIT
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import http, { SITE_KEY, TENANT_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';
import { emitToast } from './ToastContext';
import { useAuth } from './AuthContext';

type ScopeOption = {
  id: string;
  name: string;
};

type ScopeErrors = {
  tenant?: string;
  plant?: string;
};

type ScopeContextValue = {
  tenants: ScopeOption[];
  plants: ScopeOption[];
  activeTenant: ScopeOption | null;
  activePlant: ScopeOption | null;
  loadingTenants: boolean;
  loadingPlants: boolean;
  switchingTenant: boolean;
  switchingPlant: boolean;
  errors: ScopeErrors;
  refreshTenants: () => Promise<void>;
  refreshPlants: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  switchPlant: (plantId: string) => Promise<void>;
};

const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

const normalizeOptions = (items: Array<{ _id?: string; id?: string; name?: string }>): ScopeOption[] =>
  items
    .filter((item) => item._id || item.id)
    .map((item) => ({
      id: (item._id ?? item.id ?? '').toString(),
      name: item.name ?? '—',
    }));

export const ScopeProvider = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tenants, setTenants] = useState<ScopeOption[]>([]);
  const [plants, setPlants] = useState<ScopeOption[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(
    safeLocalStorage.getItem(TENANT_KEY) ?? user?.tenantId ?? null,
  );
  const [activePlantId, setActivePlantId] = useState<string | null>(
    safeLocalStorage.getItem(SITE_KEY) ?? user?.siteId ?? null,
  );
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingPlants, setLoadingPlants] = useState(true);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const [switchingPlant, setSwitchingPlant] = useState(false);
  const [errors, setErrors] = useState<ScopeErrors>({});

  const refreshTenants = useCallback(async () => {
    setLoadingTenants(true);
    setErrors((prev) => ({ ...prev, tenant: undefined }));
    try {
      const res = await http.get<Array<{ _id: string; name: string }>>('/tenants');
      const options = normalizeOptions(res.data);
      setTenants(options);

      const storedTenant = safeLocalStorage.getItem(TENANT_KEY);
      const candidateTenant = activeTenantId ?? user?.tenantId ?? storedTenant;
      const resolvedTenant =
        candidateTenant && options.some((tenant) => tenant.id === candidateTenant)
          ? candidateTenant
          : options[0]?.id ?? null;

      if (resolvedTenant) {
        safeLocalStorage.setItem(TENANT_KEY, resolvedTenant);
        setActiveTenantId(resolvedTenant);
      }
    } catch (error) {
      console.error('Failed to load tenants', error);
      setErrors((prev) => ({ ...prev, tenant: t('context.loadTenantsError') }));
    } finally {
      setLoadingTenants(false);
    }
  }, [activeTenantId, t, user?.tenantId]);

  const refreshPlants = useCallback(async () => {
    setLoadingPlants(true);
    setErrors((prev) => ({ ...prev, plant: undefined }));
    try {
      const [plantsRes, settingsRes] = await Promise.all([
        http.get<Array<{ _id: string; name: string }>>('/plants'),
        http.get<{ activePlant?: string }>('/settings'),
      ]);
      const options = normalizeOptions(plantsRes.data);
      setPlants(options);

      const storedPlant = safeLocalStorage.getItem(SITE_KEY);
      const candidatePlant = settingsRes.data.activePlant ?? activePlantId ?? storedPlant;
      const resolvedActive =
        candidatePlant && options.some((plant) => plant.id === candidatePlant)
          ? candidatePlant
          : options[0]?.id ?? null;

      if (resolvedActive) {
        safeLocalStorage.setItem(SITE_KEY, resolvedActive);
        setActivePlantId(resolvedActive);
      }
    } catch (error) {
      console.error('Failed to load plant settings', error);
      setErrors((prev) => ({ ...prev, plant: t('context.loadPlantsError') }));
    } finally {
      setLoadingPlants(false);
    }
  }, [activePlantId, t]);

  useEffect(() => {
    refreshTenants();
  }, [refreshTenants]);

  useEffect(() => {
    refreshPlants();
  }, [refreshPlants]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      if (!tenantId || tenantId === activeTenantId) return;
      setSwitchingTenant(true);
      setErrors((prev) => ({ ...prev, tenant: undefined }));
      try {
        safeLocalStorage.setItem(TENANT_KEY, tenantId);
        setActiveTenantId(tenantId);
        safeLocalStorage.removeItem(SITE_KEY);
        setActivePlantId(null);
        emitToast(t('context.tenantSwitched', { tenant: tenants.find((t) => t.id === tenantId)?.name ?? '' }));
        await refreshPlants();
      } catch (error) {
        console.error('Failed to switch tenant', error);
        setErrors((prev) => ({ ...prev, tenant: t('context.switchTenantError') }));
      } finally {
        setSwitchingTenant(false);
      }
    },
    [activeTenantId, refreshPlants, t, tenants],
  );

  const switchPlant = useCallback(
    async (plantId: string) => {
      if (!plantId || plantId === activePlantId) return;
      setSwitchingPlant(true);
      setErrors((prev) => ({ ...prev, plant: undefined }));
      try {
        await http.post('/global/switch-plant', { plantId });
        safeLocalStorage.setItem(SITE_KEY, plantId);
        setActivePlantId(plantId);
        emitToast(t('context.siteSwitched', { site: plants.find((p) => p.id === plantId)?.name ?? '' }));
      } catch (error) {
        console.error('Failed to switch plant', error);
        setErrors((prev) => ({ ...prev, plant: t('context.switchPlantError') }));
      } finally {
        setSwitchingPlant(false);
      }
    },
    [activePlantId, plants, t],
  );

  const value = useMemo<ScopeContextValue>(
    () => ({
      tenants,
      plants,
      activeTenant: tenants.find((tenant) => tenant.id === activeTenantId) ?? null,
      activePlant: plants.find((plant) => plant.id === activePlantId) ?? null,
      loadingTenants,
      loadingPlants,
      switchingTenant,
      switchingPlant,
      errors,
      refreshTenants,
      refreshPlants,
      switchTenant,
      switchPlant,
    }),
    [
      tenants,
      plants,
      activeTenantId,
      activePlantId,
      loadingTenants,
      loadingPlants,
      switchingTenant,
      switchingPlant,
      errors,
      refreshTenants,
      refreshPlants,
      switchTenant,
      switchPlant,
    ],
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
};

export const useScopeContext = () => {
  const context = useContext(ScopeContext);
  if (!context) {
    throw new Error('useScopeContext must be used within a ScopeProvider');
  }
  return context;
};

