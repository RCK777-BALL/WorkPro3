import axios, { AxiosHeaders, type AxiosError, type AxiosInstance } from 'axios';

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

const STORAGE_KEY = 'workpro.tokens';

export const getAuthTokens = (): AuthTokens | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
};

export const setAuthTokens = (tokens: AuthTokens | null) => {
  if (!tokens) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
};

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

let refreshPromise: Promise<AuthTokens | null> | null = null;

const refreshTokens = async (): Promise<AuthTokens | null> => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/auth/refresh')
      .then((response) => response.data as AuthTokens)
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

apiClient.interceptors.request.use((config) => {
  const tokens = getAuthTokens();
  if (tokens?.accessToken) {
    config.headers = config.headers ?? new AxiosHeaders();
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const tokens = getAuthTokens();
    if (!tokens?.refreshToken) {
      return Promise.reject(error);
    }

    const refreshed = await refreshTokens();
    if (!refreshed?.accessToken) {
      setAuthTokens(null);
      return Promise.reject(error);
    }

    setAuthTokens({ ...tokens, ...refreshed });
    const original = error.config;
    if (original) {
      original.headers = original.headers ?? new AxiosHeaders();
      original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
      return apiClient.request(original);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
