/*
 * SPDX-License-Identifier: MIT
 */

import type { Express } from 'express';
import type { FilterQuery } from 'mongoose';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

import { Buffer as NodeBuffer } from 'buffer';

import Asset, { type AssetDoc } from '../../../models/Asset';

export type ImportEntity = 'assets' | 'pms' | 'workOrders' | 'parts';

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

export interface ImportAssetRow extends Record<string, string | number | undefined> {
  name: string;
  type?: AssetDoc['type'] | undefined;
  status?: string | undefined;
  location?: string | undefined;
  department?: string | undefined;
  line?: string | undefined;
  station?: string | undefined;
  serialNumber?: string | undefined;
  criticality?: string | undefined;
}

export interface ImportPmRow extends Record<string, string | number | undefined> {
  title: string;
  asset?: string;
  interval?: string;
  department?: string;
  priority?: string;
}

export interface ImportWorkOrderRow extends Record<string, string | number | undefined> {
  title: string;
  status?: string;
  priority?: string;
  asset?: string;
  requestedBy?: string;
  dueDate?: string;
}

export interface ImportPartRow extends Record<string, string | number | undefined> {
  name: string;
  partNumber?: string;
  quantity?: number;
  location?: string;
  unit?: string;
  reorderThreshold?: number;
}

export type ImportPreviewRow = Record<string, string | number | undefined>;

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportValidationError[];
  preview: ImportPreviewRow[];
  columns: string[];
  detectedFormat: 'csv' | 'xlsx';
}

export interface ExportPayload {
  buffer: NodeBuffer;
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

type ImportableColumn = keyof ImportAssetRow & string;
type ColumnAliases<TRow extends Record<string, unknown>> = Record<string, keyof TRow & string>;
type ImportRowMap = {
  assets: ImportAssetRow;
  pms: ImportPmRow;
  workOrders: ImportWorkOrderRow;
  parts: ImportPartRow;
};

const STATUS_VALUES = new Set(['Active', 'Offline', 'In Repair']);
const CRITICALITY_VALUES = new Set(['high', 'medium', 'low']);
const TYPE_VALUES = new Set(['Electrical', 'Mechanical', 'Tooling', 'Interface']);
const PM_PRIORITY_VALUES = new Set(['low', 'medium', 'high']);
const WORK_ORDER_STATUS_VALUES = new Set(['Open', 'In Progress', 'Completed', 'Cancelled']);
const WORK_ORDER_PRIORITY_VALUES = new Set(['Low', 'Medium', 'High', 'Critical']);

const REQUIRED_FIELDS: ImportableColumn[] = ['name', 'type'];

const COLUMN_ALIASES: ColumnAliases<ImportAssetRow> = {
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

const PM_ALIASES: ColumnAliases<ImportPmRow> = {
  title: 'title',
  task: 'title',
  name: 'title',
  asset: 'asset',
  assetname: 'asset',
  interval: 'interval',
  frequency: 'interval',
  department: 'department',
  priority: 'priority',
};

const WORK_ORDER_ALIASES: ColumnAliases<ImportWorkOrderRow> = {
  title: 'title',
  summary: 'title',
  status: 'status',
  priority: 'priority',
  asset: 'asset',
  assetname: 'asset',
  requestedby: 'requestedBy',
  requester: 'requestedBy',
  duedate: 'dueDate',
  due: 'dueDate',
};

const PART_ALIASES: ColumnAliases<ImportPartRow> = {
  name: 'name',
  partname: 'name',
  partnumber: 'partNumber',
  sku: 'partNumber',
  quantity: 'quantity',
  qty: 'quantity',
  onhand: 'quantity',
  location: 'location',
  bin: 'location',
  unit: 'unit',
  reorder: 'reorderThreshold',
  reorderpoint: 'reorderThreshold',
};

const trimValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

const normalizeKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeRowWithAliases = <TRow extends Record<string, unknown>>(
  row: Record<string, unknown>,
  aliases: ColumnAliases<TRow>,
): Partial<TRow> | null => {
  const normalized: Partial<TRow> = {};
  let hasValue = false;

  for (const [rawKey, rawValue] of Object.entries(row)) {
    if (rawValue === undefined || rawValue === null) continue;
    const trimmed = trimValue(rawValue);
    if (!trimmed) continue;

    const mappedKey = aliases[normalizeKey(rawKey)];
    if (!mappedKey) continue;

    (normalized as Record<string, unknown>)[mappedKey] = trimmed;
    hasValue = true;
  }

  return hasValue ? normalized : null;
};

const buildAssetFilter = (context: Context): FilterQuery<AssetDoc> => {
  const filter: FilterQuery<AssetDoc> = { tenantId: context.tenantId };
  if (context.plantId) (filter as any).plant = context.plantId;
  if (context.siteId) (filter as any).siteId = context.siteId;
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

/**
 * Converts ExcelJS buffer outputs (which may be ArrayBuffer/Uint8Array/etc) into a Node Buffer.
 * This also prevents TS mismatches like Buffer<ArrayBufferLike> vs Buffer by ensuring an
 * ArrayBuffer-backed Node Buffer.
 */
const toNodeBuffer = (data: unknown): NodeBuffer => {
  const fromUint8 = (bytes: Uint8Array): NodeBuffer => NodeBuffer.from(Uint8Array.from(bytes));

  if (NodeBuffer.isBuffer(data)) return fromUint8(data);

  if (data instanceof ArrayBuffer) return NodeBuffer.from(new Uint8Array(data));
  if (typeof SharedArrayBuffer !== 'undefined' && data instanceof SharedArrayBuffer) {
    return fromUint8(new Uint8Array(data));
  }
  if (data instanceof Uint8Array) return fromUint8(data);

  // Some libs type this as "ArrayBufferLike" or unknown; handle safely
  if (data && typeof data === 'object' && 'buffer' in (data as any) && (data as any).buffer instanceof ArrayBuffer) {
    const typed = data as { buffer: ArrayBuffer; byteOffset?: number; byteLength?: number };
    if (typeof typed.byteOffset === 'number' && typeof typed.byteLength === 'number') {
      return NodeBuffer.from(new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength));
    }
    return NodeBuffer.from(new Uint8Array(typed.buffer));
  }

  throw new ImportExportError('Unable to convert workbook buffer to a Node Buffer.');
};

export const generateAssetExport = async (context: Context, format: ExportFormat): Promise<ExportPayload> => {
  const filter = buildAssetFilter(context);
  const assets = await Asset.find(filter).sort({ updatedAt: -1 }).limit(1000).lean();
  const rows = buildExportRows(assets);

  if (format === 'csv') {
    const csv = Papa.unparse(rows, { header: true, skipEmptyLines: true });
    return {
      buffer: NodeBuffer.from(csv, 'utf8'),
      filename: 'assets.csv',
      mimeType: 'text/csv',
    };
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Assets');
  const headers = EXPORT_HEADERS.map((h) => h.label);

  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(headers.map((header) => row[header] ?? '')));

  const wb = await workbook.xlsx.writeBuffer();
  const buffer = toNodeBuffer(wb);

  return {
    buffer,
    filename: 'assets.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
};

const parseCsvRows = (file: Express.Multer.File): Record<string, unknown>[] => {
  const csv = file.buffer.toString('utf8');
  const parsed = Papa.parse<Record<string, unknown>>(csv, { header: true, skipEmptyLines: 'greedy' });

  if (parsed.errors.length > 0) {
    throw new ImportExportError(`Unable to parse CSV: ${parsed.errors[0]?.message ?? 'unknown error'}`);
  }
  return parsed.data;
};

const normalizeWorkbookValue = (value: ExcelJS.CellValue | undefined | null): string | number | undefined => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();

  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('richText' in value) return value.richText.map((entry) => entry.text).join('');
    if ('formula' in value) return value.result as string | number | undefined;
    if ('result' in value) return value.result as string | number | undefined;
    if ('hyperlink' in value) return (value as any).text ?? (value as any).hyperlink;
  }

  return value as string | number;
};

// ExcelJS typings can lag behind newer @types/node Buffer generics.
// We normalize to a Node Buffer and cast ONLY at the ExcelJS boundary.
const toExcelJsLoadInput = (data: unknown): ArrayBuffer | Uint8Array | Buffer => {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data instanceof Uint8Array) return data;

  // Some multer setups may give { buffer: ArrayBuffer } or similar
  if (data && typeof data === 'object') {
    const anyData = data as any;
    if (Buffer.isBuffer(anyData.buffer)) return anyData.buffer;
    if (anyData.buffer instanceof ArrayBuffer) return new Uint8Array(anyData.buffer);
    if (anyData.buffer instanceof Uint8Array) return anyData.buffer;
  }

  throw new Error('Unsupported upload buffer type for Excel import.');
};

const parseWorkbookRows = async (file: Express.Multer.File) => {
  const workbook = new ExcelJS.Workbook();

  // Multer gives Node Buffer. ExcelJS runtime accepts Buffer/Uint8Array/ArrayBuffer,
  // but its TS types may not accept Buffer<ArrayBuffer>. So we cast at the call site.
  const input = toExcelJsLoadInput(file.buffer);

  await workbook.xlsx.load(input as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('The uploaded workbook does not have any sheets.');
  }

  const headerRow = worksheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values : [];
  const headers = headerValues.slice(1).map((v) => String(v ?? '').trim());

  if (headers.length === 0) {
    throw new Error('The uploaded workbook does not have any headers.');
  }

  const rows: Record<string, unknown>[] = [];
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    const rowData: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      if (!header) return;
      rowData[header] = row.getCell(index + 1).value ?? '';
    });

    const hasValues = Object.values(rowData).some(
      (value) => value !== '' && value !== null && value !== undefined,
    );

    if (hasValues) rows.push(rowData);
  }

  return rows;
};

const detectFormat = (file: Express.Multer.File): 'csv' | 'xlsx' => {
  const name = file.originalname.toLowerCase();

  if (name.endsWith('.csv') || file.mimetype.includes('csv')) return 'csv';
  if (name.endsWith('.xls')) throw new ImportExportError('Only .xlsx workbooks are supported for Excel imports.');
  if (name.endsWith('.xlsx')) return 'xlsx';
  if (/spreadsheet|excel/.test(file.mimetype)) return 'xlsx';

  throw new ImportExportError('Only CSV or Excel files are supported for imports.');
};

const normalizeRows = <TRow extends Record<string, unknown>>(
  rawRows: Record<string, unknown>[],
  aliases: ColumnAliases<TRow>,
): Partial<TRow>[] => {
  const rows: Partial<TRow>[] = [];
  for (const row of rawRows) {
    const normalized = normalizeRowWithAliases<TRow>(row, aliases);
    if (normalized) rows.push(normalized);
  }
  return rows;
};

const ALIASES_BY_ENTITY: { [K in ImportEntity]: ColumnAliases<ImportRowMap[K]> } = {
  assets: COLUMN_ALIASES,
  pms: PM_ALIASES,
  workOrders: WORK_ORDER_ALIASES,
  parts: PART_ALIASES,
};

const getAliasesForEntity = <T extends ImportEntity>(entity: T): ColumnAliases<ImportRowMap[T]> =>
  ALIASES_BY_ENTITY[entity];

export const parseImportFile = async <T extends ImportEntity>(
  file: Express.Multer.File,
  entity: T,
): Promise<{ rows: Array<Partial<ImportRowMap[T]>>; format: 'csv' | 'xlsx'; columns: string[] }> => {
  const format = detectFormat(file);
  const rawRows = format === 'csv' ? parseCsvRows(file) : await parseWorkbookRows(file);

  const columns = Array.from(new Set(rawRows.flatMap((row) => Object.keys(row ?? {}))));
  const rows = normalizeRows(rawRows, getAliasesForEntity(entity));

  if (!rows.length) throw new ImportExportError('No valid rows were detected in the uploaded file.');

  return { rows, format, columns };
};

export const validateAssetRows = (
  rows: Array<Partial<ImportAssetRow>>,
): { errors: ImportValidationError[]; valid: ImportPreviewRow[] } => {
  const errors: ImportValidationError[] = [];
  const validRows: ImportPreviewRow[] = [];
  const serials = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const issues: ImportValidationError[] = [];

    const normalized: ImportAssetRow = {
      name: row.name?.toString().trim() ?? '',
      type: normalizeType(row.type as string | undefined),
      status: normalizeStatus(row.status as string | undefined),
      location: row.location?.toString().trim(),
      department: row.department?.toString().trim(),
      line: row.line?.toString().trim(),
      station: row.station?.toString().trim(),
      serialNumber: row.serialNumber?.toString().trim(),
      criticality: normalizeCriticality(row.criticality as string | undefined),
    };

    for (const field of REQUIRED_FIELDS) {
      if (!normalized[field]) {
        const fieldName = field.toString();
        issues.push({ row: rowNumber, field: fieldName, message: `${toTitle(fieldName)} is required.` });
      }
    }

    if (normalized.status && !STATUS_VALUES.has(normalized.status)) {
      issues.push({ row: rowNumber, field: 'status', message: 'Status must be Active, Offline, or In Repair.' });
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

    validRows.push({ ...normalized, status: normalized.status ?? 'Active' });
  });

  return { errors, valid: validRows };
};

export const validatePmRows = (
  rows: Array<Partial<ImportPmRow>>,
): { errors: ImportValidationError[]; valid: ImportPreviewRow[] } => {
  const errors: ImportValidationError[] = [];
  const validRows: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const issues: ImportValidationError[] = [];

    const title = row.title?.toString().trim() ?? '';
    const interval = row.interval?.toString().trim();
    const priority = row.priority?.toString().toLowerCase();

    if (!title) issues.push({ row: rowNumber, field: 'title', message: 'Title is required.' });
    if (!interval) issues.push({ row: rowNumber, field: 'interval', message: 'Interval is required.' });

    if (priority && !PM_PRIORITY_VALUES.has(priority)) {
      issues.push({ row: rowNumber, field: 'priority', message: 'Priority must be low, medium, or high.' });
    }

    if (issues.length) {
      errors.push(...issues);
      return;
    }

    validRows.push({
      title,
      interval,
      asset: row.asset?.toString().trim(),
      department: row.department?.toString().trim(),
      priority,
    });
  });

  return { errors, valid: validRows };
};

export const validateWorkOrderRows = (
  rows: Array<Partial<ImportWorkOrderRow>>,
): { errors: ImportValidationError[]; valid: ImportPreviewRow[] } => {
  const errors: ImportValidationError[] = [];
  const validRows: ImportPreviewRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const issues: ImportValidationError[] = [];

    const title = row.title?.toString().trim() ?? '';
    if (!title) issues.push({ row: rowNumber, field: 'title', message: 'Title is required.' });

    const status = row.status ? toTitle(row.status.toString()) : undefined;
    if (status && !WORK_ORDER_STATUS_VALUES.has(status)) {
      issues.push({
        row: rowNumber,
        field: 'status',
        message: 'Status must be Open, In Progress, Completed, or Cancelled.',
      });
    }

    const priority = row.priority ? toTitle(row.priority.toString()) : undefined;
    if (priority && !WORK_ORDER_PRIORITY_VALUES.has(priority)) {
      issues.push({
        row: rowNumber,
        field: 'priority',
        message: 'Priority must be Low, Medium, High, or Critical.',
      });
    }

    if (issues.length) {
      errors.push(...issues);
      return;
    }

    validRows.push({
      title,
      status: status ?? 'Open',
      priority: priority ?? 'Medium',
      asset: row.asset?.toString().trim(),
      requestedBy: row.requestedBy?.toString().trim(),
      dueDate: row.dueDate?.toString().trim(),
    });
  });

  return { errors, valid: validRows };
};

export const validatePartRows = (
  rows: Array<Partial<ImportPartRow>>,
): { errors: ImportValidationError[]; valid: ImportPreviewRow[] } => {
  const errors: ImportValidationError[] = [];
  const validRows: ImportPreviewRow[] = [];

  const parseNumber = (value?: unknown) => {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const issues: ImportValidationError[] = [];

    const name = row.name?.toString().trim() ?? '';
    if (!name) issues.push({ row: rowNumber, field: 'name', message: 'Name is required.' });

    const quantity = parseNumber(row.quantity);
    const reorderThreshold = parseNumber(row.reorderThreshold);

    if (row.quantity !== undefined && quantity === undefined) {
      issues.push({ row: rowNumber, field: 'quantity', message: 'Quantity must be numeric.' });
    }

    if (row.reorderThreshold !== undefined && reorderThreshold === undefined) {
      issues.push({ row: rowNumber, field: 'reorderThreshold', message: 'Reorder threshold must be numeric.' });
    }

    if (issues.length) {
      errors.push(...issues);
      return;
    }

    validRows.push({
      name,
      partNumber: row.partNumber?.toString().trim(),
      quantity,
      location: row.location?.toString().trim(),
      unit: row.unit?.toString().trim(),
      reorderThreshold,
    });
  });

  return { errors, valid: validRows };
};

const validateByEntity = <T extends ImportEntity>(
  entity: T,
  rows: Array<Partial<ImportRowMap[T]>>,
): { errors: ImportValidationError[]; valid: ImportPreviewRow[] } => {
  if (entity === 'assets') return validateAssetRows(rows as Array<Partial<ImportAssetRow>>);
  if (entity === 'pms') return validatePmRows(rows as Array<Partial<ImportPmRow>>);
  if (entity === 'workOrders') return validateWorkOrderRows(rows as Array<Partial<ImportWorkOrderRow>>);
  return validatePartRows(rows as Array<Partial<ImportPartRow>>);
};

export const summarizeImport = async (file: Express.Multer.File, entity: ImportEntity): Promise<ImportSummary> => {
  const { rows, format, columns } = await parseImportFile(file, entity);
  const { errors, valid } = validateByEntity(entity, rows);

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
