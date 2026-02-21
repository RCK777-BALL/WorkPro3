import { useEffect, useState } from 'react';

import Button from '@/components/common/Button';
import { TRADE_OPTIONS, type AdminUser } from '@/api/adminUsers';

type CreatePayload = {
  fullName: string;
  email: string;
  trade: string;
  employeeNumber: string;
  startDate?: string;
  role: string;
  tempPassword: string;
};

type EditPayload = Partial<CreatePayload>;

type Props = {
  open: boolean;
  canChooseRole?: boolean;
  inviteEnabled?: boolean;
  user?: AdminUser | null;
  onClose: () => void;
  onCreate: (payload: CreatePayload) => Promise<void>;
  onEdit: (id: string, payload: EditPayload) => Promise<void>;
};

export default function AdminAddTeamMemberModal({ open, canChooseRole = true, user, onClose, onCreate, onEdit }: Props) {
  const [form, setForm] = useState<CreatePayload>({
    fullName: '',
    email: '',
    trade: 'Other',
    employeeNumber: '',
    startDate: '',
    role: 'technician',
    tempPassword: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!user) {
      setForm({
        fullName: '', email: '', trade: 'Other', employeeNumber: '', startDate: '', role: 'technician', tempPassword: '',
      });
      return;
    }
    setForm({
      fullName: user.fullName,
      email: user.email,
      trade: user.trade,
      employeeNumber: user.employeeNumber,
      startDate: user.startDate ? user.startDate.slice(0, 10) : '',
      role: user.role,
      tempPassword: '',
    });
  }, [open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-5 dark:bg-neutral-900">
        <h3 className="text-lg font-semibold">{user ? 'Edit team member' : 'Create team member'}</h3>
        <form
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSaving(true);
            const action = user ? onEdit(user.id, form) : onCreate(form);
            void action.finally(() => setSaving(false)).then(() => onClose());
          }}
        >
          <input className="rounded border px-3 py-2" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required placeholder="Full name" />
          <input className="rounded border px-3 py-2" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required placeholder="Email" />
          <select className="rounded border px-3 py-2" value={form.trade} onChange={(e) => setForm((p) => ({ ...p, trade: e.target.value }))}>
            {TRADE_OPTIONS.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
          </select>
          <input className="rounded border px-3 py-2" value={form.employeeNumber} onChange={(e) => setForm((p) => ({ ...p, employeeNumber: e.target.value }))} required placeholder="Employee #" />
          <input className="rounded border px-3 py-2" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          {canChooseRole ? (
            <select className="rounded border px-3 py-2" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="admin">admin</option><option value="manager">manager</option><option value="technician">technician</option><option value="user">user</option>
            </select>
          ) : <input className="rounded border px-3 py-2" value={form.role} disabled />}
          <input className="rounded border px-3 py-2 md:col-span-2" type="password" minLength={10} value={form.tempPassword} onChange={(e) => setForm((p) => ({ ...p, tempPassword: e.target.value }))} required={!user} placeholder={user ? 'New password (optional)' : 'Temporary password'} />
          <div className="md:col-span-2 mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{user ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
