import { expectTypeOf, test } from 'vitest';
import { fetchJson } from './api';
import type { ApiResult } from '@shared/http';

test('fetchJson returns ApiResult', () => {
  expectTypeOf(fetchJson<{ ok: boolean }>('/test')).toEqualTypeOf<Promise<ApiResult<{ ok: boolean }>>>();
  // @ts-expect-error fetchJson should not return raw data
  expectTypeOf(fetchJson<{ ok: boolean }>('/test')).toEqualTypeOf<Promise<{ ok: boolean }>>();
});
