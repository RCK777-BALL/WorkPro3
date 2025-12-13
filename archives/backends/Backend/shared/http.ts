// shared/http.ts

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T | undefined;
  error?: string | string[] | null | undefined;
  status?: number | undefined;
};
