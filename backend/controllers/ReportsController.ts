/*
 * SPDX-License-Identifier: MIT
 */

import type { AuthedRequestHandler } from '../types/http';
import reportsController from './ReportsController.js';

const getAnalyticsReport = reportsController.getAnalyticsReport as AuthedRequestHandler;
const downloadReport = reportsController.downloadReport as AuthedRequestHandler;
const getTrendData = reportsController.getTrendData as AuthedRequestHandler;
const exportTrendData = reportsController.exportTrendData as AuthedRequestHandler;
const getCostMetrics = reportsController.getCostMetrics as AuthedRequestHandler;
const getDowntimeReport = reportsController.getDowntimeReport as AuthedRequestHandler;
const getPmCompliance = reportsController.getPmCompliance as AuthedRequestHandler;
const getCostByAsset = reportsController.getCostByAsset as AuthedRequestHandler;

export {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
  getCostMetrics,
  getDowntimeReport,
  getPmCompliance,
  getCostByAsset,
};

export default {
  getAnalyticsReport,
  downloadReport,
  getTrendData,
  exportTrendData,
  getCostMetrics,
  getDowntimeReport,
  getPmCompliance,
  getCostByAsset,
};
