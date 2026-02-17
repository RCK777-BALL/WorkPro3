/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, CheckSquare, Clock, Shield } from 'lucide-react';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { createWorkflowRule, listWorkflowRules, type WorkflowRuleInput } from '@/api/workflowRules';
import { useToast } from '@/context/ToastContext';
import { getErrorMessage } from '@/lib/api';

const defaultRule: WorkflowRuleInput = {
  name: 'Default approvals',
  scope: 'work_order',
  slaResponseMinutes: 60,
  slaResolveMinutes: 240,
  approvalSteps: [{ step: 1, name: 'Supervisor review' }],
  escalations: [
    {
      trigger: 'response',
      thresholdMinutes: 15,
      channel: 'email',
      maxRetries: 3,
      retryBackoffMinutes: 30,
    },
  ],
};

const WorkflowRulesAdmin = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [draft, setDraft] = useState<WorkflowRuleInput>(defaultRule);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    listWorkflowRules()
      .then((data) => setRules(data))
      .catch((err) => addToast(`Failed to load workflow rules: ${getErrorMessage(err)}`, 'error'));
  }, [addToast]);

  const approvalLabels = useMemo(() => draft.approvalSteps?.map((step) => step.name).join(' → '), [draft.approvalSteps]);

  const saveRule = async () => {
    setSaving(true);
    try {
      const created = await createWorkflowRule({ ...draft, isDefault: true });
      setRules((prev) => [created, ...prev]);
      addToast('Workflow rule saved', 'success');
    } catch (err) {
      addToast(`Unable to save workflow rule: ${getErrorMessage(err)}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--wp-color-text-muted)]">Automation</p>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Workflow rules</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Approval steps, SLA timers, escalation paths, and templates.</p>
        </div>
        <Button variant="primary" onClick={saveRule} disabled={saving} icon={<CheckSquare className="h-4 w-4" />}>
          Save as default
        </Button>
      </div>

      <Card title="Approvals" subtitle="Define sequential approvers" icon={<Shield className="h-5 w-5 text-primary-500" />}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Rule name</label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <p className="text-xs text-[var(--wp-color-text-muted)]">Shown in audit logs and comments.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Scope</label>
            <select
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              value={draft.scope}
              onChange={(event) => setDraft((prev) => ({ ...prev, scope: event.target.value as WorkflowRuleInput['scope'] }))}
            >
              <option value="work_order">Work orders</option>
              <option value="work_request">Work requests</option>
            </select>
          </div>
        </div>
        <div className="mt-3 rounded-md bg-[var(--wp-color-surface)] p-3 text-sm text-[var(--wp-color-text)] dark:bg-[var(--wp-color-surface-elevated)] dark:text-[var(--wp-color-text)]">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary-600 dark:text-primary-300">
            <ArrowUpCircle className="h-4 w-4" />
            Approval path
          </div>
          <p className="mt-1 text-sm">{approvalLabels || 'No approvers configured yet'}</p>
        </div>
      </Card>

      <Card title="SLA timers" subtitle="Response and completion targets" icon={<Clock className="h-5 w-5 text-amber-500" />}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Response minutes</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              value={draft.slaResponseMinutes ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, slaResponseMinutes: Number(event.target.value) || undefined }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Resolve minutes</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              value={draft.slaResolveMinutes ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, slaResolveMinutes: Number(event.target.value) || undefined }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Backoff (minutes)</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              value={draft.escalations?.[0]?.retryBackoffMinutes ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  escalations: [
                    {
                      ...(prev.escalations?.[0] ?? { trigger: 'response' as const }),
                      retryBackoffMinutes: Number(event.target.value) || undefined,
                    },
                  ],
                }))
              }
            />
          </div>
        </div>
        <div className="mt-3 text-sm text-[var(--wp-color-text-muted)]">
          Escalations will respect retry limits and notify via the selected channel.
        </div>
      </Card>

      <Card
        title="Notification templates"
        subtitle="Email and SMS content"
        icon={<ArrowUpCircle className="h-5 w-5 text-indigo-500" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Email subject</label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              value={draft.templates?.emailSubject ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  templates: { ...(prev.templates ?? {}), emailSubject: event.target.value },
                }))
              }
              placeholder="SLA breached for {{title}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">SMS body</label>
            <input
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              value={draft.templates?.smsBody ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  templates: { ...(prev.templates ?? {}), smsBody: event.target.value },
                }))
              }
              placeholder="{{title}} needs attention"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">Email body</label>
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
              rows={4}
              value={draft.templates?.emailBody ?? ''}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  templates: { ...(prev.templates ?? {}), emailBody: event.target.value },
                }))
              }
              placeholder="Hello {{assignee}}, {{title}} breached SLA."
            />
          </div>
        </div>
      </Card>

      <Card title="Existing rules" subtitle="Overrides are sorted by recency" icon={<ArrowUpCircle className="h-5 w-5" />}>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule._id}
              className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)]/60 p-3 text-sm dark:border-[var(--wp-color-border)] dark:bg-[var(--wp-color-surface-elevated)]"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[var(--wp-color-text)] dark:text-[var(--wp-color-text)]">{rule.name}</div>
                <span className="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
                  {rule.scope === 'work_order' ? 'Work order' : 'Request'}
                </span>
              </div>
              <div className="mt-2 text-[var(--wp-color-text-muted)] dark:text-[var(--wp-color-text-muted)]">
                Approvals: {(rule.approvalSteps || []).map((step: any) => step.name).join(', ') || 'None'}
              </div>
              <div className="mt-1 text-xs text-[var(--wp-color-text-muted)]">
                SLA response {rule.slaResponseMinutes || '—'}m · resolve {rule.slaResolveMinutes || '—'}m · escalations{' '}
                {(rule.escalations || []).length}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default WorkflowRulesAdmin;


