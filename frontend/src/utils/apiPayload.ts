export type ApiPayload<T> =
  | T
  | {
      data?: T;
      result?: T;
      payload?: T;
      success?: boolean;
      error?: { code?: number; message?: string; details?: unknown };
    };

export const unwrapApiPayload = <T>(payload: ApiPayload<T>): T => {
  if (payload && typeof payload === 'object') {
    const record = payload as { data?: T; result?: T; payload?: T };
    if (record.data !== undefined) return record.data;
    if (record.result !== undefined) return record.result;
    if (record.payload !== undefined) return record.payload;
  }

  return payload as T;
};
