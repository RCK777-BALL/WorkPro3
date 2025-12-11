/*
 * SPDX-License-Identifier: MIT
 */

import { Router, type Request } from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';
import { writeAuditLog } from '../utils/audit';

interface SafetyTemplate {
  id: string;
  name: string;
  siteId?: string | undefined;
  version: number;
  retentionDays?: number | undefined;
  checklists: string[];
  permitType?: 'hot-work' | 'confined-space' | 'general';
  category: 'checklist' | 'loto' | 'hot-work' | 'confined-space';
  lotoSteps?: string[];
  updatedAt: string;
  createdAt: string;
}

interface InspectionSchedule {
  id: string;
  templateId: string;
  workOrderId?: string | undefined;
  siteId?: string | undefined;
  scheduledFor: string;
  status: 'scheduled' | 'completed' | 'canceled';
}

interface ChecklistCompletion {
  id: string;
  templateId: string;
  completedBy: string;
  completedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  signatures: string[];
  documents: string[];
  lockoutVerified?: boolean;
  permitType?: SafetyTemplate['permitType'];
}

interface WorkOrderSafetyState {
  workOrderId: string;
  linkedTemplates: string[];
  approvals: Array<{ approver: string; status: 'pending' | 'approved' | 'rejected'; at: string }>;
  completions: ChecklistCompletion[];
}

interface SafetyHistoryEntry {
  id: string;
  action: string;
  templateId?: string;
  workOrderId?: string;
  notes?: string;
  actor?: string;
  at: string;
}

interface SafetyState {
  templates: SafetyTemplate[];
  inspections: InspectionSchedule[];
  workOrders: Record<string, WorkOrderSafetyState>;
  history: SafetyHistoryEntry[];
}

const tenantSafetyState = new Map<string, SafetyState>();

const router = Router();

router.use(requireAuth);
router.use(tenantScope);

const buildState = (tenantId: string): SafetyState => {
  if (!tenantSafetyState.has(tenantId)) {
    tenantSafetyState.set(tenantId, {
      templates: [],
      inspections: [],
      workOrders: {},
      history: [],
    });
  }
  return tenantSafetyState.get(tenantId)!;
};

type SafetyRequest = Request & { tenantId?: string; siteId?: string; user?: { _id?: string | Types.ObjectId } };

const logHistory = async (
  req: SafetyRequest,
  state: SafetyState,
  entry: Omit<SafetyHistoryEntry, 'id' | 'at'> & { at?: string },
) => {
  const record: SafetyHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: entry.at ?? new Date().toISOString(),
    ...entry,
  };
  state.history.unshift(record);
  await writeAuditLog({
    tenantId: req.tenantId!,
    siteId: req.siteId,
    userId: req.user?._id,
    action: `safety-${entry.action}`,
    entityType: 'safety-template',
    entityId: entry.templateId ?? entry.workOrderId,
    entityLabel: entry.notes,
    after: record,
  });
};

router.get('/templates', (req, res) => {
  const state = buildState(req.tenantId!);
  const { siteId, category } = req.query;
  const filtered = state.templates.filter((template) => {
    const matchesSite = siteId ? template.siteId === siteId : true;
    const matchesCategory = category ? template.category === category : true;
    return matchesSite && matchesCategory;
  });

  res.json({
    success: true,
    data: filtered,
  });
});

router.get('/templates/work-permits', (req, res) => {
  const state = buildState(req.tenantId!);
  const permits = state.templates.filter((tpl) => tpl.category === 'hot-work' || tpl.category === 'confined-space');
  res.json({ success: true, data: permits });
});

router.post('/templates', async (req, res) => {
  const state = buildState(req.tenantId!);
  const now = new Date().toISOString();
  const {
    name,
    siteId,
    retentionDays,
    checklists = [],
    permitType,
    category = 'checklist',
    lotoSteps = [],
  }: {
    name: string;
    siteId?: string;
    retentionDays?: number;
    checklists?: string[];
    permitType?: SafetyTemplate['permitType'];
    category?: SafetyTemplate['category'];
    lotoSteps?: string[];
  } = req.body || {};

  if (!name) {
    return res.status(400).json({ success: false, message: 'Template name is required.' });
  }

  const latestVersion = Math.max(
    0,
    ...state.templates
      .filter((template) => template.name === name && template.siteId === siteId)
      .map((template) => template.version),
  );

  const template: SafetyTemplate = {
    id: `${Date.now()}`,
    name,
    siteId,
    retentionDays,
    checklists,
    permitType,
    category,
    lotoSteps,
    version: latestVersion + 1,
    createdAt: now,
    updatedAt: now,
  };

  state.templates.push(template);
  await logHistory(req, state, {
    action: 'template-created',
    templateId: template.id,
    notes: `${template.name} v${template.version}`,
  });

  res.status(201).json({
    success: true,
    data: template,
  });
});

router.post('/templates/:templateId/schedule', async (req, res) => {
  const state = buildState(req.tenantId!);
  const { templateId } = req.params;
  const template = state.templates.find((tpl) => tpl.id === templateId);
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found.' });
  }

  const { workOrderId, siteId, scheduledFor } = req.body as {
    workOrderId?: string;
    siteId?: string;
    scheduledFor: string;
  };

  const schedule: InspectionSchedule = {
    id: `${Date.now()}`,
    templateId,
    workOrderId,
    siteId: siteId ?? template.siteId,
    scheduledFor,
    status: 'scheduled',
  };

  state.inspections.push(schedule);
  await logHistory(req, state, {
    action: 'inspection-scheduled',
    templateId,
    workOrderId,
    notes: `Inspection scheduled for ${scheduledFor}`,
  });

  res.status(201).json({
    success: true,
    data: schedule,
  });
});

router.get('/inspections', (req, res) => {
  const state = buildState(req.tenantId!);
  const { status, siteId } = req.query as { status?: string; siteId?: string };

  const filtered = state.inspections.filter((inspection) => {
    const matchesStatus = status ? inspection.status === status : true;
    const matchesSite = siteId ? inspection.siteId === siteId : true;
    return matchesSite && matchesStatus;
  });

  res.json({ success: true, data: filtered });
});

router.post('/inspections/:inspectionId/complete', async (req, res) => {
  const state = buildState(req.tenantId!);
  const { inspectionId } = req.params;
  const inspection = state.inspections.find((item) => item.id === inspectionId);

  if (!inspection) {
    return res.status(404).json({ success: false, message: 'Inspection not found.' });
  }

  inspection.status = 'completed';
  await logHistory(req, state, {
    action: 'inspection-completed',
    templateId: inspection.templateId,
    workOrderId: inspection.workOrderId,
    notes: 'Inspection marked complete',
  });

  res.json({ success: true, data: inspection });
});

router.post('/work-orders/:workOrderId/link-template', async (req, res) => {
  const state = buildState(req.tenantId!);
  const { workOrderId } = req.params;
  const { templateId } = req.body as { templateId: string };

  if (!templateId) {
    return res.status(400).json({ success: false, message: 'templateId is required.' });
  }

  const template = state.templates.find((tpl) => tpl.id === templateId);
  if (!template) {
    return res.status(404).json({ success: false, message: 'Template not found.' });
  }

  if (!state.workOrders[workOrderId]) {
    state.workOrders[workOrderId] = {
      workOrderId,
      linkedTemplates: [],
      approvals: [],
      completions: [],
    };
  }

  if (!state.workOrders[workOrderId].linkedTemplates.includes(templateId)) {
    state.workOrders[workOrderId].linkedTemplates.push(templateId);
  }

  await logHistory(req, state, {
    action: 'template-linked',
    templateId,
    workOrderId,
    notes: `${template.name} attached to work order`,
  });

  res.json({
    success: true,
    data: state.workOrders[workOrderId],
  });
});

router.post('/work-orders/:workOrderId/completions', async (req, res) => {
  const state = buildState(req.tenantId!);
  const { workOrderId } = req.params;
  const body = req.body as {
    templateId: string;
    completedBy: string;
    signatures?: string[];
    documents?: string[];
    status?: 'pending' | 'approved' | 'rejected';
    lockoutVerified?: boolean;
  };

  if (!state.workOrders[workOrderId]) {
    state.workOrders[workOrderId] = {
      workOrderId,
      linkedTemplates: [],
      approvals: [],
      completions: [],
    };
  }

  const template = state.templates.find((tpl) => tpl.id === body.templateId);
  const completion: ChecklistCompletion = {
    id: `${Date.now()}`,
    templateId: body.templateId,
    completedBy: body.completedBy,
    completedAt: new Date().toISOString(),
    signatures: body.signatures ?? [],
    documents: body.documents ?? [],
    status: body.status ?? 'pending',
    lockoutVerified: body.lockoutVerified ?? false,
    permitType: template?.permitType,
  };

  state.workOrders[workOrderId].completions.push(completion);
  await logHistory(req, state, {
    action: 'checklist-completed',
    templateId: completion.templateId,
    workOrderId,
    notes: `Completed by ${completion.completedBy}`,
  });

  res.status(201).json({ success: true, data: completion });
});

router.post('/work-orders/:workOrderId/approvals', async (req, res) => {
  const state = buildState(req.tenantId!);
  const { workOrderId } = req.params;
  const { approver, status } = req.body as {
    approver: string;
    status: 'pending' | 'approved' | 'rejected';
  };

  if (!state.workOrders[workOrderId]) {
    state.workOrders[workOrderId] = {
      workOrderId,
      linkedTemplates: [],
      approvals: [],
      completions: [],
    };
  }

  state.workOrders[workOrderId].approvals.push({
    approver,
    status,
    at: new Date().toISOString(),
  });

  await logHistory(req, state, {
    action: 'approval-recorded',
    workOrderId,
    notes: `${approver} set status to ${status}`,
  });

  res.status(201).json({ success: true, data: state.workOrders[workOrderId] });
});

router.get('/work-orders/:workOrderId/status', (req, res) => {
  const state = buildState(req.tenantId!);
  const { workOrderId } = req.params;
  const safety = state.workOrders[workOrderId];

  if (!safety) {
    return res.json({
      success: true,
      data: {
        workOrderId,
        canStart: false,
        canClose: false,
        missing: ['No templates linked'],
      },
    });
  }

  const pendingTemplates = safety.linkedTemplates.filter(
    (templateId) => !safety.completions.some((completion) => completion.templateId === templateId),
  );

  const rejectedApprovals = safety.approvals.filter((approval) => approval.status === 'rejected');
  const hasAllApprovals = safety.approvals.length === 0 ? false : safety.approvals.every((approval) => approval.status === 'approved');

  const missing: string[] = [];
  if (pendingTemplates.length > 0) {
    missing.push('Required safety checklists are incomplete');
  }
  if (rejectedApprovals.length > 0) {
    missing.push('A safety approver rejected this work order');
  }
  if (!hasAllApprovals) {
    missing.push('Awaiting safety approvals');
  }

  const templates = state.templates.filter((tpl) => safety.linkedTemplates.includes(tpl.id));
  const lotoTemplates = templates.filter((tpl) => tpl.category === 'loto');
  const permitTemplates = templates.filter((tpl) => tpl.category === 'hot-work' || tpl.category === 'confined-space');

  if (lotoTemplates.length > 0) {
    const unverified = lotoTemplates.filter((template) =>
      !safety.completions.some((completion) => completion.templateId === template.id && completion.lockoutVerified),
    );
    if (unverified.length > 0) {
      missing.push('LOTO steps are not verified');
    }
  }

  if (permitTemplates.length > 0) {
    const permitIds = permitTemplates.map((tpl) => tpl.permitType ?? tpl.category);
    const permitCompletions = safety.completions.filter((completion) =>
      permitIds.includes(completion.permitType ?? 'general'),
    );
    if (permitCompletions.length < permitTemplates.length) {
      missing.push('Work permit templates require completion');
    }
  }

  const canStart = safety.linkedTemplates.length > 0 && missing.length === 0;
  const canClose = missing.length === 0 && safety.linkedTemplates.length > 0;

  res.json({
    success: true,
    data: {
      workOrderId,
      canStart,
      canClose,
      missing,
      summary: {
        linkedTemplates: safety.linkedTemplates,
        approvals: safety.approvals,
        completions: safety.completions,
      },
    },
  });
});

router.get('/history', (req, res) => {
  const state = buildState(req.tenantId!);
  res.json({ success: true, data: state.history.slice(0, 100) });
});

export default router;
