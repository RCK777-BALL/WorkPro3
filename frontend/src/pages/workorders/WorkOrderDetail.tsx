/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import http from '@/lib/http';
import type { WorkOrder, WorkOrderChecklistItem } from '@/types';
import CommentThread from '@/components/comments/CommentThread';
import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import ConflictResolver from '@/components/offline/ConflictResolver';
import WorkOrderQueuePanel from '@/components/offline/WorkOrderQueuePanel';
import ChecklistExecutionPanel from '@/workorders/ChecklistExecutionPanel';
import { usePartsQuery, useStockItemsQuery } from '@/features/inventory';
import { useToast } from '@/context/ToastContext';
import { useAuthStore } from '@/store/authStore';
import { useSyncStore } from '@/store/syncStore';

interface WorkOrderResponse extends Partial<WorkOrder> {
  _id?: string;
  id?: string;
}

const createClientId = () => {
  const globalCrypto = globalThis.crypto;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeChecklistFromApi = (items: unknown): WorkOrderChecklistItem[] => {
  if (!Array.isArray(items)) return [];

  return (items as Array<Record<string, unknown>>).map((item, index) => {
    const fallbackText = item.description ?? item.text;
    const id =
      (item.id as string | undefined)
      ?? (item._id as string | undefined)
      ?? (typeof fallbackText === 'string' ? `${fallbackText}-${index}` : undefined)
      ?? createClientId();

    const completedValue =
      (item.completedValue as string | number | boolean | undefined)
      ?? (item.done as boolean | undefined);

    return {
      id,
      text: (item.text as string | undefined) ?? (item.description as string | undefined) ?? 'Checklist item',
      type: (item.type as WorkOrderChecklistItem['type']) ?? 'checkbox',
      required: Boolean(item.required),
      evidenceRequired: Boolean(item.evidenceRequired),
      evidence: (item.evidence as string[] | undefined) ?? (item.photos as string[] | undefined),
      photos: item.photos as string[] | undefined,
      completedValue,
      completedAt: (item.completedAt as string | undefined) ?? (item.completed_at as string | undefined),
      completedBy: item.completedBy as string | undefined,
      status: (item.status as WorkOrderChecklistItem['status'])
        ?? (completedValue !== undefined ? 'done' : 'not_started'),
      done: Boolean(item.done ?? (completedValue !== undefined)),
    } satisfies WorkOrderChecklistItem;
  });
};

const normalizeWorkOrder = (data: WorkOrderResponse): WorkOrder | null => {
  const id = data._id ?? data.id;
  if (!id) return null;
  const normalized: WorkOrder = {
    id,
    title: data.title ?? 'Work Order',
    status: data.status ?? 'requested',
    priority: data.priority ?? 'medium',
    type: data.type ?? 'corrective',
    description: data.description,
    assetId: data.assetId,
    asset: data.asset,
    department: data.department ?? '',
    workOrderTemplateId: data.workOrderTemplateId,
    templateVersion: data.templateVersion,
    complianceStatus: data.complianceStatus,
    complianceCompletedAt: data.complianceCompletedAt,
    permits: data.permits,
    requiredPermitTypes: data.requiredPermitTypes,
    permitRequirements: data.permitRequirements,
    permitApprovals: data.permitApprovals,
    approvalStatus: data.approvalStatus,
    approvalState: data.approvalState,
    approvalStates: data.approvalStates,
    approvalSteps: data.approvalSteps,
    currentApprovalStep: data.currentApprovalStep,
    approvedBy: data.approvedBy,
    approvedAt: data.approvedAt,
    requestedBy: data.requestedBy,
    requestedAt: data.requestedAt,
    slaDueAt: data.slaDueAt,
    slaResponseDueAt: data.slaResponseDueAt,
    slaResolveDueAt: data.slaResolveDueAt,
    slaRespondedAt: data.slaRespondedAt,
    slaResolvedAt: data.slaResolvedAt,
    slaBreachAt: data.slaBreachAt,
    slaTargets: data.slaTargets,
    slaEscalations: data.slaEscalations,
  } as WorkOrder;

  if (data.checklistHistory) {
    normalized.checklistHistory = data.checklistHistory;
  }
  if (data.checklistCompliance) {
    normalized.checklistCompliance = data.checklistCompliance;
  }

  return normalized;
};

const WorkOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const conflict = useSyncStore((state) => state.conflict ?? null);
  const setConflict = useSyncStore((state) => state.setConflict);

  const partsQuery = usePartsQuery({ pageSize: 50 });
  const stockQuery = useStockItemsQuery();
  const [checklist, setChecklist] = useState<WorkOrderChecklistItem[]>([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  const [partLines, setPartLines] = useState<
    Array<{ partId: string; reserved: number; issued: number; name: string }>
  >([]);
  const [actionModal, setActionModal] = useState<
    { type: 'reserve' | 'issue' | 'return' | 'unreserve'; partId: string; quantity: number } | null
  >(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalReasonCode, setApprovalReasonCode] = useState('operational');
  const [approverSignature, setApproverSignature] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const hasPartsError = Boolean(partsQuery.error);

  const checklistHistory = workOrder?.checklistHistory ?? [];

  const resolveConflict = async (choice: 'local' | 'server') => {
    if (!conflict) return;
    if (choice === 'local') {
      const payload = {
        ...(conflict.local as Record<string, unknown>),
        clientUpdatedAt: new Date().toISOString(),
      };
      await http({
        method: conflict.method,
        url: conflict.url,
        data: payload,
      });
    }
    setConflict(null);
  };

  const checklistCompliance = useMemo(() => {
    if (workOrder?.checklistCompliance) return workOrder.checklistCompliance;

    const totalChecks = checklistHistory.length;
    const passedChecks = checklistHistory.filter((entry) => entry.passed).length;
    const passRate = totalChecks ? Number(((passedChecks / totalChecks) * 100).toFixed(1)) : 0;
    const status = totalChecks ? (passRate >= 90 ? 'compliant' : passRate >= 70 ? 'at_risk' : 'failing') : 'unknown';

    return { totalChecks, passedChecks, passRate, status };
  }, [checklistHistory, workOrder?.checklistCompliance]);

  const userRoles = useMemo(() => {
    const roles = new Set<string>();
    if (user?.role) roles.add(user.role);
    (user?.roles ?? []).forEach((role) => roles.add(role));
    return roles;
  }, [user?.role, user?.roles]);

  const canApprove = useMemo(() => {
    const approvalRoles = new Set([
      'global_admin',
      'plant_admin',
      'general_manager',
      'assistant_general_manager',
      'operations_manager',
      'assistant_department_leader',
      'workorder_supervisor',
      'site_supervisor',
      'department_leader',
      'manager',
      'supervisor',
      'planner',
    ]);
    return Array.from(userRoles).some((role) => approvalRoles.has(role));
  }, [userRoles]);

  const submitApproval = async (status: 'pending' | 'approved' | 'rejected') => {
    if (!id) return;
    if (status !== 'pending' && approverSignature.trim().length < 3) {
      addToast('Approver signature name is required.', 'error');
      return;
    }
    if (status === 'rejected' && approvalReasonCode.trim().length === 0) {
      addToast('Reason code is required for rejection.', 'error');
      return;
    }
    setApprovalSubmitting(true);
    try {
      const composedNote = [
        approvalReasonCode ? `Reason: ${approvalReasonCode}` : '',
        approverSignature ? `Signed by: ${approverSignature}` : '',
        approvalNote.trim(),
      ]
        .filter(Boolean)
        .join(' | ');
      const res = await http.post<WorkOrderResponse>(`/workorders/${id}/approve`, {
        status,
        ...(composedNote ? { note: composedNote } : {}),
      });
      const normalized = normalizeWorkOrder(res.data);
      if (normalized) {
        setWorkOrder(normalized);
      }
      setApprovalNote('');
      setApproverSignature('');
      addToast(`Approval ${status === 'pending' ? 'requested' : status}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Unable to update approval status.', 'error');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '—');

  const slaSnapshot = useMemo(() => {
    if (!workOrder) return null;
    const now = new Date();
    const responseDue = workOrder.slaResponseDueAt ?? workOrder.slaTargets?.responseDueAt;
    const resolveDue = workOrder.slaResolveDueAt ?? workOrder.slaTargets?.resolveDueAt;

    const buildState = (due?: string, completed?: string) => {
      if (completed) return { label: 'Met', color: 'green' as const };
      if (due && new Date(due).getTime() < now.getTime()) {
        return { label: 'Breached', color: 'red' as const };
      }
      if (due) return { label: 'Due', color: 'amber' as const };
      return { label: 'Not set', color: undefined };
    };

    return {
      responseDue,
      resolveDue,
      responseState: buildState(responseDue, workOrder.slaRespondedAt),
      resolveState: buildState(resolveDue, workOrder.slaResolvedAt),
    };
  }, [workOrder]);

  const formatReading = (value: unknown) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await http.get<WorkOrderResponse>(`/workorders/${id}`);
        const normalized = normalizeWorkOrder(res.data);
        setWorkOrder(normalized);
        setChecklist(normalized?.checklist ?? []);
        setChecklistError(null);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Unable to load work order details.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const availableStock = (partId: string) =>
    (stockQuery.data ?? []).filter((item) => item.partId === partId).reduce((sum, item) => sum + item.quantity, 0);

  const openAction = (type: 'reserve' | 'issue' | 'return' | 'unreserve', partId: string) => {
    setActionModal({ type, partId, quantity: 1 });
  };

  const applyAction = () => {
    if (!actionModal) return;
    const { partId, type, quantity } = actionModal;
    const line = partLines.find((entry) => entry.partId === partId) ?? {
      partId,
      reserved: 0,
      issued: 0,
      name: partsQuery.data?.items.find((p) => p.id === partId)?.name ?? partId,
    };
    const stock = availableStock(partId);
    const updated = { ...line };

    if (quantity <= 0) {
      addToast('Quantity must be greater than zero', 'error');
      return;
    }

    if (type === 'reserve') {
      const availableForReserve = stock - (line.reserved + line.issued);
      if (quantity > availableForReserve) {
        addToast('Cannot reserve more than available stock', 'error');
        return;
      }
      updated.reserved += quantity;
    }

    if (type === 'issue') {
      const availableToIssue = stock - line.issued;
      if (quantity > availableToIssue) {
        addToast('Cannot issue more than available stock', 'error');
        return;
      }
      updated.issued += quantity;
      updated.reserved = Math.max(0, updated.reserved - quantity);
    }

    if (type === 'return') {
      updated.issued = Math.max(0, updated.issued - quantity);
    }

    if (type === 'unreserve') {
      updated.reserved = Math.max(0, updated.reserved - quantity);
    }

    setPartLines((prev) => {
      const without = prev.filter((entry) => entry.partId !== partId);
      return [...without, updated];
    });
    setActionModal(null);
  };

  const isValueProvided = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    return typeof value === 'boolean' ? value : true;
  };

  const updateChecklistValue = (itemId: string, value: string | number | boolean | undefined) => {
    const now = new Date().toISOString();
    setChecklist((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const hasValue = isValueProvided(value);
        return {
          ...item,
          completedValue: value,
          status: hasValue ? 'done' : 'not_started',
          done: hasValue,
          completedAt: hasValue ? now : undefined,
          completedBy: hasValue ? item.completedBy ?? user?.id : item.completedBy,
        };
      }),
    );
  };

  const addEvidence = (itemId: string) => {
    const draft = evidenceDrafts[itemId]?.trim();
    if (!draft) return;
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, evidence: [...(item.evidence ?? []), draft], completedBy: item.completedBy ?? user?.id }
          : item,
      ),
    );
    setEvidenceDrafts((prev) => ({ ...prev, [itemId]: '' }));
  };

  const removeEvidence = (itemId: string, evidence: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, evidence: (item.evidence ?? []).filter((ref) => ref !== evidence) }
          : item,
      ),
    );
  };

  const persistChecklist = async () => {
    if (!id || !checklist.length) return;
    setChecklistSaving(true);
    try {
      const payload = checklist.map((item) => ({
        id: item.id ?? createClientId(),
        description: item.text,
        type: item.type ?? 'checkbox',
        required: item.required,
        evidenceRequired: item.evidenceRequired,
        completedValue: item.completedValue,
        status: item.status,
        done: item.done,
        evidence: item.evidence,
        photos: item.photos,
        completedAt: item.completedAt,
        completedBy: item.completedBy,
      }));

      const res = await http.put<WorkOrderResponse>(`/workorders/${id}/checklist`, { checklist: payload });
      const normalized = normalizeWorkOrder(res.data);
      if (normalized) {
        setWorkOrder(normalized);
        setChecklist(normalized.checklist ?? []);
      }
      setChecklistError(null);
      addToast('Checklist updated', 'success');
    } catch (err) {
      console.error(err);
      setChecklistError('Unable to save checklist updates.');
    } finally {
      setChecklistSaving(false);
    }
  };

  const header = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-[var(--wp-color-text-muted)]">Loading work order...</p>;
    }
    if (error) {
      return <p className="text-sm text-rose-500">{error}</p>;
    }
    if (!workOrder) {
      return <p className="text-sm text-[var(--wp-color-text-muted)]">No work order found.</p>;
    }
    return null;
  }, [loading, error, workOrder]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--wp-color-primary)]">Work order</p>
          <h1 className="text-3xl font-bold text-[var(--wp-color-text)]">{workOrder?.title ?? 'Work order details'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <Badge
              text={workOrder?.status ?? 'unknown'}
              color={clsx(
                workOrder?.status === 'completed' ? 'green' : undefined,
                workOrder?.status === 'in_progress' ? 'blue' : undefined,
              )}
            />
            <Badge text={workOrder?.priority ?? 'medium'} />
            {workOrder?.assetId && (
              <Link className="text-[var(--wp-color-primary)] hover:text-[var(--wp-color-primary)]" to={`/assets/${workOrder.assetId}`}>
                View asset
              </Link>
            )}
          </div>
          {header}
        </div>
        <Link
          to="/workorders"
          className="rounded-full border border-[var(--wp-color-border)] px-4 py-2 text-sm font-medium text-[var(--wp-color-text)] hover:bg-[var(--wp-color-surface-elevated)]"
        >
          Back to list
        </Link>
      </div>

      <WorkOrderQueuePanel workOrderId={id} />

      {workOrder && (
        <div className="rounded-3xl border border-[var(--wp-color-border)]/80 bg-[color-mix(in_srgb,var(--wp-color-background)_70%,transparent)] p-4 text-[var(--wp-color-text)] sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--wp-color-text)]">Summary</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--wp-color-text)]">
            {workOrder.description ?? 'No description provided.'}
          </p>
        </div>
      )}

      {workOrder && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <Card.Header>
              <Card.Title>Template & compliance</Card.Title>
              <Card.Description>Trace the preventive template used for this work order.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--wp-color-text-muted)]">Compliance</span>
                <Badge
                  text={workOrder.complianceStatus ?? 'not_required'}
                  color={
                    workOrder.complianceStatus === 'complete'
                      ? 'green'
                      : workOrder.complianceStatus === 'pending'
                        ? 'blue'
                        : undefined
                  }
                />
              </div>
              {workOrder.complianceCompletedAt && (
                <p className="text-xs text-[var(--wp-color-text-muted)]">
                  Completed at {new Date(workOrder.complianceCompletedAt).toLocaleString()}
                </p>
              )}
              <div className="text-sm text-[var(--wp-color-text-muted)]">
                <p className="font-medium text-[var(--wp-color-text)]">Template</p>
                {workOrder.workOrderTemplateId ? (
                  <p className="text-xs text-[var(--wp-color-text-muted)]">
                    {workOrder.workOrderTemplateId}
                    {workOrder.templateVersion ? ` · v${workOrder.templateVersion}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--wp-color-text-muted)]">No template linked</p>
                )}
              </div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>SLA tracking</Card.Title>
              <Card.Description>Monitor response and resolution targets.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--wp-color-text)]">Response</p>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">Due {formatDateTime(slaSnapshot?.responseDue)}</p>
                  {workOrder.slaTargets?.responseMinutes && (
                    <p className="text-xs text-[var(--wp-color-text-muted)]">
                      Target {workOrder.slaTargets.responseMinutes} minutes
                    </p>
                  )}
                </div>
                <Badge text={slaSnapshot?.responseState.label ?? 'Not set'} color={slaSnapshot?.responseState.color} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--wp-color-text)]">Resolution</p>
                  <p className="text-xs text-[var(--wp-color-text-muted)]">Due {formatDateTime(slaSnapshot?.resolveDue)}</p>
                  {workOrder.slaTargets?.resolveMinutes && (
                    <p className="text-xs text-[var(--wp-color-text-muted)]">
                      Target {workOrder.slaTargets.resolveMinutes} minutes
                    </p>
                  )}
                </div>
                <Badge text={slaSnapshot?.resolveState.label ?? 'Not set'} color={slaSnapshot?.resolveState.color} />
              </div>
              {workOrder.slaBreachAt && (
                <p className="text-xs text-rose-400">Breached at {formatDateTime(workOrder.slaBreachAt)}</p>
              )}
            </Card.Content>
          </Card>
          <Card>
            <Card.Header>
              <Card.Title>Approvals</Card.Title>
              <Card.Description>Track approvals and permit requirements.</Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--wp-color-text-muted)]">Approval status</span>
                <Badge text={workOrder.approvalStatus ?? 'draft'} />
              </div>
              {workOrder.currentApprovalStep && (
                <p className="text-xs text-[var(--wp-color-text-muted)]">Step {workOrder.currentApprovalStep}</p>
              )}
              {workOrder.approvalSteps?.length ? (
                <ul className="space-y-2 text-xs text-[var(--wp-color-text-muted)]">
                  {workOrder.approvalSteps.map((step) => (
                    <li key={`${step.step}-${step.name}`} className="flex items-center justify-between">
                      <span>
                        {step.step}. {step.name}
                      </span>
                      <Badge text={step.status ?? 'pending'} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--wp-color-text-muted)]">No approval steps configured.</p>
              )}
              {(workOrder.permitRequirements?.length || workOrder.requiredPermitTypes?.length) && (
                <div className="rounded-xl border border-[var(--wp-color-border)]/60 bg-[color-mix(in_srgb,var(--wp-color-surface)_60%,transparent)] p-3 text-xs text-[var(--wp-color-text-muted)]">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--wp-color-text-muted)]">
                    Permit requirements
                  </p>
                  <ul className="space-y-1">
                    {(workOrder.permitRequirements ?? []).map((permit) => (
                      <li key={permit.type} className="flex items-center justify-between">
                        <span>{permit.type}</span>
                        <Badge text={permit.status ?? 'pending'} />
                      </li>
                    ))}
                    {(workOrder.permitRequirements?.length ?? 0) === 0 &&
                      (workOrder.requiredPermitTypes ?? []).map((type) => (
                        <li key={type} className="flex items-center justify-between">
                          <span>{type}</span>
                          <Badge text="Required" />
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--wp-color-text-muted)]">Reason code</label>
                  <select
                    className="w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] px-3 py-2 text-sm text-[var(--wp-color-text)]"
                    value={approvalReasonCode}
                    onChange={(event) => setApprovalReasonCode(event.target.value)}
                  >
                    <option value="operational">Operational</option>
                    <option value="safety">Safety</option>
                    <option value="quality">Quality</option>
                    <option value="compliance">Compliance</option>
                    <option value="budget">Budget</option>
                  </select>
                </div>
                <Input
                  label="Approver signature (full name)"
                  value={approverSignature}
                  onChange={(event) => setApproverSignature(event.target.value)}
                />
                <Input
                  label="Approval note"
                  value={approvalNote}
                  onChange={(event) => setApprovalNote(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {workOrder.approvalStatus !== 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={approvalSubmitting}
                      onClick={() => submitApproval('pending')}
                    >
                      Request approval
                    </Button>
                  )}
                  {workOrder.approvalStatus === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        disabled={!canApprove || approvalSubmitting}
                        onClick={() => submitApproval('approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canApprove || approvalSubmitting}
                        onClick={() => submitApproval('rejected')}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {!canApprove && workOrder.approvalStatus === 'pending' && (
                    <span className="text-xs text-[var(--wp-color-text-muted)]">Role required to approve.</span>
                  )}
                </div>
              </div>
            </Card.Content>
          </Card>
        </div>
      )}

      <ChecklistExecutionPanel
        checklist={checklist}
        checklistSaving={checklistSaving}
        checklistError={checklistError}
        evidenceDrafts={evidenceDrafts}
        userId={user?.id}
        onSave={persistChecklist}
        onUpdateValue={updateChecklistValue}
        onUpdateDraft={(itemId, value) =>
          setEvidenceDrafts((prev) => ({ ...prev, [itemId]: value }))
        }
        onAddEvidence={addEvidence}
        onRemoveEvidence={removeEvidence}
        createClientId={createClientId}
        isValueProvided={isValueProvided}
      />

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Checklist history</Card.Title>
              <Card.Description>Review per-item readings, evidence, and compliance status.</Card.Description>
            </div>
            <Badge
              text={
                checklistCompliance.status === 'unknown'
                  ? 'No data'
                  : checklistCompliance.status === 'compliant'
                    ? 'Compliant'
                    : checklistCompliance.status === 'at_risk'
                      ? 'At risk'
                      : 'Failing'
              }
              color={
                checklistCompliance.status === 'compliant'
                  ? 'green'
                  : checklistCompliance.status === 'at_risk'
                    ? 'amber'
                    : checklistCompliance.status === 'failing'
                      ? 'red'
                      : undefined
              }
            />
          </div>
        </Card.Header>
        <Card.Content>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Checks logged</p>
              <p className="text-2xl font-semibold text-[var(--wp-color-text)]">{checklistCompliance.totalChecks}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Passed</p>
              <p className="text-2xl font-semibold text-[var(--wp-color-text)]">{checklistCompliance.passedChecks}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Pass rate</p>
              <p className="text-2xl font-semibold text-[var(--wp-color-text)]">{checklistCompliance.passRate}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Last recorded</p>
              <p className="text-2xl font-semibold text-[var(--wp-color-text)]">
                {checklistHistory[0]?.recordedAt
                  ? new Date(checklistHistory[0].recordedAt).toLocaleString()
                  : '—'}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-800/60 text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Item</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Reading</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Evidence</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Recorded at</th>
                  <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {checklistHistory.map((entry, index) => (
                  <tr key={`${entry.checklistItemId}-${index}`}>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">{entry.checklistItemLabel ?? entry.checklistItemId}</td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">{formatReading(entry.reading)}</td>
                    <td className="px-3 py-2">
                      <Badge
                        text={entry.passed === undefined ? 'N/A' : entry.passed ? 'Pass' : 'Fail'}
                        color={entry.passed === undefined ? undefined : entry.passed ? 'green' : 'red'}
                      />
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">
                      {entry.evidenceUrls?.length ? (
                        <ul className="space-y-1">
                          {entry.evidenceUrls.map((url) => (
                            <li key={url}>
                              <a className="text-[var(--wp-color-primary)] hover:text-[var(--wp-color-primary)]" href={url} target="_blank" rel="noreferrer">
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[var(--wp-color-text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">
                      {entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--wp-color-text)]">{entry.recordedBy ?? '—'}</td>
                  </tr>
                ))}
                {!checklistHistory.length && (
                  <tr>
                    <td className="px-3 py-4 text-center text-[var(--wp-color-text-muted)]" colSpan={6}>
                      No checklist activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div>
              <Card.Title>Parts</Card.Title>
              <Card.Description>Reserve, issue, and track quantities against available stock.</Card.Description>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const firstPart = partsQuery.data?.items[0];
                if (firstPart) openAction('reserve', firstPart.id);
              }}
            >
              Add part
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {partsQuery.isLoading && <p className="text-sm text-[var(--wp-color-text-muted)]">Loading parts…</p>}
          {hasPartsError && <p className="text-sm text-rose-500">Unable to load parts.</p>}
          {!partsQuery.isLoading && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-800/50 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Part</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Reserved</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Issued</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Available</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--wp-color-text)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {partLines.map((line) => (
                    <tr key={line.partId}>
                      <td className="px-3 py-2 text-[var(--wp-color-text)]">{line.name}</td>
                      <td className="px-3 py-2 text-[var(--wp-color-text)]">{line.reserved}</td>
                      <td className="px-3 py-2 text-[var(--wp-color-text)]">{line.issued}</td>
                      <td className="px-3 py-2 text-[var(--wp-color-text)]">{availableStock(line.partId)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openAction('reserve', line.partId)}>
                            Reserve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openAction('issue', line.partId)}>
                            Issue
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openAction('return', line.partId)}>
                            Return
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openAction('unreserve', line.partId)}>
                            Unreserve
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!partLines.length && (
                    <tr>
                      <td className="px-3 py-4 text-center text-[var(--wp-color-text-muted)]" colSpan={5}>
                        No parts reserved yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card.Content>
      </Card>

      <Modal
        isOpen={Boolean(actionModal)}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.type ?? ''} part`}
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-[var(--wp-color-text)]">Part</label>
          <select
            className="w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm"
            value={actionModal?.partId ?? ''}
            onChange={(event) =>
              setActionModal((prev) => (prev ? { ...prev, partId: event.target.value } : prev))
            }
          >
            {partsQuery.data?.items.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name}
              </option>
            ))}
          </select>
          <Input
            type="number"
            label="Quantity"
            min={1}
            value={actionModal?.quantity ?? 1}
            onChange={(event) =>
              setActionModal((prev) => (prev ? { ...prev, quantity: Number(event.target.value) } : prev))
            }
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setActionModal(null)}>
              Cancel
            </Button>
            <Button onClick={applyAction}>Apply</Button>
          </div>
        </div>
      </Modal>

      {id ? (
        <CommentThread entityType="WO" entityId={id} />
      ) : (
        <p className="text-sm text-[var(--wp-color-text-muted)]">Work order id required to load comments.</p>
      )}
      <ConflictResolver
        conflict={conflict}
        onResolve={resolveConflict}
        onClose={() => setConflict(null)}
      />
    </div>
  );
};

export default WorkOrderDetail;

