/*
 * SPDX-License-Identifier: MIT
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Shield, Trash2 } from 'lucide-react';

import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { useToast } from '@/context/ToastContext';
import { usePermissions } from '@/auth/usePermissions';
import { PERMISSIONS, type Permission } from '@/auth/permissions';
import http from '@/lib/http';
import { useScopeContext } from '@/context/ScopeContext';

interface RoleResponse {
  _id: string;
  name: string;
  permissions: string[];
  siteId?: string | null;
}

const flattenPermissions = (): Array<{ label: string; value: Permission; group: string }> => {
  const groups: Array<{ label: string; value: Permission; group: string }> = [];
  for (const [category, actions] of Object.entries(PERMISSIONS)) {
    for (const action of Object.values(actions)) {
      groups.push({
        label: action,
        value: action,
        group: category,
      });
    }
  }
  return groups;
};

const permissionOptions = flattenPermissions();

const RoleManagementPage = () => {
  const { addToast } = useToast();
  const { can } = usePermissions();
  const { plants, activePlant, switchPlant } = useScopeContext();
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [viewSiteId, setViewSiteId] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  const editable = useMemo(() => can('roles.manage'), [can]);

  const siteOptions = useMemo(
    () => [{ value: '', label: 'All sites' }, ...plants.map((plant) => ({ value: plant.id, label: plant.name }))],
    [plants],
  );

  const siteSummaries = useMemo(() => {
    const lookup = new Map<string, { label: string; roles: number }>();
    lookup.set('all', { label: 'Tenant-wide', roles: 0 });
    siteOptions.forEach((site) => {
      if (site.value) {
        lookup.set(site.value, { label: site.label, roles: 0 });
      }
    });

    roles.forEach((role) => {
      const key = role.siteId ?? 'all';
      const existing = lookup.get(key) ?? { label: key, roles: 0 };
      lookup.set(key, { ...existing, roles: existing.roles + 1 });
    });

    return Array.from(lookup.values());
  }, [roles, siteOptions]);

  const filteredRoles = useMemo(() => {
    if (!viewSiteId) return roles;
    return roles.filter((role) => !role.siteId || role.siteId === viewSiteId);
  }, [roles, viewSiteId]);

  const resetForm = (targetSiteId: string | null = viewSiteId || null) => {
    setSelectedRoleId(null);
    setName('');
    setSiteId(targetSiteId);
    setSelectedPermissions([]);
  };

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<RoleResponse[]>('/roles');
      setRoles(data ?? []);
    } catch (error) {
      console.error(error);
      addToast('Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    const newSiteId = activePlant?.id ?? '';
    setViewSiteId(newSiteId);
    resetForm(newSiteId || null);
    loadRoles();
  }, [activePlant?.id, loadRoles]);

  useEffect(() => {
    if (!selectedRoleId) return;
    const role = roles.find((r) => r._id === selectedRoleId);
    if (!role) return;
    setName(role.name);
    setSiteId(role.siteId ?? null);
    setSelectedPermissions(role.permissions as Permission[]);
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (!selectedRoleId) {
      setSiteId(viewSiteId || null);
    }
  }, [selectedRoleId, viewSiteId]);

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  };

  const handleSave = async () => {
    if (!editable || saving) return;
    if (!name.trim()) {
      addToast('Role name is required', 'error');
      return;
    }
    setSaving(true);
    const payload = { name: name.trim(), permissions: selectedPermissions, siteId };
    try {
      if (selectedRoleId) {
        await http.put(`/roles/${selectedRoleId}`, payload);
        addToast('Role updated', 'success');
      } else {
        await http.post('/roles', payload);
        addToast('Role created', 'success');
      }
      resetForm();
      loadRoles();
    } catch (error) {
      console.error(error);
      addToast('Could not save role', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleViewSiteChange = async (value: string) => {
    setViewSiteId(value);
    resetForm(value || null);
    if (value) {
      await switchPlant(value);
    }
  };

  const handleDelete = async (id: string) => {
    if (!editable) return;
    setSaving(true);
    try {
      await http.delete(`/roles/${id}`);
      addToast('Role deleted', 'success');
      if (selectedRoleId === id) {
        resetForm();
      }
      loadRoles();
    } catch (error) {
      console.error(error);
      addToast('Could not delete role', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Role permissions</h1>
          <p className="text-sm text-slate-400">
            Manage granular permissions per site using reusable roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300" htmlFor="site-filter">
            View roles for site
          </label>
          <select
            id="site-filter"
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            value={viewSiteId}
            onChange={(e) => handleViewSiteChange(e.target.value)}
          >
            {siteOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Tenant &amp; site scopes</h2>
            <p className="text-sm text-slate-400">
              Policies are evaluated with the current tenant, site context, and socket connections using shared guards.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {siteSummaries.map((site) => (
              <div key={site.label} className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{site.label}</p>
                <p className="text-xl font-semibold text-slate-100">{site.roles}</p>
                <p className="text-xs text-slate-500">Roles scoped here</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Existing roles</h2>
              <p className="text-sm text-slate-400">Filtered by tenant and active site context.</p>
            </div>
            <Button onClick={() => resetForm()} variant="outline" disabled={saving || !editable}>
              New role
            </Button>
          </div>
          {loading ? (
            <p className="py-6 text-sm text-slate-400">Loading roles…</p>
          ) : filteredRoles.length === 0 ? (
            <p className="py-6 text-sm text-slate-400">No roles available for this site.</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {filteredRoles.map((role) => (
                <li
                  key={role._id}
                  className={`flex items-center justify-between gap-3 py-3 transition hover:bg-slate-900/40 ${
                    selectedRoleId === role._id ? 'bg-slate-900/60' : ''
                  }`}
                >
                  <button
                    className="flex flex-1 flex-col text-left"
                    onClick={() => setSelectedRoleId(role._id)}
                    type="button"
                  >
                    <span className="flex items-center gap-2 text-slate-100">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <span className="font-medium">{role.name}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {role.siteId ? 'Site specific' : 'All sites'} • {role.permissions.length} permissions
                    </span>
                  </button>
                  {editable && (
                    <button
                      className="text-red-400 transition hover:text-red-300"
                      aria-label={`Delete role ${role.name}`}
                      onClick={() => handleDelete(role._id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {selectedRoleId ? 'Edit role' : 'Create role'}
              </h2>
              <p className="text-sm text-slate-400">Assign permissions and scope the role to a site.</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="role-name">
                Role name
              </label>
              <input
                id="role-name"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                placeholder="e.g. Inventory Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!editable}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300" htmlFor="role-site">
                Site scope
              </label>
              <select
                id="role-site"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                value={siteId ?? ''}
                onChange={(e) => setSiteId(e.target.value || null)}
                disabled={!editable}
              >
                {siteOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Leave blank to make the role available to all sites in the tenant.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Permissions</span>
                <span className="text-xs text-slate-500">{selectedPermissions.length} selected</span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {permissionOptions.map((option) => {
                  const checked = selectedPermissions.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                        checked
                          ? 'border-emerald-500/70 bg-emerald-500/10 text-emerald-100'
                          : 'border-slate-700 bg-slate-900 text-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => togglePermission(option.value)}
                        disabled={!editable}
                      />
                      <span className="flex-1">
                        <span className="block font-medium capitalize">{option.group}</span>
                        <span className="block text-xs text-slate-400">{option.label}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={!editable || saving}>
                {selectedRoleId ? 'Update role' : 'Create role'}
              </Button>
              {selectedRoleId && (
                <Button variant="outline" onClick={() => resetForm()} disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RoleManagementPage;
