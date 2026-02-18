/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '@common/Button';
import AutoCompleteInput from '@common/AutoCompleteInput';
import { useDepartmentStore } from '@/store/departmentStore';
import { useTeamMembers } from '@/store/useTeamMembers';
import { fetchOnboardingState } from '@/api/onboarding';
import type { TeamMember } from '@/types';
import { useToast } from '@/context/ToastContext';
import {
  TEAM_ROLES,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_MANAGER_MAP,
  getTeamRoleLabel,
  normalizeTeamRole,
  type TeamRole,
} from '@/constants/teamRoles';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
  defaultRole: TeamRole;
}

interface TeamFormData {
  name: string;
  email: string;
  role: TeamRole;
  department: string;
  employeeId: string;
  managerId: string;
}

const defaultValues: TeamFormData = {
  name: '',
  email: '',
  role: 'team_member',
  department: '',
  employeeId: '',
  managerId: '',
};

const TeamModal: React.FC<TeamModalProps> = ({ isOpen, onClose, member, defaultRole }) => {
  const { addMember, updateMember, fetchMembers, members } = useTeamMembers();
  const { fetchDepartments } = useDepartmentStore();
  const { addToast } = useToast();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamFormData>({ defaultValues });

  useEffect(() => {
    setValue('name', member?.name ?? '');
    setValue('email', member?.email ?? '');
    const resolvedRole = normalizeTeamRole(member?.role) ?? defaultRole;
    setValue('role', resolvedRole);
    setValue('department', member?.department ?? '');
    setValue('employeeId', member?.employeeId ?? '');
    setValue('managerId', member?.managerId ?? '');
  }, [defaultRole, member, setValue]);

  const selectedRole = watch('role') ?? 'team_member';

  const requiresManagerSelection = useMemo(() => {
    const allowedManagers = TEAM_ROLE_MANAGER_MAP[selectedRole];
    return Array.isArray(allowedManagers) && allowedManagers.length > 0;
  }, [selectedRole]);

  useEffect(() => {
    if (!requiresManagerSelection) {
      setValue('managerId', '');
    }
  }, [requiresManagerSelection, setValue]);

  const managerOptions = useMemo(() => {
    const allowedRoles = TEAM_ROLE_MANAGER_MAP[selectedRole];
    if (!allowedRoles) return [];
    return members.filter((m) => {
      const normalized = normalizeTeamRole(m.role);
      return normalized && allowedRoles.includes(normalized);
    });
  }, [members, selectedRole]);

  const fetchDepartmentOptions = async (q: string) => {
    try {
      const list = await fetchDepartments();
      return list.filter((d) =>
        d.name.toLowerCase().includes(q.toLowerCase())
      );
    } catch (e) {
      addToast('Failed to load departments', 'error');
 
      return [];
    }
  };

  const onSubmit = handleSubmit(async (data: TeamFormData) => {
    setLoading(true);
    try {
      const allowedManagers = TEAM_ROLE_MANAGER_MAP[data.role];
      const requiresManager = Array.isArray(allowedManagers) && allowedManagers.length > 0;
      const payload: Partial<TeamMember> = {
        ...data,
        managerId: requiresManager ? data.managerId || null : null,
      };
      let body: Partial<TeamMember> | FormData = payload;
      if (avatarFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) fd.append(k, String(v));
        });
        fd.append('avatar', avatarFile);
        body = fd;
      }
      if (member) await updateMember(member.id, body);
      else await addMember(body);
      await fetchMembers();
      if (member) {
        addToast('Team member saved', 'success');
      } else {
        try {
          const onboarding = await fetchOnboardingState();
          const usersStep = onboarding.steps.find((step) => step.key === 'users');
          if (usersStep?.completed) {
            addToast('Team member profile created. Onboarding step complete.', 'success');
          } else {
            addToast('Team member profile created', 'success');
          }
        } catch {
          addToast('Team member profile created', 'success');
        }
      }
      onClose();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Failed to save team member';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  });

  if (!isOpen) return null;

  const isEditMode = Boolean(member);
  const modalTitle = isEditMode ? 'Edit Team Member' : 'Add Team Member';
  const submitLabel = isEditMode ? 'Update Member' : 'Add Team Member';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-neutral-200 dark:border-neutral-700/80">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Avatar</label>
            <input
              type="file"
              accept="image/*"
              className="text-neutral-900 dark:text-neutral-100"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Name</label>
              <input
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-error-500 dark:text-error-400 text-sm mt-1">{errors.name.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-error-500 dark:text-error-400 text-sm mt-1">{errors.email.message as string}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Role</label>
              <select
                className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                {...register('role')}
              >
                {TEAM_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {TEAM_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <AutoCompleteInput
                name="department"
                label="Department"
                control={control}
                fetchOptions={fetchDepartmentOptions}
                rules={{ required: 'Department is required' }}
                placeholder="Search departments..."
              />
            </div>
          </div>

          {TEAM_ROLE_MANAGER_MAP[selectedRole] && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Manager</label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-white text-neutral-900 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                  {...register('managerId', {
                    required: requiresManagerSelection ? 'Manager is required' : false,
                  })}
                >
                  <option value="">Select manager</option>
                  {managerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`${option.name} — ${getTeamRoleLabel(option.role)}`}
                    </option>
                  ))}
                </select>
                {errors.managerId && (
                  <p className="text-error-500 dark:text-error-400 text-sm mt-1">
                    {errors.managerId.message as string}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">Employee ID</label>
              <input
                className="w-full px-3 py-2 border border-neutral-300 rounded-md text-neutral-900 bg-white dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-100"
                {...register('employeeId', { required: 'Employee ID is required' })}
              />
              {errors.employeeId && (
                <p className="text-error-500 dark:text-error-400 text-sm mt-1">{errors.employeeId.message as string}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamModal;
