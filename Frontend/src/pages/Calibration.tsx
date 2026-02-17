/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import { SectionHeader } from '@/components/ui';
import http from '@/lib/http';
import { useScopeContext } from '@/context/ScopeContext';
import { usePermissions } from '@/auth/usePermissions';
import {
  CalibrationCalendar,
  type CalibrationScheduleView,
  CalibrationExport,
  CertificateRepository,
  type CalibrationCertificateView,
} from '@/modules/calibration';
import { useToast } from '@/context/ToastContext';

type CalibrationStatusSummary = {
  total: number;
  overdue: number;
  dueSoon: number;
  compliant: number;
  lastEvaluatedAt?: string;
};

type ScopedCalibrationSchedule = CalibrationScheduleView & {
  tenantId?: string;
};

type ScopedCalibrationCertificate = CalibrationCertificateView & {
  tenantId?: string;
  siteId?: string;
};

export default function Calibration() {
  const { addToast } = useToast();
  const { activeTenant, activePlant } = useScopeContext();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScopedCalibrationSchedule[]>([]);
  const [certificates, setCertificates] = useState<ScopedCalibrationCertificate[]>([]);
  const [summary, setSummary] = useState<CalibrationStatusSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'certificates' | 'exports'>('calendar');

  const [scheduleDraft, setScheduleDraft] = useState({
    instrumentId: '',
    instrumentName: '',
    frequencyDays: '30',
    nextDueAt: '',
  });
  const [certificateDraft, setCertificateDraft] = useState({
    instrumentId: '',
    fileName: '',
    url: '',
    uploadedBy: 'System',
    issuedAt: '',
    expiresAt: '',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const scopeParams = {
        ...(activeTenant?.id ? { tenantId: activeTenant.id } : {}),
        ...(activePlant?.id ? { siteId: activePlant.id } : {}),
      };
      const [scheduleRes, certRes, summaryRes] = await Promise.all([
        http.get('/calibration/schedules', { params: scopeParams }),
        http.get('/calibration/certificates', { params: scopeParams }),
        http.get('/calibration/status', { params: scopeParams }),
      ]);

      const scheduleData = (scheduleRes.data?.data ?? scheduleRes.data ?? []) as ScopedCalibrationSchedule[];
      const certData = (certRes.data?.data ?? certRes.data ?? []) as ScopedCalibrationCertificate[];
      const summaryData = (summaryRes.data?.data ?? summaryRes.data ?? null) as CalibrationStatusSummary | null;
      const scopedSchedules = Array.isArray(scheduleData)
        ? scheduleData.filter(
            (row) =>
              (!activeTenant?.id || !row.tenantId || row.tenantId === activeTenant.id) &&
              (!activePlant?.id || !row.siteId || row.siteId === activePlant.id),
          )
        : [];
      const scopedCertificates = Array.isArray(certData)
        ? certData.filter(
            (row) =>
              (!activeTenant?.id || !row.tenantId || row.tenantId === activeTenant.id) &&
              (!activePlant?.id || !row.siteId || row.siteId === activePlant.id),
          )
        : [];

      setSchedules(scopedSchedules);
      setCertificates(scopedCertificates);
      setSummary(summaryData && typeof summaryData === 'object' ? summaryData : null);
    } catch (error) {
      console.error(error);
      addToast('Failed to load calibration workspace.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activePlant?.id, activeTenant?.id, addToast]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const addSchedule = async () => {
    if (!can('pm', 'write')) {
      addToast('You do not have permission to create calibration schedules.', 'error');
      return;
    }
    if (!scheduleDraft.instrumentId || !scheduleDraft.instrumentName || !scheduleDraft.nextDueAt) {
      addToast('Instrument ID, name, and next due date are required.', 'error');
      return;
    }
    try {
      await http.post('/calibration/schedules', {
        instrumentId: scheduleDraft.instrumentId,
        instrumentName: scheduleDraft.instrumentName,
        frequencyDays: Number(scheduleDraft.frequencyDays || 30),
        nextDueAt: new Date(scheduleDraft.nextDueAt).toISOString(),
        ...(activeTenant?.id ? { tenantId: activeTenant.id } : {}),
        ...(activePlant?.id ? { siteId: activePlant.id } : {}),
      });
      addToast('Calibration schedule created.', 'success');
      setScheduleDraft({ instrumentId: '', instrumentName: '', frequencyDays: '30', nextDueAt: '' });
      await fetchAll();
    } catch (error) {
      console.error(error);
      addToast('Unable to create calibration schedule.', 'error');
    }
  };

  const addCertificate = async () => {
    if (!can('pm', 'write')) {
      addToast('You do not have permission to attach certificates.', 'error');
      return;
    }
    if (!certificateDraft.instrumentId || !certificateDraft.fileName || !certificateDraft.url) {
      addToast('Instrument ID, file name, and URL are required.', 'error');
      return;
    }
    try {
      await http.post('/calibration/certificates', {
        ...certificateDraft,
        ...(activeTenant?.id ? { tenantId: activeTenant.id } : {}),
        ...(activePlant?.id ? { siteId: activePlant.id } : {}),
        ...(certificateDraft.issuedAt ? { issuedAt: new Date(certificateDraft.issuedAt).toISOString() } : {}),
        ...(certificateDraft.expiresAt ? { expiresAt: new Date(certificateDraft.expiresAt).toISOString() } : {}),
      });
      addToast('Certificate attached.', 'success');
      setCertificateDraft({
        instrumentId: '',
        fileName: '',
        url: '',
        uploadedBy: 'System',
        issuedAt: '',
        expiresAt: '',
      });
      await fetchAll();
    } catch (error) {
      console.error(error);
      addToast('Unable to attach certificate.', 'error');
    }
  };

  const canManageCalibration = can('pm', 'write');

  const kpis = useMemo(
    () => [
      { label: 'Total', value: summary?.total ?? 0 },
      { label: 'Overdue', value: summary?.overdue ?? 0 },
      { label: 'Due Soon', value: summary?.dueSoon ?? 0 },
      { label: 'Compliant', value: summary?.compliant ?? 0 },
    ],
    [summary],
  );

  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <SectionHeader
        title="Calibration"
        subtitle="Manage calibration schedules, certificates, and compliance exports."
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Tenant: {activeTenant?.name ?? 'All tenants'}
        </span>
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Site: {activePlant?.name ?? 'All sites'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            ['calendar', 'Calendar'],
            ['certificates', 'Certificates'],
            ['exports', 'Exports'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === key ? 'bg-[var(--wp-color-primary)] text-[var(--wp-color-primary-contrast)]' : 'text-[var(--wp-color-text-muted)] hover:bg-[var(--wp-color-surface-elevated)]'}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'calendar' ? (
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <CalibrationCalendar schedules={schedules} loading={loading} />
          <Card>
            <Card.Header>
              <Card.Title>New Schedule</Card.Title>
              <Card.Description>Create calibration cadence for an instrument.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-3">
              <Input
                label="Instrument ID"
                value={scheduleDraft.instrumentId}
                onChange={(event) =>
                  setScheduleDraft((prev) => ({ ...prev, instrumentId: event.target.value }))
                }
              />
              <Input
                label="Instrument Name"
                value={scheduleDraft.instrumentName}
                onChange={(event) =>
                  setScheduleDraft((prev) => ({ ...prev, instrumentName: event.target.value }))
                }
              />
              <Input
                label="Frequency (days)"
                type="number"
                min={1}
                value={scheduleDraft.frequencyDays}
                onChange={(event) =>
                  setScheduleDraft((prev) => ({ ...prev, frequencyDays: event.target.value }))
                }
              />
              <Input
                label="Next Due Date"
                type="date"
                value={scheduleDraft.nextDueAt}
                onChange={(event) =>
                  setScheduleDraft((prev) => ({ ...prev, nextDueAt: event.target.value }))
                }
              />
              <Button
                onClick={addSchedule}
                disabled={!canManageCalibration}
                aria-label={
                  canManageCalibration
                    ? 'Create schedule'
                    : 'Create schedule disabled - insufficient permissions'
                }
              >
                Create schedule
              </Button>
            </Card.Content>
          </Card>
        </div>
      ) : null}

      {activeTab === 'certificates' ? (
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <CertificateRepository certificates={certificates} loading={loading} />
          <Card>
            <Card.Header>
              <Card.Title>Attach Certificate</Card.Title>
              <Card.Description>Link certificate metadata to an instrument.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-3">
              <Input
                label="Instrument ID"
                value={certificateDraft.instrumentId}
                onChange={(event) =>
                  setCertificateDraft((prev) => ({ ...prev, instrumentId: event.target.value }))
                }
              />
              <Input
                label="File Name"
                value={certificateDraft.fileName}
                onChange={(event) =>
                  setCertificateDraft((prev) => ({ ...prev, fileName: event.target.value }))
                }
              />
              <Input
                label="Document URL"
                value={certificateDraft.url}
                onChange={(event) =>
                  setCertificateDraft((prev) => ({ ...prev, url: event.target.value }))
                }
              />
              <Input
                label="Issued Date"
                type="date"
                value={certificateDraft.issuedAt}
                onChange={(event) =>
                  setCertificateDraft((prev) => ({ ...prev, issuedAt: event.target.value }))
                }
              />
              <Input
                label="Expiry Date"
                type="date"
                value={certificateDraft.expiresAt}
                onChange={(event) =>
                  setCertificateDraft((prev) => ({ ...prev, expiresAt: event.target.value }))
                }
              />
              <Button
                onClick={addCertificate}
                disabled={!canManageCalibration}
                aria-label={
                  canManageCalibration
                    ? 'Attach certificate'
                    : 'Attach certificate disabled - insufficient permissions'
                }
              >
                Attach certificate
              </Button>
            </Card.Content>
          </Card>
        </div>
      ) : null}

      {activeTab === 'exports' ? (
        <CalibrationExport schedules={schedules} certificates={certificates} statusSummary={summary} />
      ) : null}
    </div>
  );
}

