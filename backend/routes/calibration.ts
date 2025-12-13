/*
 * SPDX-License-Identifier: MIT
 */

import express, { type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { writeAuditLog } from '../utils/audit';

interface CalibrationCertificate {
  id: string;
  instrumentId: string;
  fileName: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  issuedAt?: string;
  expiresAt?: string;
}

interface CalibrationSchedule {
  id: string;
  instrumentId: string;
  instrumentName: string;
  siteId?: string;
  assetId?: string;
  frequencyDays: number;
  lastCalibratedAt?: string;
  nextDueAt: string;
  status: 'scheduled' | 'due' | 'overdue' | 'in-compliance';
  certificates: CalibrationCertificate[];
  history: Array<{
    at: string;
    action: string;
    notes?: string;
  }>;
}

interface CalibrationState {
  schedules: CalibrationSchedule[];
}

const tenantCalibrationState = new Map<string, CalibrationState>();

const router = express.Router();
router.use(requireAuth);
router.use(tenantScope);

const ensureState = (tenantId: string): CalibrationState => {
  if (!tenantCalibrationState.has(tenantId)) {
    tenantCalibrationState.set(tenantId, { schedules: [] });
  }
  return tenantCalibrationState.get(tenantId)!;
};

const computeStatus = (schedule: CalibrationSchedule): CalibrationSchedule['status'] => {
  const now = Date.now();
  const nextDue = Date.parse(schedule.nextDueAt);
  if (Number.isNaN(nextDue)) return 'scheduled';
  if (nextDue < now) return 'overdue';
  const soonThreshold = now + 7 * 24 * 60 * 60 * 1000;
  if (nextDue < soonThreshold) return 'due';
  return 'in-compliance';
};

router.get('/schedules', (req, res) => {
  const state = ensureState(req.tenantId!);
  const { status, siteId } = req.query as { status?: string; siteId?: string };

  const schedules = state.schedules
    .map((entry) => ({ ...entry, status: computeStatus(entry) }))
    .filter((entry) => (status ? entry.status === status : true))
    .filter((entry) => (siteId ? entry.siteId === siteId : true));

  res.json({ success: true, data: schedules });
});

router.post('/schedules', async (req, res, next) => {
  try {
    const state = ensureState(req.tenantId!);
    const {
      instrumentId,
      instrumentName,
      siteId,
      assetId,
      frequencyDays,
      lastCalibratedAt,
      nextDueAt,
      notes,
    } = req.body as {
      instrumentId: string;
      instrumentName: string;
      siteId?: string;
      assetId?: string;
      frequencyDays: number;
      lastCalibratedAt?: string;
      nextDueAt: string;
      notes?: string;
    };

    if (!instrumentId || !instrumentName || !frequencyDays || !nextDueAt) {
      return res.status(400).json({ success: false, message: 'instrumentId, instrumentName, frequencyDays, and nextDueAt are required.' });
    }

    const schedule: CalibrationSchedule = {
      id: `${Date.now()}`,
      instrumentId,
      instrumentName,
      siteId,
      assetId,
      frequencyDays,
      lastCalibratedAt,
      nextDueAt,
      status: 'scheduled',
      certificates: [],
      history: [
        {
          at: new Date().toISOString(),
          action: 'created',
          notes,
        },
      ],
    };

    state.schedules.push(schedule);

    await writeAuditLog({
      tenantId: req.tenantId!,
      siteId,
      userId: req.user?._id,
      action: 'calibration-schedule-created',
      entityType: 'calibration-record',
      entityId: schedule.id,
      entityLabel: schedule.instrumentName,
      after: schedule,
    });

    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
});

router.patch('/schedules/:id', async (req, res, next) => {
  try {
    const state = ensureState(req.tenantId!);
    const { id } = req.params;
    const schedule = state.schedules.find((item) => item.id === id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found.' });
    }

    const before = { ...schedule };
    const { nextDueAt, lastCalibratedAt, frequencyDays, notes } = req.body as Partial<CalibrationSchedule> & {
      notes?: string;
    };

    if (nextDueAt) schedule.nextDueAt = nextDueAt;
    if (lastCalibratedAt) schedule.lastCalibratedAt = lastCalibratedAt;
    if (frequencyDays) schedule.frequencyDays = frequencyDays;
    schedule.status = computeStatus(schedule);
    schedule.history.push({ at: new Date().toISOString(), action: 'updated', notes });

    await writeAuditLog({
      tenantId: req.tenantId!,
      siteId: schedule.siteId,
      userId: req.user?._id,
      action: 'calibration-schedule-updated',
      entityType: 'calibration-record',
      entityId: schedule.id,
      entityLabel: schedule.instrumentName,
      before,
      after: schedule,
    });

    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
});

router.get('/schedules/:id/history', (req, res) => {
  const state = ensureState(req.tenantId!);
  const schedule = state.schedules.find((item) => item.id === req.params.id);
  if (!schedule) {
    return res.status(404).json({ success: false, message: 'Schedule not found.' });
  }
  res.json({ success: true, data: schedule.history });
});

router.get('/certificates', (req, res) => {
  const state = ensureState(req.tenantId!);
  const certificates = state.schedules.flatMap((schedule) => schedule.certificates);
  res.json({ success: true, data: certificates });
});

router.post('/certificates', async (req, res, next) => {
  try {
    const state = ensureState(req.tenantId!);
    const { instrumentId, fileName, url, uploadedBy, issuedAt, expiresAt } = req.body as CalibrationCertificate;
    const schedule = state.schedules.find((item) => item.instrumentId === instrumentId);

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Calibration schedule not found for instrument.' });
    }

    const certificate: CalibrationCertificate = {
      id: `${Date.now()}`,
      instrumentId,
      fileName,
      url,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      issuedAt,
      expiresAt,
    };

    schedule.certificates.push(certificate);
    schedule.history.push({ at: certificate.uploadedAt, action: 'certificate-attached', notes: fileName });

    await writeAuditLog({
      tenantId: req.tenantId!,
      siteId: schedule.siteId,
      userId: req.user?._id,
      action: 'calibration-certificate-attached',
      entityType: 'calibration-record',
      entityId: schedule.id,
      entityLabel: `${schedule.instrumentName} certificate`,
      before: undefined,
      after: certificate,
    });

    res.status(201).json({ success: true, data: certificate });
  } catch (err) {
    next(err);
  }
});

router.get('/status', (req, res) => {
  const state = ensureState(req.tenantId!);
  const schedules = state.schedules.map((item) => ({ ...item, status: computeStatus(item) }));
  const total = schedules.length;
  const overdue = schedules.filter((item) => item.status === 'overdue').length;
  const dueSoon = schedules.filter((item) => item.status === 'due').length;
  const compliant = schedules.filter((item) => item.status === 'in-compliance').length;

  res.json({
    success: true,
    data: {
      total,
      overdue,
      dueSoon,
      compliant,
      lastEvaluatedAt: new Date().toISOString(),
    },
  });
});

router.post('/status/check', async (req, res, next) => {
  try {
    const state = ensureState(req.tenantId!);
    const { instruments } = req.body as { instruments: string[] };
    const schedules = state.schedules.map((item) => ({ ...item, status: computeStatus(item) }));
    const matches = schedules.filter((item) => instruments.includes(item.instrumentId));

    const blocking = matches.filter((item) => item.status === 'overdue');
    const warnings = matches.filter((item) => item.status === 'due');

    const response = {
      canProceed: blocking.length === 0,
      blockingInstruments: blocking.map((item) => item.instrumentName),
      warningInstruments: warnings.map((item) => item.instrumentName),
      evaluatedAt: new Date().toISOString(),
    };

    await writeAuditLog({
      tenantId: req.tenantId!,
      siteId: req.siteId,
      userId: req.user?._id,
      action: 'calibration-status-check',
      entityType: 'calibration-record',
      entityLabel: 'batch-status-check',
      after: response,
    });

    res.json({ success: true, data: response });
  } catch (err) {
    next(err);
  }
});

router.post('/alerts', (req, res) => {
  const state = ensureState(req.tenantId!);
  const lookaheadDays = Number(req.body?.lookaheadDays ?? 14);
  const threshold = Date.now() + lookaheadDays * 24 * 60 * 60 * 1000;
  const upcoming = state.schedules
    .map((item) => ({ ...item, status: computeStatus(item) }))
    .filter((item) => Date.parse(item.nextDueAt) < threshold)
    .sort((a, b) => Date.parse(a.nextDueAt) - Date.parse(b.nextDueAt));

  res.json({
    success: true,
    data: {
      upcoming,
      generatedAt: new Date().toISOString(),
    },
  });
});

router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: err.message });
});

export default router;
