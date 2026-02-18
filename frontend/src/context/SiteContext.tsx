/* eslint-disable react-refresh/only-export-components */
/*
 * SPDX-License-Identifier: MIT
 */

import React, { createContext, useContext, useMemo, useState } from 'react';

import { SITE_KEY } from '@/lib/http';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

type SiteContextValue = {
  siteId?: string;
  setSiteId: (siteId: string | null) => void;
};

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteId, setSiteIdState] = useState<string | undefined>(() => {
    const stored = safeLocalStorage.getItem(SITE_KEY);
    return stored ?? undefined;
  });

  const setSiteId = (value: string | null) => {
    setSiteIdState(value ?? undefined);
    if (value) {
      safeLocalStorage.setItem(SITE_KEY, value);
    } else {
      safeLocalStorage.removeItem(SITE_KEY);
    }
  };

  const value = useMemo(() => ({ siteId, setSiteId }), [siteId]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
};

export const useSite = (): SiteContextValue => {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return ctx;
};

