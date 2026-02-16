/*
 * SPDX-License-Identifier: MIT
 */

import fs from 'fs/promises';
import path from 'path';
import ExcelJS from 'exceljs';
import { Parser } from 'json2csv';

import ExportJob from '../models/ExportJob';
import WorkOrder from '../models/WorkOrder';
import Asset from '../models/Asset';
import logger from '../utils/logger';

const EXPORT_DIR = process.env.EXPORT_JOB_DIR ?? path.resolve(process.cwd(), 'exports');
const POLL_INTERVAL_MS = 5000;

const ensureExportDir = async () => {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
};

const buildDataset = async (jobType: string, tenantId: string) => {
  switch (jobType) {
    case 'assets': {
      const assets = await Asset.find({ tenantId }).select('name status category locationId').lean();
      return (assets as any[]).map((asset: any) => ({
        id: asset._id?.toString(),
        name: asset.name,
        status: asset.status,
        category: asset.category,
        locationId: asset.locationId?.toString(),
      }));
    }
    case 'workOrders':
    default: {
      const workOrders = await WorkOrder.find({ tenantId })
        .select('title status priority createdAt assetId')
        .lean();
      return workOrders.map((workOrder) => ({
        id: workOrder._id?.toString(),
        title: workOrder.title,
        status: workOrder.status,
        priority: workOrder.priority,
        createdAt: workOrder.createdAt?.toISOString(),
        assetId: workOrder.assetId?.toString(),
      }));
    }
  }
};

const writeCsv = async (rows: Record<string, unknown>[], filePath: string) => {
  const parser = new Parser();
  const csv = parser.parse(rows);
  await fs.writeFile(filePath, csv, 'utf8');
};

const writeXlsx = async (rows: Record<string, unknown>[], filePath: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Export');
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  if (headers.length > 0) {
    worksheet.addRow(headers);
    rows.forEach((row) => {
      worksheet.addRow(headers.map((header) => row[header] ?? ''));
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  await fs.writeFile(filePath, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer));
};

const processJob = async (jobId: string) => {
  const job = await ExportJob.findById(jobId);
  if (!job) return;

  try {
    await ensureExportDir();
    const rows = await buildDataset(job.type, job.tenantId.toString());
    const extension = job.format === 'xlsx' ? 'xlsx' : 'csv';
    const fileName = `${job.type}-${job._id.toString()}.${extension}`;
    const filePath = path.join(EXPORT_DIR, fileName);

    if (job.format === 'xlsx') {
      await writeXlsx(rows, filePath);
    } else {
      await writeCsv(rows, filePath);
    }

    job.status = 'completed';
    job.fileName = fileName;
    job.filePath = filePath;
    job.completedAt = new Date();
    await job.save();
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    job.completedAt = new Date();
    await job.save();
    logger.error('Export job failed', err);
  }
};

let workerInterval: NodeJS.Timeout | undefined;

export const startExportWorker = () => {
  if (workerInterval) return;
  workerInterval = setInterval(async () => {
    const job = await ExportJob.findOneAndUpdate(
      { status: 'queued' },
      { status: 'processing', startedAt: new Date() },
      { sort: { createdAt: 1 }, returnDocument: 'after' },
    );
    if (job) {
      void processJob(job._id.toString());
    }
  }, POLL_INTERVAL_MS);
};

export const stopExportWorker = () => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = undefined;
  }
};
