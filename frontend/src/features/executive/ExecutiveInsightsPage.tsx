/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { DownloadCloud } from 'lucide-react';

import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import { useToast } from '@/context/ToastContext';
import { ExecutiveTrendCard } from './components/ExecutiveTrendCard';
import { type ExecutiveTrendPoint } from './api';
import {
  useDownloadExecutiveReport,
  useExecutiveSchedule,
  useExecutiveTrends,
  useSaveExecutiveSchedule,
} from './hooks';

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

type TrendMetricKey = Exclude<keyof ExecutiveTrendPoint, 'period'>;

const formatLineData = (points: ExecutiveTrendPoint[], key: TrendMetricKey) =>
  points.map((point) => ({ label: point.period, value: Number(point[key] ?? 0) }));

const parseFilename = (header?: string): string => {
  if (!header) return 'executive-report.pdf';
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ?? 'executive-report.pdf';
};

const splitRecipients = (value: string): string[] =>
  value
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function ExecutiveInsightsPage() {
  const [months, setMonths] = useState(12);
  const { addToast } = useToast();
  const trendsQuery = useExecutiveTrends(months);
  const scheduleQuery = useExecutiveSchedule();
  const saveSchedule = useSaveExecutiveSchedule();
  const downloadReport = useDownloadExecutiveReport();

  const [recipients, setRecipients] = useState('');
  const [cron, setCron] = useState('0 9 1 * *');
  const [timezone, setTimezone] = useState('UTC');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!scheduleQuery.data) return;
    setRecipients(scheduleQuery.data.recipients.join(', '));
    setCron(scheduleQuery.data.cron);
    setTimezone(scheduleQuery.data.timezone);
    setEnabled(scheduleQuery.data.enabled);
  }, [scheduleQuery.data]);

  const points = trendsQuery.data?.points ?? [];

  const downtimeData = useMemo(() => formatLineData(points, 'downtimeHours'), [points]);
  const complianceData = useMemo(() => formatLineData(points, 'compliance'), [points]);
  const reliabilityData = useMemo(() => formatLineData(points, 'reliability'), [points]);
  const costData = useMemo(() => formatLineData(points, 'maintenanceCost'), [points]);

  const handleDownload = async () => {
    try {
      const response = await downloadReport.mutateAsync(months);
      const filename = parseFilename(response.headers?.['content-disposition']);
      const blob = new Blob([response.data], { type: response.headers?.['content-type'] ?? 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      addToast('Executive PDF downloaded.', 'success');
    } catch {
      addToast('Unable to generate the PDF right now.', 'error');
    }
  };

  const handleScheduleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      enabled,
      cron,
      timezone,
      recipients: splitRecipients(recipients),
    };
    saveSchedule.mutate(payload, {
      onSuccess: () => {
        addToast('Monthly delivery settings updated.', 'success');
      },
      onError: () => {
        addToast('Check your inputs and try again.', 'error');
      },
    });
  };

  if (trendsQuery.isLoading) {
    return (
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-8 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
        Loading executive insights…
      </div>
    );
  }

  if (trendsQuery.isError) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 p-6 text-error-700 dark:border-error-700 dark:bg-error-900/40">
        Unable to load executive analytics. Please retry shortly.
      </div>
    );
  }

  const averages = trendsQuery.data?.averages;
  const monthsResolved = trendsQuery.data?.months ?? months;
  const narrative = trendsQuery.data?.narrative;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary-600">Executive KPIs</p>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">Corporate performance cockpit</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Track downtime, compliance, maintenance spend, and reliability trends across your portfolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={months}
            onChange={(event) => setMonths(Number(event.target.value))}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {[6, 12, 18, 24].map((value) => (
              <option key={value} value={value}>
                {value} months
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            icon={<DownloadCloud className="h-4 w-4" />}
            loading={downloadReport.isLoading}
            onClick={() => {
              void handleDownload();
            }}
          >
            Generate PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Downtime"
          subtitle={`Average across last ${monthsResolved} months`}
          className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <p className="text-3xl font-semibold">{numberFormatter.format(averages?.downtimeHours ?? 0)} h</p>
        </Card>
        <Card
          title="Compliance"
          subtitle="Preventive schedule adherence"
          className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <p className="text-3xl font-semibold">{numberFormatter.format(averages?.compliance ?? 0)}%</p>
        </Card>
        <Card
          title="Reliability"
          subtitle="Derived from downtime per month"
          className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <p className="text-3xl font-semibold">{numberFormatter.format(averages?.reliability ?? 0)}%</p>
        </Card>
        <Card
          title="Maintenance cost"
          subtitle="Labor + materials"
          className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <p className="text-3xl font-semibold">{currencyFormatter.format(averages?.maintenanceCost ?? 0)}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutiveTrendCard
          title="Downtime hours"
          description="Monthly downtime accumulation"
          data={downtimeData}
          footer={`Latest month: ${numberFormatter.format(points.at(-1)?.downtimeHours ?? 0)} h`}
        />
        <ExecutiveTrendCard
          title="PM compliance"
          description="Preventive work order completion rate"
          data={complianceData}
          accent="#0ea5e9"
          footer={`Latest month: ${numberFormatter.format(points.at(-1)?.compliance ?? 0)} %`}
        />
        <ExecutiveTrendCard
          title="Reliability"
          description="Uptime derived score"
          data={reliabilityData}
          accent="#16a34a"
          footer={`Latest month: ${numberFormatter.format(points.at(-1)?.reliability ?? 0)} %`}
        />
        <ExecutiveTrendCard
          title="Maintenance spend"
          description="Labor and material cost"
          data={costData}
          accent="#f97316"
          footer={`Latest month: ${currencyFormatter.format(points.at(-1)?.maintenanceCost ?? 0)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Narrative insights"
          subtitle={`Confidence ${Math.round((narrative?.confidence ?? 0) * 100)}%`}
          className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <p className="text-base text-neutral-700 dark:text-neutral-200">{narrative?.summary ?? 'No commentary available.'}</p>
          {narrative?.highlights?.length ? (
            <ul className="mt-4 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              {narrative.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card
          title="Monthly delivery"
          subtitle="Email the PDF automatically"
          className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
        >
          <form className="space-y-4" onSubmit={handleScheduleSubmit}>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Enable monthly email
            </label>
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Recipients</p>
              <textarea
                value={recipients}
                onChange={(event) => setRecipients(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-neutral-200 bg-white p-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                placeholder="ceo@example.com, ops@example.com"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Cron expression</p>
                <input
                  value={cron}
                  onChange={(event) => setCron(event.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
                <p className="mt-1 text-xs text-neutral-500">Default: 0 9 1 * *</p>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Timezone</p>
                <input
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              <p>
                Last run:{' '}
                {scheduleQuery.data?.lastRunAt
                  ? new Date(scheduleQuery.data.lastRunAt).toLocaleString()
                  : 'Not sent yet'}
              </p>
              {scheduleQuery.data?.lastRunStatus && (
                <p>
                  Status:{' '}
                  <span
                    className={
                      scheduleQuery.data.lastRunStatus === 'success'
                        ? 'text-success-600'
                        : 'text-error-600'
                    }
                  >
                    {scheduleQuery.data.lastRunStatus}
                  </span>
                </p>
              )}
              {scheduleQuery.data?.lastRunError ? (
                <p className="text-error-600">{scheduleQuery.data.lastRunError}</p>
              ) : null}
            </div>
            <Button type="submit" loading={saveSchedule.isLoading} fullWidth>
              Save schedule
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
