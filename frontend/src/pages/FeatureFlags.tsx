/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flag } from 'lucide-react';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';
import { usePermissions } from '@/auth/usePermissions';
import http from '@/lib/http';

interface FeatureFlag {
  _id: string;
  key: string;
  name?: string;
  description?: string;
  enabled: boolean;
}

const FeatureFlagsPage = () => {
  const { addToast } = useToast();
  const { can } = usePermissions();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: '', name: '', description: '', enabled: false });

  const editable = useMemo(() => can('roles.manage'), [can]);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<FeatureFlag[]>('/feature-flags');
      setFlags(data ?? []);
    } catch (error) {
      console.error(error);
      addToast('Failed to load feature flags', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    if (!editable || saving) return;
    setSaving(true);
    try {
      const { data } = await http.put<FeatureFlag>(`/feature-flags/${flag._id}`, {
        enabled: !flag.enabled,
      });
      setFlags((prev) => prev.map((item) => (item._id === flag._id ? data : item)));
      addToast(`${data.key} ${data.enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to update feature flag', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!editable || saving) return;
    if (!newFlag.key.trim()) {
      addToast('Feature flag key is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const { data } = await http.post<FeatureFlag>('/feature-flags', {
        key: newFlag.key.trim(),
        name: newFlag.name.trim() || undefined,
        description: newFlag.description.trim() || undefined,
        enabled: newFlag.enabled,
      });
      setFlags((prev) => [data, ...prev]);
      setNewFlag({ key: '', name: '', description: '', enabled: false });
      addToast('Feature flag created', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to create feature flag', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-[var(--wp-color-text-muted)]">Administration</p>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Feature flags</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">
            Toggle access-controlled features and manage experimental rollouts.
          </p>
        </div>
        <Button variant="secondary" onClick={loadFlags} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card
        title="Create feature flag"
        subtitle="Add a new flag for this tenant"
        icon={<Flag className="h-4 w-4 text-emerald-400" />}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-[var(--wp-color-text-muted)]">
            Key
            <input
              value={newFlag.key}
              onChange={(event) => setNewFlag((prev) => ({ ...prev, key: event.target.value }))}
              className="rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2"
              placeholder="rbac_admin"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--wp-color-text-muted)]">
            Name
            <input
              value={newFlag.name}
              onChange={(event) => setNewFlag((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2"
              placeholder="RBAC Administration"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--wp-color-text-muted)] md:col-span-2">
            Description
            <input
              value={newFlag.description}
              onChange={(event) => setNewFlag((prev) => ({ ...prev, description: event.target.value }))}
              className="rounded-lg border border-[var(--wp-color-border)] bg-transparent px-3 py-2"
              placeholder="Describe what this flag controls"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--wp-color-text-muted)]">
            <input
              type="checkbox"
              checked={newFlag.enabled}
              onChange={(event) =>
                setNewFlag((prev) => ({ ...prev, enabled: event.target.checked }))
              }
              className="h-4 w-4 rounded border-[var(--wp-color-border)] bg-transparent"
            />
            Enable immediately
          </label>
          <Button onClick={handleCreate} disabled={!editable || saving}>
            Create flag
          </Button>
        </div>
      </Card>

      <Card
        title="Active flags"
        subtitle={loading ? 'Loading flags…' : `${flags.length} flag${flags.length === 1 ? '' : 's'}`}
      >
        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--wp-color-border)] bg-[var(--wp-color-surface-elevated)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--wp-color-text)]">{flag.name || flag.key}</p>
                <p className="text-xs text-[var(--wp-color-text-muted)]">{flag.key}</p>
                {flag.description && (
                  <p className="text-xs text-[var(--wp-color-text-muted)]">{flag.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleToggle(flag)}
                disabled={!editable || saving}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  flag.enabled
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-[var(--wp-color-border)] text-[var(--wp-color-text-muted)]'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    flag.enabled ? 'bg-emerald-400' : 'bg-[color-mix(in srgb,var(--wp-color-text) 45%, transparent)]'
                  }`}
                />
                {flag.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
          {!loading && flags.length === 0 && (
            <p className="text-sm text-[var(--wp-color-text-muted)]">No feature flags found.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default FeatureFlagsPage;

