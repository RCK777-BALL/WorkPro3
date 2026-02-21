/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import Button from '@common/Button';

import {
  TRADE_OPTIONS,
  type AdminUser,
  type TradeOption,
  type ShiftOption,
  type CreateAdminUserPayload,
  type AdminCreateMode,
  type PatchAdminUserPayload,
} from '@/api/adminUsers';

type FormState = {
  fullName: string;
  email: string;
  trade: TradeOption;
  employeeNumber: string;
  startDate: string;
  role: string;
  shift: ShiftOption;
  weeklyCapacityHours: string;
  skills: string;
  notifyByEmail: boolean;
  notifyBySms: boolean;
  mode: AdminCreateMode;
  tempPassword: string;
};

const DEFAULT_FORM: FormState = {
  fullName: '',
  email: '',
  trade: 'Electrical',
  employeeNumber: '',
  startDate: '',
  role: 'team_member',
  shift: 'day',
  weeklyCapacityHours: '40',
  skills: '',
  notifyByEmail: true,
  notifyBySms: false,
  mode: 'temp_password',
  tempPassword: '',
};

const ROLE_OPTIONS = [
  'team_member',
  'technical_team_member',
  'team_leader',
  'planner',
  'tech',
  'technician',
  'admin',
];

interface Props {
  open: boolean;
  canChooseRole: boolean;
  inviteEnabled: boolean;
  user?: AdminUser | null;
  onClose: () => void;
  onCreate: (payload: CreateAdminUserPayload) => Promise<void>;
  onEdit: (id: string, payload: PatchAdminUserPayload) => Promise<void>;
}

export default function AdminAddTeamMemberModal({
  open,
  canChooseRole,
  inviteEnabled,
  user,
  onClose,
  onCreate,
  onEdit,
}: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = Boolean(user);

  useEffect(() => {
    if (!open) return;
    if (!user) {
      setForm(DEFAULT_FORM);
      return;
    }
    setForm({
      fullName: user.fullName ?? '',
      email: user.email ?? '',
      trade: user.trade ?? 'Other',
      employeeNumber: user.employeeNumber ?? '',
      startDate: user.startDate ? user.startDate.slice(0, 10) : '',
      role: user.role ?? 'team_member',
      shift: user.shift ?? 'day',
      weeklyCapacityHours: String(user.weeklyCapacityHours ?? 40),
      skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
      notifyByEmail: user.notifyByEmail !== false,
      notifyBySms: user.notifyBySms === true,
      mode: 'temp_password',
      tempPassword: '',
    });
  }, [open, user]);

  const canSubmit = useMemo(() => {
    if (!form.fullName.trim() || !form.email.trim() || !form.employeeNumber.trim() || !form.startDate) {
      return false;
    }
    const weeklyCapacityHours = Number(form.weeklyCapacityHours);
    if (!Number.isFinite(weeklyCapacityHours) || weeklyCapacityHours < 1 || weeklyCapacityHours > 168) {
      return false;
    }
    if (!isEditMode && form.mode === 'temp_password' && form.tempPassword.length < 10) {
      return false;
    }
    return true;
  }, [form, isEditMode]);

  if (!open) return null;

  const closeAndReset = () => {
    setError(null);
    setSubmitting(false);
    setForm(DEFAULT_FORM);
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const normalizedSkills = Array.from(
        new Set(
          form.skills
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean),
        ),
      );
      const payloadBase = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        trade: form.trade,
        employeeNumber: form.employeeNumber.trim(),
        startDate: form.startDate,
        role: canChooseRole ? form.role : 'team_member',
        shift: form.shift,
        weeklyCapacityHours: Number(form.weeklyCapacityHours),
        skills: normalizedSkills,
        notifyByEmail: form.notifyByEmail,
        notifyBySms: form.notifyBySms,
      };
      const payload: CreateAdminUserPayload =
        form.mode === 'temp_password'
          ? { ...payloadBase, mode: 'temp_password', tempPassword: form.tempPassword }
          : { ...payloadBase, mode: 'invite' };
      if (isEditMode && user) {
        await onEdit(user.id, payloadBase);
      } else {
        await onCreate(payload);
      }
      closeAndReset();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        (Array.isArray(err?.response?.data?.error) ? err.response.data.error.join(', ') : null) ??
        'Failed to create team member';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-lg border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {isEditMode ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          <button
            type="button"
            aria-label="Close add team member modal"
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            onClick={closeAndReset}
          >
            x
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="admin-member-full-name" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Full name</label>
            <input
              id="admin-member-full-name"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="admin-member-email" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Email</label>
            <input
              id="admin-member-email"
              type="email"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="admin-member-trade" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Trade</label>
            <select
              id="admin-member-trade"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.trade}
              onChange={(e) => setForm((prev) => ({ ...prev, trade: e.target.value as TradeOption }))}
            >
              {TRADE_OPTIONS.map((trade) => (
                <option key={trade} value={trade}>
                  {trade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-member-employee-number" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Employee #</label>
            <input
              id="admin-member-employee-number"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.employeeNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, employeeNumber: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="admin-member-start-date" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Start date</label>
            <input
              id="admin-member-start-date"
              type="date"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="admin-member-shift" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Shift</label>
            <select
              id="admin-member-shift"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.shift}
              onChange={(e) => setForm((prev) => ({ ...prev, shift: e.target.value as ShiftOption }))}
            >
              <option value="day">day</option>
              <option value="swing">swing</option>
              <option value="night">night</option>
            </select>
          </div>
          <div>
            <label htmlFor="admin-member-weekly-capacity" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Weekly capacity hours</label>
            <input
              id="admin-member-weekly-capacity"
              type="number"
              min={1}
              max={168}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.weeklyCapacityHours}
              onChange={(e) => setForm((prev) => ({ ...prev, weeklyCapacityHours: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="admin-member-skills" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Skills (comma-separated)</label>
            <input
              id="admin-member-skills"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={form.skills}
              onChange={(e) => setForm((prev) => ({ ...prev, skills: e.target.value }))}
              placeholder="PLC, Hydraulics, PM planning"
            />
          </div>
          <div className="md:col-span-2">
            <p className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Notifications</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyByEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, notifyByEmail: e.target.checked }))}
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.notifyBySms}
                  onChange={(e) => setForm((prev) => ({ ...prev, notifyBySms: e.target.checked }))}
                />
                SMS
              </label>
            </div>
          </div>
          {canChooseRole ? (
            <div>
              <label htmlFor="admin-member-role" className="mb-1 block text-sm font-medium text-neutral-800 dark:text-neutral-100">Role</label>
              <select
                id="admin-member-role"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {!isEditMode ? (
          <div className="mt-5 rounded-md border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="mb-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">Password setup</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="passwordMode"
                  checked={form.mode === 'temp_password'}
                  onChange={() => setForm((prev) => ({ ...prev, mode: 'temp_password' }))}
                />
                Set temp password
              </label>
              <label className={`flex items-center gap-2 text-sm ${inviteEnabled ? '' : 'opacity-50'}`}>
                <input
                  type="radio"
                  name="passwordMode"
                  checked={form.mode === 'invite'}
                  disabled={!inviteEnabled}
                  onChange={() => setForm((prev) => ({ ...prev, mode: 'invite' }))}
                />
                Send invite
              </label>
            </div>
            {form.mode === 'temp_password' ? (
              <div className="mt-3">
                <input
                  type="password"
                  placeholder="Temporary password (min 10 chars)"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  value={form.tempPassword}
                  onChange={(e) => setForm((prev) => ({ ...prev, tempPassword: e.target.value }))}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm text-error-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={closeAndReset}>
            Cancel
          </Button>
          <Button loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            {isEditMode ? 'Save Changes' : 'Create Member'}
          </Button>
        </div>
      </div>
    </div>
  );
}
