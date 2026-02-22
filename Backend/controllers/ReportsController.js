"use strict";
/*
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReportSchedule = exports.getReportSchedule = exports.getAiSummary = exports.getLongTermTrends = exports.getCostByAsset = exports.getPmCompliance = exports.getDowntimeReport = exports.getCostMetrics = exports.exportTrendData = exports.getTrendData = exports.downloadReport = exports.getAnalyticsReport = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const json2csv_1 = require("json2csv");
const stream_1 = require("stream");
const WorkOrder_1 = __importDefault(require("../models/WorkOrder"));
const Asset_1 = __importDefault(require("../models/Asset"));
const WorkHistory_1 = __importDefault(require("../models/WorkHistory"));
const User_1 = __importDefault(require("../models/User"));
const TimeSheet_1 = __importDefault(require("../models/TimeSheet"));
const WorkOrderChecklistLog_1 = __importDefault(require("../models/WorkOrderChecklistLog"));
const env_1 = require("../config/env");
const utils_1 = require("../utils");
const HOURS_PER_MONTH = 24 * 30;
const resolveTenantId = (req) => {
    const headerTenant = req.headers?.['x-tenant-id'];
    const headerValue = Array.isArray(headerTenant) ? headerTenant[0] : headerTenant;
    const resolved = req.tenantId ||
        (typeof req.user?.tenantId === 'string' ? req.user.tenantId : undefined) ||
        headerValue;
    if (!resolved) {
        throw new Error('Tenant context is required for reports');
    }
    return resolved;
};
const calculateStats = async (tenantId, role, workOrderType) => {
    const roleFilter = role ?? 'tech';
    const baseFilter = {
        tenantId,
        ...(workOrderType ? { type: workOrderType } : {}),
    };
    const totalWorkOrders = await WorkOrder_1.default.countDocuments(baseFilter);
    const completedOrders = await WorkOrder_1.default.countDocuments({
        ...baseFilter,
        status: 'completed',
    });
    const workOrderCompletionRate = totalWorkOrders
        ? (completedOrders / totalWorkOrders) * 100
        : 0;
    const complianceType = workOrderType ?? 'preventive';
    const pmBase = {
        tenantId,
        type: complianceType,
    };
    const pmTotal = await WorkOrder_1.default.countDocuments(pmBase);
    const pmCompleted = await WorkOrder_1.default.countDocuments({
        ...pmBase,
        status: 'completed',
    });
    const maintenanceCompliance = pmTotal ? (pmCompleted / pmTotal) * 100 : 0;
    const completed = await WorkOrder_1.default.find({ completedAt: { $exists: true }, ...baseFilter }, {
        createdAt: 1,
        completedAt: 1,
    });
    const responseDurations = completed
        .map((order) => {
        const createdAt = order.createdAt instanceof Date ? order.createdAt : undefined;
        const completedAt = order.completedAt instanceof Date ? order.completedAt : undefined;
        if (!createdAt || !completedAt)
            return undefined;
        return (completedAt.getTime() - createdAt.getTime()) / 36e5;
    })
        .filter((value) => value !== undefined);
    const averageResponseTime = responseDurations.length
        ? responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length
        : 0;
    const totalAssets = await Asset_1.default.countDocuments({ tenantId });
    const downAssets = await Asset_1.default.countDocuments({ status: { $ne: 'Active' }, tenantId });
    const assetUptime = totalAssets ? ((totalAssets - downAssets) / totalAssets) * 100 : 0;
    const assetDowntime = totalAssets ? (downAssets / totalAssets) * 100 : 0;
    const laborAgg = await WorkHistory_1.default.aggregate([
        { $match: { tenantId } },
        { $group: { _id: null, hours: { $sum: '$timeSpentHours' } } },
    ]);
    const totalLaborHours = laborAgg[0]?.hours ?? 0;
    const userCount = await User_1.default.countDocuments({ tenantId, roles: roleFilter });
    const availableHours = userCount * 160;
    const laborUtilization = availableHours ? (totalLaborHours / availableHours) * 100 : 0;
    const costPerWorkOrder = totalWorkOrders ? (totalLaborHours * env_1.LABOR_RATE) / totalWorkOrders : 0;
    const topAssets = await WorkHistory_1.default.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$asset', downtime: { $sum: '$timeSpentHours' }, issues: { $sum: 1 } } },
        { $sort: { downtime: -1 } },
        { $limit: 3 },
        { $lookup: { from: 'assets', localField: '_id', foreignField: '_id', as: 'asset' } },
        { $unwind: '$asset' },
        {
            $project: {
                _id: 0,
                name: '$asset.name',
                downtime: 1,
                issues: 1,
                cost: { $multiply: ['$downtime', env_1.LABOR_RATE] },
            },
        },
    ]);
    return {
        workOrderCompletionRate,
        averageResponseTime,
        maintenanceCompliance,
        assetUptime,
        costPerWorkOrder,
        laborUtilization,
        assetDowntime,
        topAssets,
    };
};
const getAnalyticsReport = async (req, res, next) => {
    try {
        const role = typeof req.query.role === 'string' ? req.query.role : undefined;
        const tenantId = resolveTenantId(req);
        const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
        const stats = await calculateStats(tenantId, role, typeFilter);
        (0, utils_1.sendResponse)(res, stats);
    }
    catch (err) {
        next(err);
    }
};
exports.getAnalyticsReport = getAnalyticsReport;
const drawTrendChart = (doc, { x, y, width, height, labels, series, }) => {
    const values = series.flatMap((item) => item.values);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    doc.save();
    doc.strokeColor('#d4d4d8').rect(x, y, width, height).stroke();
    const steps = 4;
    for (let i = 1; i < steps; i += 1) {
        const yPos = y + (i / steps) * height;
        doc.moveTo(x, yPos).lineTo(x + width, yPos).stroke('#f1f5f9');
    }
    series.forEach((dataset, datasetIndex) => {
        if (dataset.values.length === 0)
            return;
        doc.save();
        doc.lineWidth(1.5).strokeColor(dataset.color);
        dataset.values.forEach((value, index) => {
            const xPos = labels.length <= 1
                ? x
                : x + (index / Math.max(labels.length - 1, 1)) * width;
            const normalized = (value - min) / range;
            const yPos = y + height - normalized * height;
            if (index === 0) {
                doc.moveTo(xPos, yPos);
            }
            else {
                doc.lineTo(xPos, yPos);
            }
        });
        doc.stroke();
        doc.restore();
        doc
            .fillColor(dataset.color)
            .rect(x + datasetIndex * 90, y - 14, 8, 8)
            .fill();
        doc
            .fillColor('#0f172a')
            .fontSize(8)
            .text(dataset.label, x + datasetIndex * 90 + 10, y - 16, { width: 80 });
    });
    doc.restore();
};
const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
});
const downloadReport = async (req, res, next) => {
    try {
        const format = String(req.query.format ?? 'pdf').toLowerCase();
        const role = typeof req.query.role === 'string' ? req.query.role : undefined;
        const tenantId = resolveTenantId(req);
        const typeFilter = typeof req.query.type === 'string' ? req.query.type : undefined;
        const [stats, trends] = await Promise.all([
            calculateStats(tenantId, role, typeFilter),
            aggregateLongTermTrends(tenantId, 12),
        ]);
        const aiSummary = generateAiSummary(trends);
        if (format === 'csv') {
            const transform = new json2csv_1.Transform();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
            stream_1.Readable.from([stats]).pipe(transform).pipe(res);
            return;
        }
        const doc = new pdfkit_1.default();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
        doc.pipe(res);
        doc.fontSize(18).text('Analytics Report', { align: 'center' });
        doc.moveDown();
        Object.entries(stats).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                doc.fontSize(12).text(`${key}:`);
                value.forEach((item) => doc.fontSize(10).text(`• ${JSON.stringify(item)}`));
            }
            else {
                doc.fontSize(12).text(`${key}: ${value}`);
            }
        });
        doc.moveDown();
        doc.fontSize(16).text('AI Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(aiSummary.summary);
        if (aiSummary.highlights.length > 0) {
            doc.moveDown(0.5);
            aiSummary.highlights.forEach((highlight) => {
                doc.text(`• ${highlight}`);
            });
        }
        if (trends.length > 0) {
            doc.addPage();
            doc.fontSize(16).text('Long-term KPI Trends');
            doc.moveDown();
            const labels = trends.map((point) => point.period);
            drawTrendChart(doc, {
                x: 50,
                y: 120,
                width: 500,
                height: 220,
                labels,
                series: [
                    { label: 'Downtime (hrs)', color: '#ef4444', values: trends.map((p) => p.downtimeHours) },
                    { label: 'Compliance (%)', color: '#2563eb', values: trends.map((p) => p.compliance) },
                    { label: 'Reliability (%)', color: '#16a34a', values: trends.map((p) => p.reliability) },
                ],
            });
            doc.moveDown(14);
            const latestCost = trends.length ? trends[trends.length - 1].maintenanceCost : 0;
            doc
                .fontSize(12)
                .text(`Latest maintenance cost: ${currencyFormatter.format(latestCost)}`, { align: 'left' });
        }
        doc.end();
    }
    catch (err) {
        next(err);
    }
};
exports.downloadReport = downloadReport;
const aggregateTrends = async (tenantId) => {
    const results = await WorkHistory_1.default.aggregate([
        { $match: { completedAt: { $exists: true }, tenantId } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', env_1.LABOR_RATE] } },
                assetDowntime: { $sum: '$timeSpentHours' },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return results.map((result) => ({
        period: result._id,
        maintenanceCost: result.maintenanceCost,
        assetDowntime: result.assetDowntime,
    }));
};
const aggregateChecklistCompliance = async (tenantId) => {
    const results = await WorkOrderChecklistLog_1.default.aggregate([
        { $match: { tenantId } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$recordedAt' } },
                totalChecks: { $sum: 1 },
                passedChecks: { $sum: { $cond: ['$passed', 1, 0] } },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return results.map((result) => {
        const passRate = result.totalChecks ? Number(((result.passedChecks / result.totalChecks) * 100).toFixed(1)) : 0;
        const complianceStatus = result.totalChecks
            ? passRate >= 90
                ? 'compliant'
                : passRate >= 70
                    ? 'at_risk'
                    : 'failing'
            : 'unknown';
        return {
            period: result._id,
            totalChecks: result.totalChecks,
            passedChecks: result.passedChecks,
            passRate,
            complianceStatus,
        };
    });
};
const mergeTrendCompliance = (trends, compliance) => {
    const periods = new Set([...trends.map((point) => point.period), ...compliance.map((point) => point.period)]);
    return Array.from(periods)
        .sort()
        .map((period) => {
        const trend = trends.find((point) => point.period === period);
        const status = compliance.find((point) => point.period === period);
        return {
            period,
            maintenanceCost: trend?.maintenanceCost ?? 0,
            assetDowntime: trend?.assetDowntime ?? 0,
            checklistChecks: status?.totalChecks ?? 0,
            checklistPassRate: status?.passRate ?? 0,
            complianceStatus: status?.complianceStatus ?? 'unknown',
        };
    });
};
const getTrendData = async (req, res, next) => {
    try {
        const tenantId = resolveTenantId(req);
        const [trends, compliance] = await Promise.all([
            aggregateTrends(tenantId),
            aggregateChecklistCompliance(tenantId),
        ]);
        (0, utils_1.sendResponse)(res, mergeTrendCompliance(trends, compliance));
    }
    catch (err) {
        next(err);
    }
};
exports.getTrendData = getTrendData;
const exportTrendData = async (req, res, next) => {
    try {
        const format = String(req.query.format ?? 'json').toLowerCase();
        const tenantId = resolveTenantId(req);
        const [trends, compliance] = await Promise.all([
            aggregateTrends(tenantId),
            aggregateChecklistCompliance(tenantId),
        ]);
        const data = mergeTrendCompliance(trends, compliance);
        if (format === 'csv') {
            const parser = new json2csv_1.Parser();
            const csv = parser.parse(data);
            res.setHeader('Content-Type', 'text/csv');
            res.attachment('trends.csv');
            (0, utils_1.sendResponse)(res, csv);
            return;
        }
        (0, utils_1.sendResponse)(res, data);
    }
    catch (err) {
        next(err);
    }
};
exports.exportTrendData = exportTrendData;
const reliabilityScore = (downtimeHours) => {
    const clamped = Math.min(Math.max(downtimeHours, 0), HOURS_PER_MONTH);
    const ratio = 1 - clamped / HOURS_PER_MONTH;
    return Number((ratio * 100).toFixed(1));
};
const aggregateLongTermTrends = async (tenantId, months = 12) => {
    const safeMonths = Number.isFinite(months)
        ? Math.min(Math.max(Math.trunc(months), 1), 36)
        : 12;
    const [downtime, compliance, costs, assetTrends] = await Promise.all([
        aggregateDowntime(tenantId),
        aggregatePmCompliance(tenantId),
        aggregateCosts(tenantId),
        aggregateTrends(tenantId),
    ]);
    const map = new Map();
    const ensureEntry = (period) => {
        const existing = map.get(period);
        if (existing)
            return existing;
        const entry = {
            period,
            downtimeHours: 0,
            compliance: 0,
            maintenanceCost: 0,
            reliability: 100,
        };
        map.set(period, entry);
        return entry;
    };
    downtime.forEach((point) => {
        ensureEntry(point.period).downtimeHours = Number(point.downtime.toFixed(2));
    });
    compliance.forEach((point) => {
        ensureEntry(point.period).compliance = Number(point.compliance.toFixed(1));
    });
    costs.forEach((point) => {
        ensureEntry(point.period).maintenanceCost = Number(point.totalCost.toFixed(2));
    });
    assetTrends.forEach((point) => {
        const entry = ensureEntry(point.period);
        const downtimeHours = point.assetDowntime ?? entry.downtimeHours;
        entry.reliability = reliabilityScore(downtimeHours);
        if (!entry.maintenanceCost) {
            entry.maintenanceCost = Number(point.maintenanceCost.toFixed(2));
        }
        if (!entry.downtimeHours) {
            entry.downtimeHours = Number(point.assetDowntime.toFixed(2));
        }
    });
    return Array.from(map.values())
        .sort((a, b) => (a.period < b.period ? -1 : 1))
        .slice(-safeMonths);
};
const describeChange = (current, previous, suffix = '') => {
    if (previous == null || Number.isNaN(previous)) {
        return { direction: 'flat', delta: 0, label: `at ${current.toFixed(1)}${suffix}` };
    }
    const delta = current - previous;
    if (Math.abs(delta) < 0.1) {
        return { direction: 'flat', delta: 0, label: 'holding steady' };
    }
    const direction = delta > 0 ? 'up' : 'down';
    return {
        direction,
        delta,
        label: `${direction} ${Math.abs(delta).toFixed(1)}${suffix}`,
    };
};
const generateAiSummary = (trends) => {
    if (trends.length === 0) {
        return {
            summary: 'Insufficient data to summarize long-term performance trends.',
            highlights: [],
            latestPeriod: null,
            confidence: 0.4,
        };
    }
    const latest = trends[trends.length - 1];
    const previous = trends.length > 1 ? trends[trends.length - 2] : undefined;
    const downtimeChange = describeChange(latest.downtimeHours, previous?.downtimeHours, 'h');
    const complianceChange = describeChange(latest.compliance, previous?.compliance, '%');
    const reliabilityChange = describeChange(latest.reliability, previous?.reliability, '%');
    const costChange = describeChange(latest.maintenanceCost, previous?.maintenanceCost, ' USD');
    const summary = `AI insight (${latest.period}): downtime averaged ${latest.downtimeHours.toFixed(1)}h (${downtimeChange.label}), compliance reached ${latest.compliance.toFixed(1)}% (${complianceChange.label}), reliability held at ${latest.reliability.toFixed(1)}% (${reliabilityChange.label}), and spend was ${currencyFormatter.format(latest.maintenanceCost)} (${costChange.label}).`;
    return {
        summary,
        highlights: [
            `Downtime ${downtimeChange.direction === 'down' ? 'improved' : downtimeChange.direction === 'up' ? 'worsened' : 'held steady'} by ${Math.abs(downtimeChange.delta).toFixed(1)}h`,
            `Compliance ${complianceChange.direction === 'up' ? 'gained' : complianceChange.direction === 'down' ? 'slipped' : 'held'} ${Math.abs(complianceChange.delta).toFixed(1)} pts`,
            `Reliability ${reliabilityChange.direction === 'up' ? 'strengthened' : reliabilityChange.direction === 'down' ? 'softened' : 'remained stable'}`,
        ],
        latestPeriod: latest.period,
        confidence: trends.length >= 6 ? 0.87 : 0.72,
    };
};
const getLongTermTrends = async (req, res, next) => {
    try {
        const tenantId = resolveTenantId(req);
        const months = Number(req.query.months ?? 12);
        const data = await aggregateLongTermTrends(tenantId, months);
        (0, utils_1.sendResponse)(res, data);
    }
    catch (err) {
        next(err);
    }
};
exports.getLongTermTrends = getLongTermTrends;
const getAiSummary = async (req, res, next) => {
    try {
        const tenantId = resolveTenantId(req);
        const months = Number(req.query.months ?? 12);
        const trends = await aggregateLongTermTrends(tenantId, months);
        const payload = generateAiSummary(trends);
        (0, utils_1.sendResponse)(res, payload);
    }
    catch (err) {
        next(err);
    }
};
exports.getAiSummary = getAiSummary;
const aggregateCosts = async (tenantId) => {
    const labor = await TimeSheet_1.default.aggregate([
        { $match: { tenantId } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                hours: { $sum: '$totalHours' },
            },
        },
        {
            $project: { _id: 0, period: '$_id', laborCost: { $multiply: ['$hours', env_1.LABOR_RATE] } },
        },
    ]);
    const maintenance = await WorkHistory_1.default.aggregate([
        { $match: { tenantId } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                maintenanceCost: { $sum: { $multiply: ['$timeSpentHours', env_1.LABOR_RATE] } },
            },
        },
        { $project: { _id: 0, period: '$_id', maintenanceCost: 1 } },
    ]);
    const materials = await WorkHistory_1.default.aggregate([
        { $match: { tenantId } },
        { $unwind: '$materialsUsed' },
        {
            $lookup: {
                from: 'inventories',
                localField: 'materialsUsed',
                foreignField: '_id',
                as: 'inv',
            },
        },
        { $unwind: '$inv' },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                materialCost: { $sum: '$inv.unitCost' },
            },
        },
        { $project: { _id: 0, period: '$_id', materialCost: 1 } },
    ]);
    const map = new Map();
    const upsert = (entry) => {
        const existing = map.get(entry.period) ?? {
            period: entry.period,
            laborCost: 0,
            maintenanceCost: 0,
            materialCost: 0,
            totalCost: 0,
        };
        if (entry.laborCost !== undefined)
            existing.laborCost = entry.laborCost;
        if (entry.maintenanceCost !== undefined)
            existing.maintenanceCost = entry.maintenanceCost;
        if (entry.materialCost !== undefined)
            existing.materialCost = entry.materialCost;
        existing.totalCost =
            existing.laborCost +
                existing.maintenanceCost +
                existing.materialCost;
        map.set(entry.period, existing);
    };
    labor.forEach((item) => upsert(item));
    maintenance.forEach((item) => upsert(item));
    materials.forEach((item) => upsert(item));
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
};
const getCostMetrics = async (req, res, next) => {
    try {
        const tenantId = resolveTenantId(req);
        const data = await aggregateCosts(tenantId);
        (0, utils_1.sendResponse)(res, data);
    }
    catch (err) {
        next(err);
    }
};
exports.getCostMetrics = getCostMetrics;
const aggregateDowntime = async (tenantId) => {
    const results = await WorkHistory_1.default.aggregate([
        { $match: { tenantId } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                downtime: { $sum: '$timeSpentHours' },
            },
        },
        { $sort: { _id: 1 } },
    ]);
    return results.map((result) => ({ period: result._id, downtime: result.downtime }));
};
const getDowntimeReport = async (req, res, next) => {
    try {
        const tenantId = resolveTenantId(req);
        const data = await aggregateDowntime(tenantId);
        (0, utils_1.sendResponse)(res, data);
    }
    catch (err) {
        next(err);
    }
};
exports.getDowntimeReport = getDowntimeReport;
const aggregatePmCompliance = async (tenantId) => {
    const results = await WorkOrder_1.default.aggregate([
        { $match: { tenantId, type: 'preventive' } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$scheduledDate' } },
                total: { $sum: 1 },
                completed: {
                    $sum: {
                        $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
                    },
                },
            },
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                period: '$_id',
                compliance: {
                    $cond: [
                        { $eq: ['$total', 0] },
                        0,
                        { $multiply: [{ $divide: ['$completed', '$total'] }, 100] },
                    ],
                },
            },
        },
    ]);
    return results;
};
const getPmCompliance = async (req, res, next) => {
    try {
        const tenantId = resolveTenantId(req);
        const data = await aggregatePmCompliance(tenantId);
        (0, utils_1.sendResponse)(res, data);
    }
    catch (err) {
        next(err);
    }
};
exports.getPmCompliance = getPmCompliance;
const aggregateCostByAsset = async (tenantId) => {
    const results = await WorkHistory_1.default.aggregate([
        { $match: { tenantId } },
        {
            $group: {
                _id: '$asset',
                hours: { $sum: '$timeSpentHours' },
            },
        },
        {
            $lookup: {
                from: 'assets',
                localField: '_id',
                foreignField: '_id',
                as: 'asset',
            },
        },
        { $unwind: '$asset' },
        {
            $project: {
                _id: 0,
                asset: '$asset.name',
                cost: { $multiply: ['$hours', env_1.LABOR_RATE] },
            },
        },
        { $sort: { cost: -1 } },
    ]);
    return results;
};
const getCostByAsset = async (req, res, next) => {
    try {
        const tenantId = resolveTenantId(req);
        const data = await aggregateCostByAsset(tenantId);
        (0, utils_1.sendResponse)(res, data);
    }
    catch (err) {
        next(err);
    }
};
exports.getCostByAsset = getCostByAsset;
const scheduleStore = new Map();
const computeNextRun = (dayOfMonth, hourUtc) => {
    const [hours, minutes] = hourUtc.split(':').map((part) => Number(part));
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dayOfMonth, hours || 0, minutes || 0));
    if (next <= now) {
        next.setUTCMonth(next.getUTCMonth() + 1);
    }
    return next.toISOString();
};
const normalizeRecipients = (recipients) => {
    if (!recipients)
        return [];
    if (Array.isArray(recipients)) {
        return recipients.map((item) => String(item)).map((email) => email.trim()).filter(Boolean);
    }
    if (typeof recipients === 'string') {
        return recipients
            .split(',')
            .map((email) => email.trim())
            .filter(Boolean);
    }
    return [];
};
const resolveSchedule = (tenantId) => {
    const existing = scheduleStore.get(tenantId);
    if (existing)
        return existing;
    const schedule = {
        frequency: 'monthly',
        dayOfMonth: 1,
        hourUtc: '08:00',
        recipients: [],
        sendEmail: true,
        sendDownloadLink: false,
        format: 'pdf',
        timezone: 'UTC',
        nextRun: computeNextRun(1, '08:00'),
        updatedAt: new Date().toISOString(),
    };
    scheduleStore.set(tenantId, schedule);
    return schedule;
};
const getReportSchedule = async (req, res, next) => {
    try {
        const tenantId = String(resolveTenantId(req));
        const schedule = resolveSchedule(tenantId);
        (0, utils_1.sendResponse)(res, schedule);
    }
    catch (err) {
        next(err);
    }
};
exports.getReportSchedule = getReportSchedule;
const updateReportSchedule = async (req, res, next) => {
    try {
        const tenantId = String(resolveTenantId(req));
        const current = resolveSchedule(tenantId);
        const body = req.body;
        const payload = {
            dayOfMonth: typeof body?.dayOfMonth === 'number' ? body.dayOfMonth : current.dayOfMonth,
            hourUtc: typeof body?.hourUtc === 'string' ? body.hourUtc : current.hourUtc,
            recipients: normalizeRecipients(body?.recipients),
            sendEmail: body?.sendEmail ?? current.sendEmail,
            sendDownloadLink: body?.sendDownloadLink ?? current.sendDownloadLink,
            format: body?.format === 'csv' ? 'csv' : 'pdf',
            timezone: typeof body?.timezone === 'string' ? body.timezone : current.timezone,
        };
        const nextRun = computeNextRun(payload.dayOfMonth ?? current.dayOfMonth, payload.hourUtc ?? current.hourUtc);
        const updated = {
            frequency: 'monthly',
            dayOfMonth: payload.dayOfMonth ?? current.dayOfMonth,
            hourUtc: payload.hourUtc ?? current.hourUtc,
            recipients: payload.recipients ?? current.recipients,
            sendEmail: Boolean(payload.sendEmail),
            sendDownloadLink: Boolean(payload.sendDownloadLink),
            format: payload.format ?? current.format,
            timezone: payload.timezone ?? current.timezone,
            nextRun,
            updatedAt: new Date().toISOString(),
        };
        scheduleStore.set(tenantId, updated);
        (0, utils_1.sendResponse)(res, updated, null, 200, 'Schedule updated');
    }
    catch (err) {
        next(err);
    }
};
exports.updateReportSchedule = updateReportSchedule;
