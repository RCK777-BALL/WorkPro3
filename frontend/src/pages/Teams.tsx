/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Button from '@/components/common/Button';
import AdminAddTeamMemberModal from '@/components/teams/AdminAddTeamMemberModal';
import { createAdminUser, listAdminUsers, patchAdminUser, type AdminUser, TRADE_OPTIONS } from '@/api/adminUsers';
import { useToast } from '@/context/ToastContext';
import { useAuthStore, isAdmin as selectIsAdmin } from '@/store/authStore';

const Teams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const isAdmin = useAuthStore(selectIsAdmin);
  const inviteEnabled = String(import.meta.env.VITE_ENABLE_USER_INVITES ?? 'false').toLowerCase() === 'true';

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    void listAdminUsers()
      .then((rows) => setUsers(rows))
      .catch(() => addToast('Failed to load team members', 'error'))
      .finally(() => setLoading(false));
  }, [addToast, isAdmin]);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get('create') === '1' && isAdmin;
    if (!shouldOpenCreate) return;

    setOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('create');
      return next;
    }, { replace: true });
  }, [isAdmin, searchParams, setSearchParams]);

  const roles = useMemo(() => {
    const unique = new Set<string>();
    users.forEach((user) => unique.add(user.role));
    return Array.from(unique.values()).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (tradeFilter && user.trade !== tradeFilter) return false;
      if (roleFilter && user.role !== roleFilter) return false;
      if (!query) return true;
      return [user.fullName, user.email, user.employeeNumber, user.role, user.trade]
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [roleFilter, search, tradeFilter, users]);

  const handleCreate = async (payload: Parameters<typeof createAdminUser>[0]) => {
    const result = await createAdminUser(payload);
    setUsers((prev) => [result.user, ...prev]);
    addToast('Team member profile created', 'success');
    if (result.inviteSent) {
      addToast('Invite link generated (check backend logs in dev)', 'success');
    }
  };

  const handleEdit = async (id: string, payload: Parameters<typeof patchAdminUser>[1]) => {
    const result = await patchAdminUser(id, payload);
    setUsers((prev) => prev.map((entry) => (entry.id === id ? result.user : entry)));
    addToast('Team member updated', 'success');
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Team</h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          Only administrators can manage team member onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            setEditingUser(null);
            setOpen(true);
          }}
        >
          Start Team Member Onboarding
        </Button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            placeholder="Search name, email, employee #"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={tradeFilter}
            onChange={(event) => setTradeFilter(event.target.value)}
          >
            <option value="">All trades</option>
            {TRADE_OPTIONS.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Trade</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Employee #</th>
              <th className="px-4 py-3 font-medium">Start Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                  Loading team members...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-neutral-500">
                  No team members found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-3">{user.fullName}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.trade}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.employeeNumber}</td>
                  <td className="px-4 py-3">{user.startDate ? user.startDate.slice(0, 10) : '-'}</td>
                  <td className="px-4 py-3">{user.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingUser(user);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AdminAddTeamMemberModal
        open={open}
        canChooseRole={isAdmin}
        inviteEnabled={inviteEnabled}
        user={editingUser}
        onClose={() => {
          setOpen(false);
          setEditingUser(null);
        }}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default Teams;


