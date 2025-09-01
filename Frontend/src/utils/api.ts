import axios from "axios";

import type {
  AuthUser,
  DashboardSummary,
  Line,
  Station,
  Department,
  NotificationType,
  Member,
  Message,
  Channel,
  StatusCountResponse,
  UpcomingMaintenanceResponse,
  CriticalAlertResponse,
  LowStockPartResponse,
} from "../types";
import { config } from "./env";

// Resolve base URL from config first, then Vite env.
// Fail fast if not provided.
const baseURL = config.apiUrl ?? import.meta.env.VITE_API_URL;
if (!baseURL) {
  throw new Error("API base URL is not set. Define config.apiUrl or VITE_API_URL.");
}

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const { token, tenantId } = JSON.parse(userStr) as AuthUser;
      cfg.headers = cfg.headers ?? {};
      if (token) (cfg.headers as any).Authorization = `Bearer ${token}`;
      if (tenantId) (cfg.headers as any)["x-tenant-id"] = tenantId;
    } catch {
      // ignore parse errors
    }
  }
  const siteStr = localStorage.getItem('site-storage');
  if (siteStr) {
    try {
      const { state } = JSON.parse(siteStr);
      const siteId = state?.siteId;
      if (siteId) {
        cfg.headers = cfg.headers ?? {};
        (cfg.headers as any)['x-site-id'] = siteId;
      }
    } catch {
      // ignore
    }
  }
  return cfg;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/auth/logout" &&
      error.config?.url !== "/auth/login"
    ) {
      try {
        await api.post("/auth/logout");
      } catch {
        // ignore
      } finally {
        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
          localStorage.removeItem("auth-storage");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

// ----- Summary endpoints -----
export const fetchSummary = (params?: Record<string, unknown>) =>
  api.get<DashboardSummary>("/summary", { params }).then((res) => res.data);

export const fetchAssetSummary = (params?: Record<string, unknown>) =>
  api.get<StatusCountResponse[]>("/summary/assets", { params }).then((res) => res.data);

export const fetchWorkOrderSummary = (params?: Record<string, unknown>) =>
  api.get<StatusCountResponse[]>("/summary/workorders", { params }).then((res) => res.data);

export const fetchUpcomingMaintenance = (params?: Record<string, unknown>) =>
  api
    .get<UpcomingMaintenanceResponse[]>("/summary/upcoming-maintenance", { params })
    .then((res) => res.data);

export const fetchCriticalAlerts = (params?: Record<string, unknown>) =>
  api
    .get<CriticalAlertResponse[]>("/summary/critical-alerts", { params })
    .then((res) => res.data);

export const fetchLowStock = (params?: Record<string, unknown>) =>
  api.get<LowStockPartResponse[]>("/summary/low-stock", { params }).then((res) => res.data);

// ----- Notifications -----
export const fetchNotifications = (params?: Record<string, unknown>) =>
  api.get<NotificationType[]>("/notifications", { params }).then((res) => res.data);

export const updateNotification = (id: string, data: Partial<NotificationType>) =>
  api.put<NotificationType>(`/notifications/${id}`, data).then((res) => res.data);

export const getNotifications = () =>
  api.get<NotificationType[]>("/notifications").then((res) => res.data);

export const createNotification = (payload: Partial<NotificationType>) =>
  api.post<NotificationType>("/notifications", payload).then((res) => res.data);

export const markNotificationRead = (id: string) =>
  api.patch<NotificationType>(`/notifications/${id}/read`).then((res) => res.data);

// ----- Org data -----
export const fetchDepartments = () =>
  api.get<Department[]>("/departments").then((res) =>
    (res.data as unknown[]).map((d: any) => ({
      id: (d as any)._id ?? (d as any).id,
      name: (d as any).name,
    })),
  );

export const getLines = () => api.get<Line[]>("/lines").then((res) => res.data);

export const getStationsByLine = (lineId: string) =>
  api.get<Station[]>(`/stations/line/${lineId}`).then((res) => res.data);

// ----- Search -----
export const searchAssets = (q: string) =>
  api.get("/assets/search", { params: { q } }).then((res) => res.data);

export const searchParts = (q: string) =>
  api.get("/inventory/search", { params: { q } }).then((res) => res.data);

// ----- Channels & Messages -----
export const listChannels = (params?: Record<string, unknown>) =>
  api.get<Channel[]>("/channels", { params }).then((res) => res.data);

export const createChannel = (payload: Partial<Channel>) =>
  api.post<Channel>("/channels", payload).then((res) => res.data);

export const togglePin = (id: string) =>
  api.post<Channel>(`/channels/${id}/pin`).then((res) => res.data);

export const toggleMute = (id: string) =>
  api.post<Channel>(`/channels/${id}/mute`).then((res) => res.data);

export const getChannelMembers = (channelId: string) =>
  api.get<Member[]>(`/channels/${channelId}/members`).then((res) => res.data);

export const addMembers = (channelId: string, members: string[]) =>
  api.post<Channel>(`/channels/${channelId}/members`, { members }).then((res) => res.data);

export const removeMember = (channelId: string, memberId: string) =>
  api.delete<Channel>(`/channels/${channelId}/members/${memberId}`).then((res) => res.data);

// Messages
export const listMessages = (channelId: string, params?: Record<string, unknown>) =>
  api.get<Message[]>(`/channels/${channelId}/messages`, { params }).then((res) => res.data);

export const sendMessage = (channelId: string, payload: Partial<Message>) =>
  api.post<Message>(`/channels/${channelId}/messages`, payload).then((res) => res.data);

export const reactMessage = (channelId: string, messageId: string, reaction: { emoji: string }) =>
  api
    .post<Message>(`/channels/${channelId}/messages/${messageId}/reactions`, reaction)
    .then((res) => res.data);

export const markMessageRead = (channelId: string, messageId: string) =>
  api.post<Message>(`/channels/${channelId}/messages/${messageId}/read`).then((res) => res.data);

export const searchMessages = (channelId: string, q: string) =>
  api
    .get<Message[]>(`/channels/${channelId}/messages/search`, { params: { q } })
    .then((res) => res.data);

// ----- Purchasing -----
export const createPurchaseOrder = (payload: any) =>
  api.post('/purchase-orders', payload).then((res) => res.data);

export const createGoodsReceipt = (payload: any) =>
  api.post('/goods-receipts', payload).then((res) => res.data);

export default api;
