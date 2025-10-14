import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useQueryState<T extends Record<string, string | number | undefined>>(defaults: T) {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => {
    const out: Record<string, string | number | undefined> = { ...defaults };
    Object.keys(defaults).forEach((key) => {
      const value = params.get(key);
      if (value !== null) {
        const numeric = Number(value);
        out[key] = Number.isNaN(numeric) ? value : numeric;
      }
    });
    return out as T;
  }, [defaults, params]);

  const update = (patch: Partial<T>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    setParams(next, { replace: true });
  };

  return [state, update] as const;
}
