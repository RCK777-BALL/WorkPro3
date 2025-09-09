import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Button from '../common/Button';
import AutoCompleteInput from '../common/AutoCompleteInput';
import { useDepartmentStore } from '../../store/departmentStore';
import { useTeamMembers } from '../../store/useTeamMembers';
import type { TeamMember } from '../../types';
import { useToast } from '../../context/ToastContext';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

const defaultValues = {
  name: '',
  email: '',
  role: 'team_member',
  department: '',
  employeeId: '',
  managerId: '',
};

const TeamModal: React.FC<TeamModalProps> = ({ isOpen, onClose, member }) => {
  const { addMember, updateMember, fetchMembers, members } = useTeamMembers();
  const { fetchDepartments } = useDepartmentStore();
  const { addToast } = useToast();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ defaultValues });

  useEffect(() => {
    setValue('name', member?.name ?? '');
    setValue('email', member?.email ?? '');
    setValue('role', member?.role ?? 'team_member');
    setValue('department', member?.department ?? '');
    setValue('employeeId', member?.employeeId ?? '');
    setValue('managerId', member?.managerId ?? '');
  }, [member, setValue]);

  const role = watch('role');

  const reportOptions = useMemo(() => {
    if (role === 'team_member')
      return members.filter((m) => m.role === 'team_leader');
    if (role === 'team_leader')
      return members.filter((m) => m.role === 'area_leader');
    if (role === 'area_leader')
      return members.filter((m) =>
        ['manager', 'department_leader'].includes(m.role)
      );
    return [];
  }, [role, members]);

  useEffect(() => {
    if (['admin', 'manager', 'department_leader'].includes(role))
      setValue('managerId', '');
  }, [role, setValue]);

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

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    try {
      const payload: any = { ...data };
      if (!payload.managerId) delete payload.managerId;
      let body: any = payload;
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
      addToast('Team member saved', 'success');
      onClose();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to save team member';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Avatar</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-error-500 text-sm mt-1">{errors.name.message as string}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-error-500 text-sm mt-1">{errors.email.message as string}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              {...register('role')}
            >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="department_leader">Department Leader</option>
                <option value="area_leader">Area Leader</option>
                <option value="team_leader">Team Leader</option>
                <option value="team_member">Team Member</option>
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

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Employee ID</label>
              <input
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                {...register('employeeId', { required: 'Employee ID is required' })}
              />
              {errors.employeeId && (
                <p className="text-error-500 text-sm mt-1">{errors.employeeId.message as string}</p>
              )}
            </div>

            {['team_member', 'team_leader', 'area_leader'].includes(role) && (
              <div>
                <label className="block text-sm font-medium mb-1">Reports To</label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                  {...register('managerId', {
                    validate: (value) => {
                      if (['admin', 'manager', 'department_leader'].includes(role))
                        return true;
                      if (!value) return 'Reports To is required';
                      const mgr = members.find((m) => m.id === value);
                      if (role === 'team_member' && mgr?.role !== 'team_leader')
                        return 'Team members must report to a team leader';
                      if (role === 'team_leader' && mgr?.role !== 'area_leader')
                        return 'Team leaders must report to an area leader';
                      if (
                        role === 'area_leader' &&
                        !['manager', 'department_leader'].includes(mgr?.role ?? '')
                      )
                        return 'Area leaders must report to a manager or department leader';
                      return true;
                    },
                  })}
                >
                  <option value="">Select</option>
                  {reportOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {errors.managerId && (
                  <p className="text-error-500 text-sm mt-1">{errors.managerId.message as string}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {member ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamModal;
