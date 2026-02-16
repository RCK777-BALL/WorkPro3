import React from 'react';
import Button from '@/components/common/Button';
import type { CalibrationScheduleView } from './CalibrationCalendar';
import type { CalibrationCertificateView } from './CertificateRepository';

interface CalibrationExportProps {
  schedules: CalibrationScheduleView[];
  certificates: CalibrationCertificateView[];
  statusSummary?: {
    total: number;
    overdue: number;
    dueSoon: number;
    compliant: number;
    lastEvaluatedAt?: string;
  } | null;
}

const downloadCsv = (name: string, rows: Array<Record<string, string | number>>) => {
  const headers = Object.keys(rows[0] ?? {});
  if (headers.length === 0) return;
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    const line = headers
      .map((header) => String(row[header] ?? '').replaceAll('"', '""'))
      .map((value) => `"${value}"`)
      .join(',');
    lines.push(line);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const CalibrationExport: React.FC<CalibrationExportProps> = ({
  schedules,
  certificates,
  statusSummary,
}) => {
  const exportSchedules = () =>
    downloadCsv(
      `calibration-schedules-${new Date().toISOString().slice(0, 10)}.csv`,
      schedules.map((row) => ({
        id: row.id,
        instrumentId: row.instrumentId,
        instrumentName: row.instrumentName,
        frequencyDays: row.frequencyDays,
        lastCalibratedAt: row.lastCalibratedAt ?? '',
        nextDueAt: row.nextDueAt,
        status: row.status,
      })),
    );

  const exportCertificates = () =>
    downloadCsv(
      `calibration-certificates-${new Date().toISOString().slice(0, 10)}.csv`,
      certificates.map((row) => ({
        id: row.id,
        instrumentId: row.instrumentId,
        fileName: row.fileName,
        url: row.url,
        uploadedBy: row.uploadedBy,
        uploadedAt: row.uploadedAt,
        issuedAt: row.issuedAt ?? '',
        expiresAt: row.expiresAt ?? '',
      })),
    );

  const exportSummary = () => {
    if (!statusSummary) return;
    downloadCsv(`calibration-summary-${new Date().toISOString().slice(0, 10)}.csv`, [
      {
        total: statusSummary.total,
        overdue: statusSummary.overdue,
        dueSoon: statusSummary.dueSoon,
        compliant: statusSummary.compliant,
        lastEvaluatedAt: statusSummary.lastEvaluatedAt ?? '',
      },
    ]);
  };

  return (
    <section className="space-y-3 rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4">
      <h3 className="text-base font-semibold text-[var(--wp-color-text)]">Calibration Export</h3>
      <p className="text-sm text-[var(--wp-color-text-muted)]">
        Export calibration schedules, certificates, and compliance summary for audits.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportSchedules} disabled={!schedules.length}>
          Export schedules CSV
        </Button>
        <Button variant="outline" onClick={exportCertificates} disabled={!certificates.length}>
          Export certificates CSV
        </Button>
        <Button variant="outline" onClick={exportSummary} disabled={!statusSummary}>
          Export status summary CSV
        </Button>
      </div>
    </section>
  );
};
