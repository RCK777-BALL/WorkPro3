/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import Input from '@/components/common/Input';
import { SectionHeader } from '@/components/ui';
import http from '@/lib/http';
import { useToast } from '@/context/ToastContext';
import { useScopeContext } from '@/context/ScopeContext';
import { usePermissions } from '@/auth/usePermissions';

type AssetOption = {
  id: string;
  name: string;
  tenantId?: string;
  siteId?: string;
};

type ConditionRule = {
  _id?: string;
  id?: string;
  asset: string;
  metric: string;
  operator?: '>' | '<' | '>=' | '<=' | '==';
  threshold: number;
  workOrderTitle: string;
  workOrderDescription?: string;
  active?: boolean;
  tenantId?: string;
  siteId?: string;
};

export default function ConditionAutomation() {
  const { addToast } = useToast();
  const { activeTenant, activePlant } = useScopeContext();
  const { canAny } = usePermissions();
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [rules, setRules] = useState<ConditionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({
    asset: '',
    metric: 'temperature',
    operator: '>' as '>' | '<' | '>=' | '<=' | '==',
    threshold: '80',
    workOrderTitle: '',
    workOrderDescription: '',
    active: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const scopeParams = {
        ...(activeTenant?.id ? { tenantId: activeTenant.id } : {}),
        ...(activePlant?.id ? { siteId: activePlant.id } : {}),
      };
      const [assetRes, rulesRes] = await Promise.all([
        http.get('/assets', { params: scopeParams }),
        http.get('/condition-rules', { params: scopeParams }),
      ]);
      const assetRows = (assetRes.data?.data ?? assetRes.data ?? []) as Array<{
        _id?: string;
        id?: string;
        name: string;
        tenantId?: string;
        siteId?: string;
      }>;
      const rulesRows = (rulesRes.data?.data ?? rulesRes.data ?? []) as ConditionRule[];
      setAssets(
        assetRows
          .map((item) => ({
            id: item._id ?? item.id ?? '',
            name: item.name,
            tenantId: item.tenantId,
            siteId: item.siteId,
          }))
          .filter(
            (item) =>
              (!activeTenant?.id || !item.tenantId || item.tenantId === activeTenant.id) &&
              (!activePlant?.id || !item.siteId || item.siteId === activePlant.id),
          )
          .filter((item) => item.id && item.name),
      );
      const scopedRules = Array.isArray(rulesRows)
        ? rulesRows.filter(
            (rule) =>
              (!activeTenant?.id || !rule.tenantId || rule.tenantId === activeTenant.id) &&
              (!activePlant?.id || !rule.siteId || rule.siteId === activePlant.id),
          )
        : [];
      setRules(scopedRules);
    } catch (error) {
      console.error(error);
      addToast('Failed to load automation builder.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activePlant?.id, activeTenant?.id, addToast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const createRule = async () => {
    if (!canAny([['integrations', 'manage'], ['pm', 'write']])) {
      addToast('You do not have permission to create condition rules.', 'error');
      return;
    }
    if (!draft.asset || !draft.metric || !draft.workOrderTitle || !draft.threshold) {
      addToast('Asset, metric, threshold, and work order title are required.', 'error');
      return;
    }
    try {
      await http.post('/condition-rules', {
        asset: draft.asset,
        metric: draft.metric,
        operator: draft.operator,
        threshold: Number(draft.threshold),
        workOrderTitle: draft.workOrderTitle,
        workOrderDescription: draft.workOrderDescription,
        active: draft.active,
        ...(activeTenant?.id ? { tenantId: activeTenant.id } : {}),
        ...(activePlant?.id ? { siteId: activePlant.id } : {}),
      });
      addToast('Condition rule created.', 'success');
      setDraft((prev) => ({ ...prev, threshold: '80', workOrderTitle: '', workOrderDescription: '' }));
      await fetchData();
    } catch (error) {
      console.error(error);
      addToast('Unable to create condition rule.', 'error');
    }
  };

  const deleteRule = async (id: string) => {
    if (!canAny([['integrations', 'manage'], ['pm', 'write']])) {
      addToast('You do not have permission to delete condition rules.', 'error');
      return;
    }
    try {
      await http.delete(`/condition-rules/${id}`);
      addToast('Condition rule deleted.', 'success');
      await fetchData();
    } catch (error) {
      console.error(error);
      addToast('Unable to delete condition rule.', 'error');
    }
  };

  const canManageRules = canAny([['integrations', 'manage'], ['pm', 'write']]);

  return (
    <div className="space-y-6 text-[var(--wp-color-text)]">
      <SectionHeader
        title="Condition Automation Builder"
        subtitle="No-code rules to create work orders from meter and IoT conditions."
      />
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Tenant: {activeTenant?.name ?? 'All tenants'}
        </span>
        <span className="rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-2 py-1">
          Site: {activePlant?.name ?? 'All sites'}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr,2fr]">
        <Card>
          <Card.Header>
            <Card.Title>New Rule</Card.Title>
            <Card.Description>Define trigger and auto-created work order payload.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Asset</label>
              <select
                className="w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2 text-sm"
                value={draft.asset}
                onChange={(event) => setDraft((prev) => ({ ...prev, asset: event.target.value }))}
              >
                <option value="">Select asset</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Metric"
              value={draft.metric}
              onChange={(event) => setDraft((prev) => ({ ...prev, metric: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Operator</label>
                <select
                  className="w-full rounded-md border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-3 py-2 text-sm"
                  value={draft.operator}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, operator: event.target.value as typeof prev.operator }))
                  }
                >
                  <option value=">">{'>'}</option>
                  <option value="<">{'<'}</option>
                  <option value=">=">{'>='}</option>
                  <option value="<=">{'<='}</option>
                  <option value="==">{'=='}</option>
                </select>
              </div>
              <Input
                label="Threshold"
                type="number"
                value={draft.threshold}
                onChange={(event) => setDraft((prev) => ({ ...prev, threshold: event.target.value }))}
              />
            </div>
            <Input
              label="Work Order Title"
              value={draft.workOrderTitle}
              onChange={(event) => setDraft((prev) => ({ ...prev, workOrderTitle: event.target.value }))}
            />
            <Input
              label="Work Order Description"
              value={draft.workOrderDescription}
              onChange={(event) => setDraft((prev) => ({ ...prev, workOrderDescription: event.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => setDraft((prev) => ({ ...prev, active: event.target.checked }))}
              />
              Rule active
            </label>
            <Button
              onClick={createRule}
              disabled={!canManageRules}
              aria-label={canManageRules ? 'Create rule' : 'Create rule disabled - insufficient permissions'}
            >
              Create rule
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>Rules</Card.Title>
            <Card.Description>Active automations for condition-based maintenance.</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-2">
            {loading ? <p className="text-sm text-[var(--wp-color-text-muted)]">Loading rules...</p> : null}
            {!loading && rules.length === 0 ? (
              <p className="text-sm text-[var(--wp-color-text-muted)]">No rules configured.</p>
            ) : null}
            {rules.map((rule) => {
              const id = rule._id ?? rule.id ?? '';
              return (
                <div
                  key={id}
                  className="rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{rule.workOrderTitle}</p>
                      <p className="text-xs text-[var(--wp-color-text-muted)]">
                        {rule.metric} {rule.operator ?? '>'} {rule.threshold} - asset {rule.asset}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs ${rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                      {id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void deleteRule(id)}
                          disabled={!canManageRules}
                          aria-label={canManageRules ? 'Delete rule' : 'Delete rule disabled - insufficient permissions'}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}

