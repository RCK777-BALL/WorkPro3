/*
 * SPDX-License-Identifier: MIT
 */

// utils/export.ts
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Asset } from '@/types';

export const exportToExcel = async <T>(
  data: T[],
  filename: string,
  map: (item: T) => Record<string, unknown>
) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(filename);

  const rows = data.map(map);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  sheet.columns = headers.map(header => ({ header, key: header }));
  sheet.addRows(rows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToPDF = <T>(
  data: T[],
  filename: string,
  map: (item: T) => Record<string, unknown>
) => {
  const doc = new jsPDF();
  const rows = data.map(map);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const body = rows.map((row) => headers.map((header) => String(row[header] ?? '')));
  autoTable(doc, { head: [headers], body });
  doc.save(`${filename}.pdf`);
};

export const exportToCSV = <T>(
  data: T[],
  filename: string,
  map: (item: T) => Record<string, unknown>
) => {
  const rows = data.map(map);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportAssetsToExcel = async (assets: Asset[], filename: string) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Assets');

  const rows = assets.map(asset => ({
    ID: asset.id,
    Name: asset.name,
    Category: asset.category,
    Location: asset.location,
    Status: asset.status,
    'Last Serviced': asset.lastServiced,
    'Warranty Expiry': asset.warrantyExpiry
  }));

  const headers = rows.length ? Object.keys(rows[0]) : [];
  sheet.columns = headers.map(header => ({ header, key: header }));
  sheet.addRows(rows);

  const buffer = await workbook.xlsx.writeBuffer();
  const data = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  saveAs(data, `${filename}.xlsx`);
};

export const exportAssetsToPDF = (assets: Asset[], filename: string) => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text('Asset Registry Report', 20, 20);

  doc.setFontSize(12);
  let yPos = 40;

  assets.forEach((asset) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`${asset.id} - ${asset.name}`, 20, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 10;
    doc.text(`Category: ${asset.category}`, 25, yPos);
    yPos += 7;
    doc.text(`Location: ${asset.location}`, 25, yPos);
    yPos += 7;
    doc.text(`Status: ${asset.status}`, 25, yPos);
    yPos += 7;
    doc.text(`Last Serviced: ${asset.lastServiced || 'N/A'}`, 25, yPos);
    yPos += 7;
    doc.text(`Warranty Expiry: ${asset.warrantyExpiry || 'N/A'}`, 25, yPos);
    yPos += 15;
  });

  doc.save(`${filename}.pdf`);
};

// Generic helpers for metric exports
export const exportMetricsToCSV = (
  data: Record<string, unknown>[],
  filename: string,
) => exportToCSV(data, filename, (d) => d);

export const exportMetricsToPDF = (
  data: Record<string, unknown>[],
  filename: string,
) => exportToPDF(data, filename, (d) => d);

export const exportMetrics = (
  data: Record<string, unknown>[],
  filename: string,
  format: 'csv' | 'pdf',
) =>
  format === 'pdf'
    ? exportMetricsToPDF(data, filename)
    : exportMetricsToCSV(data, filename);
