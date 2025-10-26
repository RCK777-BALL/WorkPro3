/*
 * SPDX-License-Identifier: MIT
 */

import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import * as mammoth from 'mammoth';
import * as PDFJS from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export type DocumentType = 'pdf' | 'excel' | 'word';

export interface DocumentMetadata {
  id?: string;
  title: string;
  type: DocumentType;
  mimeType: string;
  size: number;
  lastModified: Date | string;
  mimeType: string;
  url?: string;
  tags?: string[];
  category?: string;
}

export const DOCUMENT_MIME_TYPES: Record<DocumentType, string> = {
  pdf: 'application/pdf',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const EXTENSION_TO_TYPE: Record<string, DocumentType> = {
  pdf: 'pdf',
  xlsx: 'excel',
  docx: 'word',
};

export const inferDocumentTypeFromFilename = (filename: string): DocumentType => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) {
    throw new Error('Unsupported file type');
  }

  const type = EXTENSION_TO_TYPE[extension];
  if (!type) {
    throw new Error('Unsupported file type');
  }

  return type;
};

export const getMimeTypeForType = (type: DocumentType): string => DOCUMENT_MIME_TYPES[type];

export const parseDocument = async (
  file: File,
): Promise<{ content: string; metadata: DocumentMetadata }> => {
  const type = inferDocumentTypeFromFilename(file.name);
  const metadata: DocumentMetadata = {
    title: file.name,
    type,
    mimeType: getMimeTypeForType(type),
    size: file.size,
    lastModified: toDate(file.lastModified),
    mimeType,
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

    default: {
      const arrayBuffer = await file.arrayBuffer();
      content = new TextDecoder().decode(arrayBuffer);
      break;
    }
  }

  return { content, metadata };
};

export const downloadDocument = (
  content: string | ArrayBuffer | Blob,
  filename: string,
  type: string,
) => {
  const blob =
    content instanceof Blob
      ? content.type && content.type !== type
        ? new Blob([content], { type })
        : content
      : new Blob([content], { type });
  saveAs(blob, filename);
};

export const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const searchDocuments = (documents: { content?: string; metadata: DocumentMetadata }[], query: string) => {
  const normalizedQuery = query.toLowerCase();
  return documents.filter(doc =>
    (doc.content?.toLowerCase().includes(normalizedQuery) ?? false) ||
    doc.metadata.title.toLowerCase().includes(normalizedQuery) ||
    doc.metadata.tags?.some(tag => tag.toLowerCase().includes(normalizedQuery))
  );
};
