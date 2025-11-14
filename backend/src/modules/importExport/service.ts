/*
 * SPDX-License-Identifier: MIT
 */

import type { Express } from 'express';
import type { FilterQuery } from 'mongoose';
import Papa from 'papaparse';
import XLSX from 'xlsx';

import Asset, { type AssetDoc } from '../../../models/Asset';

export class ImportExportError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'ImportExportError';
    this.status = status;
  }
}

export type ExportFormat = 'csv' | 'xlsx';

export interface ImportValidationError {
  row: number;
  field?: string;
  message: string;
}

export interface ImportAssetRow {
  name: string;
  type?: AssetDoc['type'];
  status?: string;
  location?: string;
  department?: string;
  line?: string;
  station?: string;
  serialNumber?: string;
  criticality?: string;
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportValidationError[];
  preview: ImportAssetRow[];
  columns: string[];
  detectedFormat: 'csv' | 'xlsx';
}

export interface ExportPayload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

type Context = {
  tenantId: string;
  plantId?: string;
  siteId?: string;
};

const EXPORT_HEADERS = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
  { key: 'department', label: 'Department' },
  { key: 'line', label: 'Line' },
  { key: 'station', label: 'Station' },
  { key: 'serialNumber', label: 'Serial number' },
  { key: 'criticality', label: 'Criticality' },
] as const;

type ExportRow = Record<(typeof EXPORT_HEADERS)[number]['label'], string>;

type ImportableColumn = keyof ImportAssetRow;

const STATUS_VALUES = new Set(['Active', 'Offline', 'In Repair']);
const CRITICALITY_VALUES = new Set(['high', 'medium', 'low']);
const TYPE_VALUES = new Set(['Electrical', 'Mechanical', 'Tooling', 'Interface']);

const REQUIRED_FIELDS: ImportableColumn[] = ['name', 'type'];

const COLUMN_ALIASES: Record<string, ImportableColumn> = {
  assetname: 'name',
  name: 'name',
  type: 'type',
  assettype: 'type',
  status: 'status',
  location: 'location',
  department: 'department',
  line: 'line',
  station: 'station',
  serial: 'serialNumber',
  serialnumber: 'serialNumber',
  serial_no: 'serialNumber',
  criticality: 'criticality',
};

const trimValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeRow = (row: Record<string, unknown>): ImportAssetRow | null => {
  const normalized: Partial<ImportAssetRow> = {};
  let hasValue = false;

  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (rawValue === undefined || rawValue === null) continue;
    const trimmedValue = trimValue(rawValue);
    if (!trimmedValue) continue;
    const normalizedKey = COLUMN_ALIASES[normalizeKey(rawKey)];
    if (!normalizedKey) continue;
    (normalized as Record<string, string>)[normalizedKey] = trimmedValue;
    hasValue = true;
  }

  if (!hasValue) {
    return null;
  }

  return normalized as ImportAssetRow;
};

const buildAssetFilter = (context: Context): FilterQuery<AssetDoc> => {
  const filter: FilterQuery<AssetDoc> = { tenantId: context.tenantId };
  if (context.plantId) {
    (filter as Record<string, unknown>).plant = context.plantId as unknown;
  }
  if (context.siteId) {
    (filter as Record<string, unknown>).siteId = context.siteId as unknown;
  }
  return filter;
};

const toTitle = (value: string): string =>
  value
    .toLowerCase()
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

const normalizeType = (value?: string): AssetDoc['type'] | undefined => {
  if (!value) return undefined;
  const candidate = toTitle(value) as AssetDoc['type'];
  return TYPE_VALUES.has(candidate) ? candidate : undefined;
};

const normalizeStatus = (value?: string): string | undefined => {
  if (!value) return undefined;
  const candidate = toTitle(value);
  return STATUS_VALUES.has(candidate) ? candidate : undefined;
};

const normalizeCriticality = (value?: string): string | undefined => {
  if (!value) return undefined;
  const candidate = value.toLowerCase();
  return CRITICALITY_VALUES.has(candidate) ? candidate : undefined;
};

const buildExportRows = (assets: Array<Pick<AssetDoc, (typeof EXPORT_HEADERS)[number]['key']>>): ExportRow[] => {
  if (!assets.length) {
    return [
      {
        Name: 'Compressor A',
        Type: 'Mechanical',
        Status: 'Active',
        Location: 'Line 1 - Station Alpha',
        Department: 'Assembly',
        Line: 'Line 1',
        Station: 'Station Alpha',
        'Serial number': 'SN-00001',
        Criticality: 'high',
      },
    ];
  }

  return assets.map((asset) => ({
    Name: asset.name,
    Type: asset.type,
    Status: asset.status ?? 'Active',
    Location: asset.location ?? '',
    Department: asset.department ?? '',
    Line: asset.line ?? '',
    Station: asset.station ?? '',
    'Serial number': asset.serialNumber ?? '',
    Criticality: asset.criticality ?? '',
  }));
};

export const generateAssetExport = async (
  context: Context,
  format: ExportFormat,
): Promise<ExportPayload> => {
  const filter = buildAssetFilter(context);
  const assets = await Asset.find(filter).sort({ updatedAt: -1 }).limit(1000).lean();
  const rows = buildExportRows(assets);

  if (format === 'csv') {
    const csv = Papa.unparse(rows, { header: true, skipEmptyLines: true });
    return {
      buffer: Buffer.from(csv, 'utf8'),
      filename: 'assets.csv',
      mimeType: 'text/csv',
    };
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: EXPORT_HEADERS.map((header) => header.label),
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
  const workbookBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const buffer = Buffer.isBuffer(workbookBuffer)
    ? workbookBuffer
    : Buffer.from(workbookBuffer as ArrayBuffer);

  return {
    buffer,
    filename: 'assets.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

const parseCsvRows = (file: Express.Multer.File) => {
  const csv = file.buffer.toString('utf8');
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
  });
  if (parsed.errors.length > 0) {
    throw new ImportExportError(`Unable to parse CSV: ${parsed.errors[0]?.message ?? 'unknown error'}`);
  }
  return parsed.data;
};

const parseWorkbookRows = (file: Express.Multer.File) => {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ImportExportError('The uploaded workbook does not have any sheets.');
  }
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new ImportExportError('Unable to access the first worksheet in the workbook.');
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    blankrows: false,
  });
  return rows;
};

const detectFormat = (file: Express.Multer.File): 'csv' | 'xlsx' => {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.csv') || file.mimetype.includes('csv')) {
    return 'csv';
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return 'xlsx';
  }
  if (/spreadsheet|excel/.test(file.mimetype)) {
    return 'xlsx';
  }
  throw new ImportExportError('Only CSV or Excel files are supported for imports.');
};

const normalizeRows = (rawRows: Record<string, unknown>[]): ImportAssetRow[] => {
  const rows: ImportAssetRow[] = [];
  for (const row of rawRows) {
    const normalized = normalizeRow(row);
    if (normalized) {
      rows.push(normalized);
    }
  }
  return rows;
};

export const parseImportFile = (
  file: Express.Multer.File,
): { rows: ImportAssetRow[]; format: 'csv' | 'xlsx'; columns: string[] } => {
  const format = detectFormat(file);
  const rawRows = format === 'csv' ? parseCsvRows(file) : parseWorkbookRows(file);
  const columns = Array.from(new Set(rawRows.flatMap((row) => Object.keys(row ?? {}))));
  const rows = normalizeRows(rawRows);
  if (!rows.length) {
    throw new ImportExportError('No valid rows were detected in the uploaded file.');
  }
  return { rows, format, columns };
};

export const validateRows = (
  rows: ImportAssetRow[],
): { errors: ImportValidationError[]; valid: ImportAssetRow[] } => {
  const errors: ImportValidationError[] = [];
  const validRows: ImportAssetRow[] = [];
  const serials = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // header row offset
    const issues: ImportValidationError[] = [];

    const normalized: ImportAssetRow = {
      name: row.name?.trim() ?? '',
      type: normalizeType(row.type),
      status: normalizeStatus(row.status),
      location: row.location?.trim(),
      department: row.department?.trim(),
      line: row.line?.trim(),
      station: row.station?.trim(),
      serialNumber: row.serialNumber?.trim(),
      criticality: normalizeCriticality(row.criticality),
    };

    for (const field of REQUIRED_FIELDS) {
      if (!normalized[field]) {
        issues.push({ row: rowNumber, field, message: `${toTitle(field)} is required.` });
      }
    }

    if (normalized.status && !STATUS_VALUES.has(normalized.status)) {
      issues.push({
        row: rowNumber,
        field: 'status',
        message: 'Status must be Active, Offline, or In Repair.',
      });
    }

    if (normalized.serialNumber) {
      const fingerprint = normalized.serialNumber.toLowerCase();
      if (serials.has(fingerprint)) {
        issues.push({ row: rowNumber, field: 'serialNumber', message: 'Duplicate serial number in file.' });
      }
      serials.add(fingerprint);
    }

    if (issues.length > 0) {
      errors.push(...issues);
      return;
    }

    validRows.push({
      ...normalized,
      status: normalized.status ?? 'Active',
    });
  });

  return { errors, valid: validRows };
};

export const summarizeImport = (file: Express.Multer.File): ImportSummary => {
  const { rows, format, columns } = parseImportFile(file);
  const { errors, valid } = validateRows(rows);
  return {
    totalRows: rows.length,
    validRows: valid.length,
    invalidRows: rows.length - valid.length,
    errors,
    preview: valid.slice(0, 5),
    columns,
    detectedFormat: format,
  };
};
