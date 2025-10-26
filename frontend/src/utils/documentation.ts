/*
 * SPDX-License-Identifier: MIT
 */

import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import * as mammoth from 'mammoth';
import * as PDFJS from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import http from '@/lib/http';

export type DocumentType = 'pdf' | 'excel' | 'word';

const MIME_TYPE_TO_TYPE: Record<string, DocumentType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/msword': 'word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
};

const EXTENSION_TO_TYPE: Record<string, DocumentType> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
};

const DEFAULT_MIME_BY_TYPE: Record<DocumentType, string> = {
  pdf: 'application/pdf',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export const getDefaultMimeForType = (type: DocumentType) => DEFAULT_MIME_BY_TYPE[type];

export interface DocumentMetadata {
  title: string;
  type: DocumentType;
  mimeType: string;
  size: number;
  lastModified: Date;
  tags?: string[];
  category?: string;
}

export const inferDocumentType = (mimeType?: string, filename?: string): DocumentType => {
  const normalizedMime = mimeType?.toLowerCase();
  if (normalizedMime && normalizedMime in MIME_TYPE_TO_TYPE) {
    return MIME_TYPE_TO_TYPE[normalizedMime];
  }
  const extension = filename?.split('.').pop()?.toLowerCase();
  if (extension && extension in EXTENSION_TO_TYPE) {
    return EXTENSION_TO_TYPE[extension];
  }
  throw new Error('Unsupported file type');
};

export const parseDocument = async (
  file: File,
): Promise<{ content: string; metadata: DocumentMetadata }> => {
  const type = inferDocumentType(file.type, file.name);
  const mimeType = file.type || DEFAULT_MIME_BY_TYPE[type];

  const metadata: DocumentMetadata = {
    title: file.name,
    type,
    mimeType,
    size: file.size,
    lastModified: new Date(file.lastModified),
  };

  let content = '';

  switch (metadata.type) {
    case 'pdf': {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
      const pages = await Promise.all(
        Array.from({ length: pdf.numPages }, (_, i) =>
          pdf.getPage(i + 1).then((page) => page.getTextContent()),
        ),
      );
      content = pages
        .map((page) => page.items.map((item) => (item as TextItem).str).join(' '))
        .join('\n');
      break;
    }

    case 'excel': {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      content = workbook.worksheets
        .map((worksheet) => {
          const rows: string[] = [];
          worksheet.eachRow({ includeEmpty: true }, (row) => {
            const values = row.values as unknown[];
            rows.push(values.slice(1).map((v) => (v ?? '').toString()).join(','));
          });
          return rows.join('\n');
        })
        .join('\n');
      break;
    }

    case 'word': {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      content = result.value;
      break;
    }

    default:
      throw new Error('Unsupported file type');
  }

  return { content, metadata };
};

const resolveDocumentUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const baseURL = http.defaults.baseURL ?? '';
  if (!baseURL) {
    return url;
  }
  const root = baseURL.replace(/\/+$/, '').replace(/\/api$/, '');
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${root}${normalizedPath}`;
};

export const downloadDocument = async (url: string, filename: string, mimeType?: string) => {
  const absoluteUrl = resolveDocumentUrl(url);
  const response = await http.get<Blob>(absoluteUrl, { responseType: 'blob' });
  const blob = response.data;

  if (!(blob instanceof Blob)) {
    throw new Error('Invalid document response');
  }

  if (!mimeType && blob.type) {
    mimeType = blob.type;
  }

  if (mimeType && blob.type === mimeType) {
    saveAs(blob, filename);
    return;
  }

  const buffer = await blob.arrayBuffer();
  const normalizedMime = mimeType ?? 'application/octet-stream';
  const normalizedBlob = new Blob([buffer], { type: normalizedMime });
  saveAs(normalizedBlob, filename);
};

export const searchDocuments = (documents: { content: string; metadata: DocumentMetadata }[], query: string) => {
  const normalizedQuery = query.toLowerCase();
  return documents.filter(doc => 
    doc.content.toLowerCase().includes(normalizedQuery) ||
    doc.metadata.title.toLowerCase().includes(normalizedQuery) ||
    doc.metadata.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery))
  );
};
