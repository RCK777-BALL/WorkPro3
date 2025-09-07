import { saveAs } from 'file-saver';

export type CSVInput = Record<string, any>[] | Record<string, any>;

/**
 * Generates a CSV file from an array of objects or a single object and triggers a download.
 * - Arrays of objects use their keys as headers.
 * - Plain objects are converted to a two-column key/value table.
 */
const exportCsv = (data: CSVInput, filename = 'data') => {
  let rows: Record<string, any>[] = [];

  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === 'object') {
    rows = Object.entries(data).map(([key, value]) => ({ key, value }));
  }

  if (!rows.length) return;

  const headers = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((k) => set.add(k));
    return set;
  }, new Set<string>()));

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export default exportCsv;
