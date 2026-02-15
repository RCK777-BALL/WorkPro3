/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { safeLocalStorage } from '@/utils/safeLocalStorage';

export interface TableSortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface TableLayoutState {
  columnOrder: string[];
  hiddenColumns: string[];
  sort?: TableSortState | null;
  filters?: Record<string, string>;
}

export interface SavedTableLayout {
  id: string;
  name: string;
  state: TableLayoutState;
  updatedAt: string;
}

interface PersistedLayoutState {
  preferences: TableLayoutState;
  saved: SavedTableLayout[];
  activeLayoutId?: string;
}

interface UseTableLayoutOptions {
  tableKey: string;
  columnIds: string[];
  userId?: string | null;
  defaultSort?: TableSortState | null;
  defaultFilters?: Record<string, string>;
}

const STORAGE_PREFIX = 'table-layouts';

const buildStorageKey = (tableKey: string, userId?: string | null) =>
  `${STORAGE_PREFIX}:${tableKey}:user:${userId ?? 'guest'}`;

const createLayoutId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `layout-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const encodeLayoutState = (state: TableLayoutState) =>
  encodeURIComponent(JSON.stringify(state));

export const decodeLayoutState = (encoded: string): TableLayoutState | null => {
  try {
    return JSON.parse(decodeURIComponent(encoded)) as TableLayoutState;
  } catch (error) {
    console.error('Failed to decode layout state', error);
    return null;
  }
};

const normalizeLayout = (
  layout: TableLayoutState,
  columnIds: string[],
  defaultSort?: TableSortState | null,
  defaultFilters?: Record<string, string>,
): TableLayoutState => {
  const uniqueOrder = layout.columnOrder.filter((id, index, arr) => arr.indexOf(id) === index);
  const filteredOrder = uniqueOrder.filter((id) => columnIds.includes(id));
  const mergedOrder = [...filteredOrder, ...columnIds.filter((id) => !filteredOrder.includes(id))];

  const hiddenColumns = (layout.hiddenColumns ?? []).filter((id) => columnIds.includes(id));

  const sort = layout.sort;
  const isSortableColumn = sort && columnIds.includes(sort.columnId);

  const filters = {
    ...(defaultFilters ?? {}),
    ...(layout.filters ?? {}),
  } as Record<string, string>;

  return {
    columnOrder: mergedOrder,
    hiddenColumns,
    sort: isSortableColumn ? sort : defaultSort,
    filters,
  };
};

export const useTableLayout = ({
  tableKey,
  columnIds,
  userId,
  defaultSort,
  defaultFilters,
}: UseTableLayoutOptions) => {
  const storageKey = useMemo(() => buildStorageKey(tableKey, userId), [tableKey, userId]);

  const defaultState: TableLayoutState = useMemo(
    () => ({
      columnOrder: columnIds,
      hiddenColumns: [],
      sort: defaultSort ?? undefined,
      filters: defaultFilters ?? {},
    }),
    [columnIds, defaultFilters, defaultSort],
  );

  const [persistedState, setPersistedState] = useState<PersistedLayoutState>(() => {
    const cached = safeLocalStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as PersistedLayoutState;
        return {
          ...parsed,
          preferences: normalizeLayout(
            parsed.preferences ?? defaultState,
            columnIds,
            defaultSort ?? undefined,
            defaultFilters ?? {},
          ),
          saved: (parsed.saved ?? []).map((layout) => ({
            ...layout,
            state: normalizeLayout(layout.state, columnIds, defaultSort ?? undefined, defaultFilters ?? {}),
          })),
        };
      } catch (error) {
        console.warn('Unable to parse saved layout preferences', error);
      }
    }

    return { preferences: defaultState, saved: [] };
  });

  useEffect(() => {
    const cached = safeLocalStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as PersistedLayoutState;
        setPersistedState({
          ...parsed,
          preferences: normalizeLayout(
            parsed.preferences ?? defaultState,
            columnIds,
            defaultSort ?? undefined,
            defaultFilters ?? {},
          ),
          saved: (parsed.saved ?? []).map((layout) => ({
            ...layout,
            state: normalizeLayout(layout.state, columnIds, defaultSort ?? undefined, defaultFilters ?? {}),
          })),
        });
        return;
      } catch (error) {
        console.warn('Unable to parse saved layout preferences', error);
      }
    }

    setPersistedState({ preferences: defaultState, saved: [] });
  }, [columnIds, defaultFilters, defaultSort, defaultState, storageKey]);

  const preferences = persistedState.preferences;

  const persist = useCallback(
    (next: PersistedLayoutState) => {
      setPersistedState(next);
      safeLocalStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  const visibleColumnOrder = preferences.columnOrder.filter(
    (id) => !preferences.hiddenColumns.includes(id) && columnIds.includes(id),
  );

  const toggleColumn = useCallback(
    (columnId: string) => {
      if (!columnIds.includes(columnId)) return;

      setPersistedState((prev) => {
        const hidden = prev.preferences.hiddenColumns.includes(columnId)
          ? prev.preferences.hiddenColumns.filter((id) => id !== columnId)
          : [...prev.preferences.hiddenColumns, columnId];

        const visibleCount = columnIds.length - hidden.length;
        if (visibleCount === 0) {
          return prev;
        }

        const nextState: PersistedLayoutState = {
          ...prev,
          preferences: {
            ...prev.preferences,
            hiddenColumns: hidden,
          },
          activeLayoutId: undefined,
        };

        safeLocalStorage.setItem(storageKey, JSON.stringify(nextState));
        return nextState;
      });
    },
    [columnIds, storageKey],
  );

  const moveColumn = useCallback(
    (columnId: string, direction: 'up' | 'down') => {
      if (!columnIds.includes(columnId)) return;

      setPersistedState((prev) => {
        const currentOrder = prev.preferences.columnOrder;
        const index = currentOrder.indexOf(columnId);
        if (index === -1) return prev;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= currentOrder.length) return prev;

        const nextOrder = [...currentOrder];
        nextOrder.splice(index, 1);
        nextOrder.splice(targetIndex, 0, columnId);

        const nextState: PersistedLayoutState = {
          ...prev,
          preferences: {
            ...prev.preferences,
            columnOrder: nextOrder,
          },
          activeLayoutId: undefined,
        };

        safeLocalStorage.setItem(storageKey, JSON.stringify(nextState));
        return nextState;
      });
    },
    [columnIds, storageKey],
  );

  const setSort = useCallback(
    (sort: TableSortState | null) => {
      setPersistedState((prev) => {
        const nextState: PersistedLayoutState = {
          ...prev,
          preferences: {
            ...prev.preferences,
            sort: sort ?? undefined,
          },
          activeLayoutId: undefined,
        };

        safeLocalStorage.setItem(storageKey, JSON.stringify(nextState));
        return nextState;
      });
    },
    [storageKey],
  );

  const updateFilters = useCallback(
    (filters: Record<string, string>) => {
      setPersistedState((prev) => {
        const nextState: PersistedLayoutState = {
          ...prev,
          preferences: {
            ...prev.preferences,
            filters: filters ?? {},
          },
        };

        safeLocalStorage.setItem(storageKey, JSON.stringify(nextState));
        return nextState;
      });
    },
    [storageKey],
  );

  const resetLayout = useCallback(() => {
    const next = { preferences: defaultState, saved: persistedState.saved } as PersistedLayoutState;
    persist(next);
  }, [defaultState, persist, persistedState.saved]);

  const saveLayout = useCallback(
    (name: string, filters?: Record<string, string>) => {
      const layoutState: TableLayoutState = normalizeLayout(
        {
          ...preferences,
          filters: filters ?? preferences.filters ?? {},
        },
        columnIds,
        defaultSort ?? undefined,
        defaultFilters ?? {},
      );

      const layout: SavedTableLayout = {
        id: createLayoutId(),
        name: name.trim() || 'My layout',
        state: layoutState,
        updatedAt: new Date().toISOString(),
      };

      const next = {
        ...persistedState,
        saved: [...persistedState.saved, layout],
        preferences: layoutState,
        activeLayoutId: layout.id,
      } satisfies PersistedLayoutState;

      persist(next);
      return layout;
    },
    [columnIds, defaultFilters, defaultSort, persist, persistedState, preferences],
  );

  const deleteLayout = useCallback(
    (layoutId: string) => {
      const next = {
        ...persistedState,
        saved: persistedState.saved.filter((layout) => layout.id !== layoutId),
        activeLayoutId: persistedState.activeLayoutId === layoutId ? undefined : persistedState.activeLayoutId,
      } satisfies PersistedLayoutState;

      persist(next);
    },
    [persist, persistedState],
  );

  const applyLayout = useCallback(
    (layout: SavedTableLayout | TableLayoutState | string) => {
      let nextState: TableLayoutState | null = null;

      if (typeof layout === 'string') {
        const match = persistedState.saved.find((item) => item.id === layout);
        nextState = match?.state ?? null;
      } else {
        nextState = 'state' in layout ? layout.state : layout;
      }

      if (!nextState) return null;

      const normalized = normalizeLayout(nextState, columnIds, defaultSort ?? undefined, defaultFilters ?? {});
      const next = {
        ...persistedState,
        preferences: normalized,
        activeLayoutId: typeof layout === 'string' ? layout : undefined,
      } satisfies PersistedLayoutState;

      persist(next);
      return normalized;
    },
    [columnIds, defaultFilters, defaultSort, persist, persistedState],
  );

  const getShareableLink = useCallback(
    (layoutState?: TableLayoutState) => {
      if (typeof window === 'undefined') return '';
      const stateToShare = normalizeLayout(
        layoutState ?? preferences,
        columnIds,
        defaultSort ?? undefined,
        defaultFilters ?? {},
      );
      const encoded = encodeLayoutState(stateToShare);
      const params = new URLSearchParams(window.location.search);
      params.set('layout', encoded);
      return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    },
    [columnIds, defaultFilters, defaultSort, preferences],
  );

  const applySharedLayout = useCallback(
    (encoded: string) => {
      const decoded = decodeLayoutState(encoded);
      if (!decoded) return null;
      return applyLayout(decoded);
    },
    [applyLayout],
  );

  return {
    columnOrder: preferences.columnOrder,
    visibleColumnOrder,
    hiddenColumns: preferences.hiddenColumns,
    sort: preferences.sort ?? null,
    filters: preferences.filters ?? {},
    savedLayouts: persistedState.saved,
    activeLayoutId: persistedState.activeLayoutId,
    toggleColumn,
    moveColumn,
    setSort,
    updateFilters,
    resetLayout,
    saveLayout,
    deleteLayout,
    applyLayout,
    getShareableLink,
    applySharedLayout,
    preferences,
  };
};

export type UseTableLayoutReturn = ReturnType<typeof useTableLayout>;
