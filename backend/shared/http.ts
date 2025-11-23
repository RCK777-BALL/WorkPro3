// shared/http.ts

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string | string[] | null;
  status?: number;
};
