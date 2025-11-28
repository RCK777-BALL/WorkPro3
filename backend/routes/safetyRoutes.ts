/*
 * SPDX-License-Identifier: MIT
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import tenantScope from '../middleware/tenantScope';

interface SafetyTemplate {
  id: string;
  name: string;
  siteId?: string | undefined;
  version: number;
  retentionDays?: number | undefined;
  checklists: string[];
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
  signatures: string[];
  documents: string[];
  status: 'pending' | 'approved' | 'rejected';
}

interface WorkOrderSafetyState {
  workOrderId: string;
  linkedTemplates: string[];
  approvals: Array<{ approver: string; status: 'pending' | 'approved' | 'rejected'; at: string }>;
  completions: ChecklistCompletion[];
}

interface SafetyState {
  templates: SafetyTemplate[];
  inspections: InspectionSchedule[];
  workOrders: Record<string, WorkOrderSafetyState>;
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
    });
  }
  return tenantSafetyState.get(tenantId)!;
};

router.get('/templates', (req, res) => {
  const state = buildState(req.tenantId!);
  const { siteId } = req.query;
  const filtered = siteId
    ? state.templates.filter((template) => template.siteId === siteId)
    : state.templates;

  res.json({
    success: true,
    data: filtered,
  });
});

router.post('/templates', (req, res) => {
  const state = buildState(req.tenantId!);
  const now = new Date().toISOString();
  const {
    name,
    siteId,
    retentionDays,
    checklists = [],
  }: { name: string; siteId?: string; retentionDays?: number; checklists?: string[] } = req.body || {};

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
    version: latestVersion + 1,
    createdAt: now,
    updatedAt: now,
  };

  state.templates.push(template);

  res.status(201).json({
    success: true,
    data: template,
  });
});

router.post('/templates/:templateId/schedule', (req, res) => {
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

  res.status(201).json({
    success: true,
    data: schedule,
  });
});

router.get('/inspections', (req, res) => {
  const state = buildState(req.tenantId!);
  const { status, siteId } = req.query;

  const filtered = state.inspections.filter((inspection) => {
    const matchesStatus = status ? inspection.status === status : true;
    const matchesSite = siteId ? inspection.siteId === siteId : true;
    return matchesSite && matchesStatus;
  });

  res.json({ success: true, data: filtered });
});

router.post('/inspections/:inspectionId/complete', (req, res) => {
  const state = buildState(req.tenantId!);
  const { inspectionId } = req.params;
  const inspection = state.inspections.find((item) => item.id === inspectionId);

  if (!inspection) {
    return res.status(404).json({ success: false, message: 'Inspection not found.' });
  }

  inspection.status = 'completed';

  res.json({ success: true, data: inspection });
});

router.post('/work-orders/:workOrderId/link-template', (req, res) => {
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

  res.json({
    success: true,
    data: state.workOrders[workOrderId],
  });
});

router.post('/work-orders/:workOrderId/completions', (req, res) => {
  const state = buildState(req.tenantId!);
  const { workOrderId } = req.params;
  const body = req.body as {
    templateId: string;
    completedBy: string;
    signatures?: string[];
    documents?: string[];
    status?: 'pending' | 'approved' | 'rejected';
  };

  if (!state.workOrders[workOrderId]) {
    state.workOrders[workOrderId] = {
      workOrderId,
      linkedTemplates: [],
      approvals: [],
      completions: [],
    };
  }

  const completion: ChecklistCompletion = {
    id: `${Date.now()}`,
    templateId: body.templateId,
    completedBy: body.completedBy,
    completedAt: new Date().toISOString(),
    signatures: body.signatures ?? [],
    documents: body.documents ?? [],
    status: body.status ?? 'pending',
  };

  state.workOrders[workOrderId].completions.push(completion);

  res.status(201).json({ success: true, data: completion });
});

router.post('/work-orders/:workOrderId/approvals', (req, res) => {
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
  const hasPendingApprovals = safety.approvals.every((approval) => approval.status === 'approved');

  const missing: string[] = [];
  if (pendingTemplates.length > 0) {
    missing.push('Required safety checklists are incomplete');
  }
  if (rejectedApprovals.length > 0) {
    missing.push('A safety approver rejected this work order');
  }
  if (!hasPendingApprovals) {
    missing.push('Awaiting safety approvals');
  }

  const canStart = safety.linkedTemplates.length > 0;
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

export default router;
