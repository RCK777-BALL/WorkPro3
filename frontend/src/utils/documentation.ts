/*
 * SPDX-License-Identifier: MIT
 */

import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import * as mammoth from 'mammoth';
import * as PDFJS from 'pdfjs-dist';

export interface DocumentMetadata {
  title: string;
  type: 'pdf' | 'excel' | 'word';
  size: number;
  lastModified: Date;
  tags?: string[];
  category?: string;
}

export const parseDocument = async (file: File): Promise<{ content: string; metadata: DocumentMetadata }> => {
  const metadata: DocumentMetadata = {
    title: file.name,
    type: file.name.split('.').pop()?.toLowerCase() as 'pdf' | 'excel' | 'word',
    size: file.size,
    lastModified: new Date(file.lastModified)
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
      content = pages.map(page => 
        page.items.map((item: any) => item.str).join(' ')
      ).join('\n');
      break;

    case 'excel':
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      content = workbook.worksheets.map(worksheet => {
        const rows: string[] = [];
        worksheet.eachRow({ includeEmpty: true }, row => {
          const values = row.values as unknown as Array<any>;
          rows.push(values.slice(1).map(v => (v ?? '').toString()).join(','));
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

export const downloadDocument = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
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
