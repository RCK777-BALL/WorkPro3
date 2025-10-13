type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function req<T>(
  path: string,
  method: HttpMethod = 'GET',
  body?: unknown,
  headers: Record<string,string> = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // <-- allow cookie auth
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse best-effort error to surface the backend message
  let data: any = null;
  const text = await res.text().catch(() => '');
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }

  if (!res.ok) {
    const msg = data?.message || `${res.status} ${res.statusText}`;
    const err = new Error(msg) as Error & { status?: number; data?: any };
    err.status = res.status; err.data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  login(payload: { email: string; password: string; remember?: boolean }) {
    return req<{ user: any }>('/auth/login', 'POST', payload);
  },
  me() {
    return req<{ user: any }>('/auth/me', 'GET');
  },
  logout() {
    return req('/auth/logout', 'POST', {});
  }
};
