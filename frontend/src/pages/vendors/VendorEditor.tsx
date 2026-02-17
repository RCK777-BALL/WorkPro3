/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import DataTable from '@/components/common/DataTable';
import Input from '@/components/common/Input';
import TextArea from '@/components/common/TextArea';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useSaveVendor, useVendor } from '@/hooks/useVendors';
import { useAuth } from '@/context/AuthContext';
import type { Vendor, VendorAttachment, VendorContact, VendorNote } from '@/types/vendor';
import { formatDate } from '@/utils/date';

const defaultVendor: Vendor = {
  id: '',
  name: '',
  email: '',
  phone: '',
  status: 'active',
  contacts: [],
  attachments: [],
  notes: [],
};

const createId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const VendorEditor = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(vendorId);
  const { user } = useAuth();
  const { data, isLoading } = useVendor(vendorId);
  const { data: purchaseOrders } = usePurchaseOrders();
  const saveVendor = useSaveVendor();
  const [form, setForm] = useState<Vendor>(defaultVendor);
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [attachments, setAttachments] = useState<VendorAttachment[]>([]);
  const [notes, setNotes] = useState<VendorNote[]>([]);
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => {
    if (data) {
      setForm({
        id: data.id,
        name: data.name,
        email: data.email ?? '',
        phone: data.phone ?? '',
        status: data.status ?? 'active',
        address: data.address ?? {},
        leadTimeDays: data.leadTimeDays,
        spendToDate: data.spendToDate,
      });
      setContacts(data.contacts ?? []);
      setAttachments(data.attachments ?? []);
      setNotes(data.notes ?? []);
    } else {
      setForm(defaultVendor);
      setContacts([]);
      setAttachments([]);
      setNotes([]);
    }
  }, [data, vendorId]);

  const relatedOrders = useMemo(
    () => (purchaseOrders ?? []).filter((po) => po.vendorId === vendorId),
    [purchaseOrders, vendorId],
  );

  const spend = useMemo(
    () => form.spendToDate ?? relatedOrders.reduce((total, po) => total + (po.lines?.length ?? 0), 0),
    [form.spendToDate, relatedOrders],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveVendor.mutateAsync({ ...form, contacts, attachments, notes, id: vendorId });
    navigate('/vendors');
  };

  const handleAddContact = () => {
    setContacts((prev) => [
      ...prev,
      { id: createId(), name: 'New contact', role: 'Buyer', email: '', phone: '' },
    ]);
  };

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    setNotes((prev) => [
      { id: createId(), body: noteDraft.trim(), author: user?.name, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setNoteDraft('');
  };

  if (isEdit && isLoading) {
    return <p className="text-sm text-[var(--wp-color-text-muted)]">Loading vendor…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">{isEdit ? form.name || 'Vendor' : 'Add vendor'}</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Maintain supplier records, contacts, and related POs.</p>
        </div>
        {isEdit && (
          <div className="flex gap-2">
            <Badge text={form.status ?? 'active'} type={form.status === 'inactive' ? 'default' : 'success'} />
            <Button as={Link} to="/purchasing/purchase-orders" variant="outline">
              View POs
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4" title="Vendor details">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Name"
                required
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="Email"
                type="email"
                value={form.email ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <Input
                label="Address"
                value={form.address?.street ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, address: { ...prev.address, street: e.target.value } }))
                }
              />
              <Input
                label="Lead time (days)"
                type="number"
                value={form.leadTimeDays ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, leadTimeDays: Number(e.target.value) }))
                }
              />
              <div>
                <label className="block text-sm font-medium text-[var(--wp-color-text)]">Status</label>
                <select
                  className="mt-1 block w-full rounded-md border border-[var(--wp-color-border)] px-3 py-2"
                  value={form.status ?? 'active'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setForm((prev) => ({ ...prev, status: e.target.value as Vendor['status'] }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/vendors')}>
                Cancel
              </Button>
              <Button type="submit" loading={saveVendor.isLoading}>
                {isEdit ? 'Save changes' : 'Create vendor'}
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Spend" subtitle="Approved spend with this vendor" className="space-y-2">
          <p className="text-3xl font-semibold text-[var(--wp-color-text)]">${spend.toLocaleString()}</p>
          <p className="text-sm text-[var(--wp-color-text-muted)]">Includes closed and open purchase orders.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Contacts" subtitle="Keep buyer and sales rep info up to date" className="lg:col-span-2 space-y-3">
          {!contacts.length && <p className="text-sm text-[var(--wp-color-text-muted)]">No contacts added yet.</p>}
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={contact.id} className="flex flex-col gap-2 rounded-md border border-[var(--wp-color-border)] p-3 md:flex-row md:items-center md:gap-4">
                <Input
                  label="Name"
                  value={contact.name}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setContacts((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, name: event.target.value } : item)),
                    )
                  }
                />
                <Input
                  label="Role"
                  value={contact.role ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setContacts((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, role: event.target.value } : item)),
                    )
                  }
                />
                <Input
                  label="Email"
                  value={contact.email ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setContacts((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, email: event.target.value } : item)),
                    )
                  }
                />
                <Input
                  label="Phone"
                  value={contact.phone ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setContacts((prev) =>
                      prev.map((item, idx) => (idx === index ? { ...item, phone: event.target.value } : item)),
                    )
                  }
                />
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={handleAddContact}>
            Add contact
          </Button>
        </Card>

        <Card title="Attachments" subtitle="Contracts, W-9s, and safety docs" className="space-y-3">
          {!attachments.length && <p className="text-sm text-[var(--wp-color-text-muted)]">No attachments on file.</p>}
          <ul className="space-y-2 text-sm text-[var(--wp-color-text)]">
            {attachments.map((file) => (
              <li key={file.id} className="flex items-center justify-between rounded-md border border-[var(--wp-color-border)] px-3 py-2">
                <span>{file.name}</span>
                <span className="text-xs text-[var(--wp-color-text-muted)]">
                  {file.uploadedBy ? `Uploaded by ${file.uploadedBy}` : 'Uploaded'}{' '}
                  {file.uploadedAt ? formatDate(file.uploadedAt) : ''}
                </span>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm">
            Add attachment
          </Button>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Related purchase orders" className="lg:col-span-2">
          <DataTable
            columns={[
              { id: 'po', header: 'PO #', accessor: (po) => po.poNumber ?? po.id },
              { id: 'status', header: 'Status', accessor: (po) => <Badge text={po.status} type="status" /> },
              {
                id: 'lines',
                header: 'Lines',
                accessor: (po) => po.lines?.length ?? 0,
              },
            ]}
            data={relatedOrders}
            keyField="id"
            emptyMessage="No purchase orders for this vendor yet."
          />
        </Card>

        <Card title="Notes" subtitle="Share vendor communication" className="space-y-3">
          <TextArea
            label="Add note"
            placeholder="Record a call, agreement, or reminder"
            value={noteDraft}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setNoteDraft(event.target.value)}
          />
          <Button size="sm" onClick={handleAddNote} disabled={!noteDraft.trim()}>
            Save note
          </Button>
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-md border border-[var(--wp-color-border)] p-3">
                <p className="text-sm text-[var(--wp-color-text)]">{note.body}</p>
                <p className="mt-1 text-xs text-[var(--wp-color-text-muted)]">
                  {note.author ?? 'System'} • {note.createdAt ? formatDate(note.createdAt) : 'Just now'}
                </p>
              </div>
            ))}
            {!notes.length && <p className="text-sm text-[var(--wp-color-text-muted)]">No notes yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VendorEditor;

