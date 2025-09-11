import http from '@/lib/http';
import type {
  DashboardSummary,
  StatusCountResponse,
  UpcomingMaintenanceResponse,
  CriticalAlertResponse,
  LowStockPartResponse,
} from '@/types';

export const fetchSummary = (params?: Record<string, unknown>) =>
  http.get<DashboardSummary>('/summary', { params }).then((res) => res.data);

export const fetchAssetSummary = (params?: Record<string, unknown>) =>
  http.get<StatusCountResponse[]>('/summary/assets', { params }).then((res) => res.data);

export const fetchWorkOrderSummary = (params?: Record<string, unknown>) =>
  http
    .get<StatusCountResponse[]>('/summary/workorders', { params })
    .then((res) => res.data);

export const fetchUpcomingMaintenance = (params?: Record<string, unknown>) =>
  http
    .get<UpcomingMaintenanceResponse[]>('/summary/upcoming-maintenance', { params })
    .then((res) => res.data);

export const fetchCriticalAlerts = (params?: Record<string, unknown>) =>
  http
    .get<CriticalAlertResponse[]>('/summary/critical-alerts', { params })
    .then((res) => res.data);

export const fetchLowStock = (params?: Record<string, unknown>) =>
  http
    .get<LowStockPartResponse[]>('/summary/low-stock', { params })
    .then((res) => res.data);

