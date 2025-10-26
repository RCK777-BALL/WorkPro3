/*
 * SPDX-License-Identifier: MIT
 */

import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import * as mammoth from 'mammoth';
import * as PDFJS from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export interface DocumentMetadata {
  id?: string;
  title: string;
  type: 'pdf' | 'excel' | 'word';
  mimeType: string;
  size?: number;
  lastModified?: Date;
  tags?: string[];
  category?: string;
  downloadUrl?: string;
}

export const parseDocument = async (
  file: File,
): Promise<{ content: string; metadata: DocumentMetadata }> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = normalizeMimeType(file.type, extension);
  const type = inferDocumentType(mimeType, extension);

  const metadata: DocumentMetadata = {
    title: file.name,
    type,
    mimeType,
    size: file.size,
    lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
  };

  let content = '';

  switch (metadata.type) {
    case 'pdf':
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) => 
          pdf.getPage(i + 1).then(page => page.getTextContent())
        )
      );
      content = pages
        .map((page) => page.items.map((item) => (item as TextItem).str).join(' '))
        .join('\n');
      break;

    case 'excel':
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      content = workbook.worksheets.map(worksheet => {
        const rows: string[] = [];
        worksheet.eachRow({ includeEmpty: true }, row => {
          const values = row.values as unknown[];
          rows.push(values.slice(1).map((v) => (v ?? '').toString()).join(','));
        });
        return rows.join('\n');
      }).join('\n');
      break;

    case 'word':
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      content = result.value;
      break;

    default:
      throw new Error('Unsupported file type');
  }

  return { content, metadata };
};

export const downloadDocument = (content: string | ArrayBuffer, filename: string, type: string) => {
  const blob = typeof content === 'string'
    ? new Blob([content], { type })
    : new Blob([content], { type });
  saveAs(blob, filename);
};

export const searchDocuments = (documents: { content: string; metadata: DocumentMetadata }[], query: string) => {
  const normalizedQuery = query.toLowerCase();
  return documents.filter(doc =>
    doc.content.toLowerCase().includes(normalizedQuery) ||
    doc.metadata.title.toLowerCase().includes(normalizedQuery) ||
    doc.metadata.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery))
  );
};

const MIME_TYPE_MAP: Record<string, DocumentMetadata['type']> = {
  'application/pdf': 'pdf',
  'application/msword': 'word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
};

const EXTENSION_TYPE_MAP: Record<string, DocumentMetadata['type']> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
};

const CANONICAL_MIME: Record<DocumentMetadata['type'], string> = {
  pdf: 'application/pdf',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const inferDocumentType = (
  mimeType?: string,
  extension?: string,
): DocumentMetadata['type'] => {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime && normalizedMime in MIME_TYPE_MAP) {
    return MIME_TYPE_MAP[normalizedMime];
  }

  if (extension) {
    const normalizedExt = extension.toLowerCase();
    const type = EXTENSION_TYPE_MAP[normalizedExt];
    if (type) {
      return type;
    }
  }

  throw new Error('Unsupported file type');
};

export const normalizeMimeType = (mimeType?: string, extension?: string): string => {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime && normalizedMime in MIME_TYPE_MAP) {
    const type = MIME_TYPE_MAP[normalizedMime];
    return CANONICAL_MIME[type];
  }

  if (extension) {
    const normalizedExt = extension.toLowerCase();
    const type = EXTENSION_TYPE_MAP[normalizedExt];
    if (type) {
      return CANONICAL_MIME[type];
    }
  }

  return mimeType ?? 'application/octet-stream';
};
