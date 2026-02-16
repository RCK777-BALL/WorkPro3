import React from 'react';
import clsx from 'clsx';

export type CalibrationScheduleView = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  siteId?: string;
  assetId?: string;
  frequencyDays: number;
  lastCalibratedAt?: string;
  nextDueAt: string;
  status: 'scheduled' | 'due' | 'overdue' | 'in-compliance';
};

interface CalibrationCalendarProps {
  schedules: CalibrationScheduleView[];
  loading?: boolean;
}

const statusStyles: Record<CalibrationScheduleView['status'], string> = {
  scheduled: 'bg-slate-100 text-slate-700',
  due: 'bg-amber-100 text-amber-800',
  overdue: 'bg-rose-100 text-rose-700',
  'in-compliance': 'bg-emerald-100 text-emerald-700',
};

export const CalibrationCalendar: React.FC<CalibrationCalendarProps> = ({ schedules, loading = false }) => {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--wp-color-text)]">Calibration Calendar</h3>
        <p className="text-xs text-[var(--wp-color-text-muted)]">Upcoming and overdue instruments</p>
      </header>
      <div className="overflow-x-auto rounded-xl border border-[var(--wp-color-border)]">
        <table className="min-w-full divide-y divide-[var(--wp-color-border)] text-sm">
          <thead className="bg-[var(--wp-color-surface-elevated)]">
            <tr>
              <th className="px-3 py-2 text-left">Instrument</th>
              <th className="px-3 py-2 text-left">Frequency</th>
              <th className="px-3 py-2 text-left">Last Calibrated</th>
              <th className="px-3 py-2 text-left">Next Due</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--wp-color-border)] bg-[var(--wp-color-surface)]">
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-[var(--wp-color-text-muted)]" colSpan={5}>
                  Loading calibration schedules...
                </td>
              </tr>
            ) : schedules.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-[var(--wp-color-text-muted)]" colSpan={5}>
                  No calibration schedules found.
                </td>
              </tr>
            ) : (
              schedules
                .slice()
                .sort((a, b) => Date.parse(a.nextDueAt) - Date.parse(b.nextDueAt))
                .map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-[var(--wp-color-text)]">{row.instrumentName}</div>
                      <div className="text-xs text-[var(--wp-color-text-muted)]">{row.instrumentId}</div>
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">{row.frequencyDays} days</td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">
                      {row.lastCalibratedAt ? new Date(row.lastCalibratedAt).toLocaleDateString() : 'Not recorded'}
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">
                      {new Date(row.nextDueAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <span className={clsx('rounded-full px-2 py-1 text-xs font-semibold', statusStyles[row.status])}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
