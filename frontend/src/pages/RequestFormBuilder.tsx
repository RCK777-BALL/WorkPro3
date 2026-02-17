/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import {
  createRequestType,
  fetchRequestTypes,
  saveRequestForm,
  type RequestAttachmentDefinition,
  type RequestFieldDefinition,
  type RequestTypeItem,
} from '@/api/requestTypes';

const cardClass = 'rounded-xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-5 shadow-sm';

const inputClass =
  'mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2 text-sm focus:border-primary-500 focus:outline-none';

const labelClass = 'text-sm font-medium text-[var(--wp-color-text)]';

const AttachmentRow = ({
  attachment,
  onChange,
  onRemove,
}: {
  attachment: RequestAttachmentDefinition;
  onChange: (update: RequestAttachmentDefinition) => void;
  onRemove: () => void;
}) => (
  <div className="flex flex-col gap-2 rounded-lg border border-[var(--wp-color-border)] p-3 md:flex-row md:items-end">
    <div className="flex-1">
      <label className={labelClass}>Key</label>
      <input
        className={inputClass}
        value={attachment.key}
        onChange={(e) => onChange({ ...attachment, key: e.target.value })}
      />
    </div>
    <div className="flex-1">
      <label className={labelClass}>Label</label>
      <input
        className={inputClass}
        value={attachment.label}
        onChange={(e) => onChange({ ...attachment, label: e.target.value })}
      />
    </div>
    <div className="flex-1">
      <label className={labelClass}>Accepted types (comma separated)</label>
      <input
        className={inputClass}
        value={(attachment.accept ?? []).join(', ')}
        onChange={(e) =>
          onChange({ ...attachment, accept: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })
        }
        placeholder="image/png, image/jpeg"
      />
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm text-[var(--wp-color-text-muted)]">
        <input
          type="checkbox"
          className="mr-2"
          checked={Boolean(attachment.required)}
          onChange={(e) => onChange({ ...attachment, required: e.target.checked })}
        />
        Required
      </label>
      <button type="button" className="text-sm text-red-600" onClick={onRemove}>
        Remove
      </button>
    </div>
  </div>
);

const FieldRow = ({
  field,
  onChange,
  onRemove,
}: {
  field: RequestFieldDefinition;
  onChange: (update: RequestFieldDefinition) => void;
  onRemove: () => void;
}) => (
  <div className="flex flex-col gap-2 rounded-lg border border-[var(--wp-color-border)] p-3 md:flex-row md:items-end">
    <div className="flex-1">
      <label className={labelClass}>Key</label>
      <input className={inputClass} value={field.key} onChange={(e) => onChange({ ...field, key: e.target.value })} />
    </div>
    <div className="flex-1">
      <label className={labelClass}>Label</label>
      <input
        className={inputClass}
        value={field.label}
        onChange={(e) => onChange({ ...field, label: e.target.value })}
      />
    </div>
    <div className="flex-1">
      <label className={labelClass}>Type</label>
      <select
        className={inputClass}
        value={field.type ?? 'text'}
        onChange={(e) => onChange({ ...field, type: e.target.value as RequestFieldDefinition['type'] })}
      >
        <option value="text">Text</option>
        <option value="textarea">Textarea</option>
        <option value="select">Select</option>
        <option value="number">Number</option>
        <option value="checkbox">Checkbox</option>
      </select>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-sm text-[var(--wp-color-text-muted)]">
        <input
          type="checkbox"
          className="mr-2"
          checked={Boolean(field.required)}
          onChange={(e) => onChange({ ...field, required: e.target.checked })}
        />
        Required
      </label>
      <button type="button" className="text-sm text-red-600" onClick={onRemove}>
        Remove
      </button>
    </div>
  </div>
);

export default function RequestFormBuilder() {
  const [requestTypes, setRequestTypes] = useState<RequestTypeItem[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [typeForm, setTypeForm] = useState({ name: '', slug: '', category: '', requiredFields: '' });
  const [formSlug, setFormSlug] = useState('default');
  const [formName, setFormName] = useState('Public request form');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('');
  const [fields, setFields] = useState<RequestFieldDefinition[]>([]);
  const [attachments, setAttachments] = useState<RequestAttachmentDefinition[]>([]);
  const [savingForm, setSavingForm] = useState(false);
  const [creatingType, setCreatingType] = useState(false);

  const loadTypes = async () => {
    setLoadingTypes(true);
    try {
      const types = await fetchRequestTypes();
      setRequestTypes(types);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load request types';
      toast.error(message);
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, []);

  const addField = () => setFields((prev) => [...prev, { key: '', label: '', type: 'text', required: false }]);
  const addAttachment = () => setAttachments((prev) => [...prev, { key: '', label: '', required: false }]);

  const handleCreateType = async () => {
    setCreatingType(true);
    try {
      const requiredFields = typeForm.requiredFields
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const created = await createRequestType({
        name: typeForm.name,
        slug: typeForm.slug,
        category: typeForm.category,
        requiredFields,
        attachments,
        fields,
      });
      setRequestTypes((prev) => [...prev, created]);
      toast.success('Request type created');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save request type';
      toast.error(message);
    } finally {
      setCreatingType(false);
    }
  };

  const handleSaveForm = async () => {
    setSavingForm(true);
    try {
      await saveRequestForm(formSlug, {
        name: formName,
        description: formDescription,
        requestType: formType || undefined,
        fields,
        attachments,
      });
      toast.success('Form configuration saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save form configuration';
      toast.error(message);
    } finally {
      setSavingForm(false);
    }
  };

  const selectedType = useMemo(() => requestTypes.find((type) => type._id === formType), [formType, requestTypes]);

  useEffect(() => {
    if (selectedType) {
      setFields((prev) => (prev.length ? prev : selectedType.fields));
      setAttachments((prev) => (prev.length ? prev : selectedType.attachments));
    }
  }, [selectedType]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Request form builder</h1>
          <p className="text-sm text-[var(--wp-color-text-muted)]">
            Define request types, required fields, and attachment expectations before publishing the portal form.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--wp-color-text)]">Request types</h2>
              <p className="text-sm text-[var(--wp-color-text-muted)]">Set required fields and attachment expectations.</p>
            </div>
            {loadingTypes && <span className="text-xs text-[var(--wp-color-text-muted)]">Loading…</span>}
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={inputClass}
                value={typeForm.name}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Urgent safety"
              />
            </div>
            <div>
              <label className={labelClass}>Slug</label>
              <input
                className={inputClass}
                value={typeForm.slug}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="safety"
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input
                className={inputClass}
                value={typeForm.category}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="safety"
              />
            </div>
            <div>
              <label className={labelClass}>Required fields (comma separated)</label>
              <input
                className={inputClass}
                value={typeForm.requiredFields}
                onChange={(e) => setTypeForm((prev) => ({ ...prev, requiredFields: e.target.value }))}
                placeholder="assetTag, location"
              />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--wp-color-text)]">Attachments</h3>
              <button
                type="button"
                className="text-sm font-semibold text-primary-600"
                onClick={addAttachment}
              >
                Add attachment
              </button>
            </div>
            <div className="space-y-2">
              {attachments.length === 0 && <p className="text-sm text-[var(--wp-color-text-muted)]">No attachments defined yet.</p>}
              {attachments.map((attachment, index) => (
                <AttachmentRow
                  key={attachment.key || index}
                  attachment={attachment}
                  onChange={(update) =>
                    setAttachments((prev) => prev.map((item, idx) => (idx === index ? update : item)))
                  }
                  onRemove={() => setAttachments((prev) => prev.filter((_, idx) => idx !== index))}
                />
              ))}
            </div>
            <button
              type="button"
              className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-[var(--wp-color-text)] transition hover:bg-primary-700 disabled:opacity-60"
              onClick={handleCreateType}
              disabled={creatingType}
            >
              {creatingType ? 'Saving type…' : 'Save request type'}
            </button>
          </div>
        </section>

        <section className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--wp-color-text)]">Form designer</h2>
              <p className="text-sm text-[var(--wp-color-text-muted)]">Bind a portal slug to a request type and validation schema.</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <label className={labelClass}>Form slug</label>
              <input className={inputClass} value={formSlug} onChange={(e) => setFormSlug(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Form name</label>
              <input className={inputClass} value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={inputClass}
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Request type</label>
              <select className={inputClass} value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="">Select a type</option>
                {requestTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name} ({type.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--wp-color-text)]">Fields</h3>
              <button type="button" className="text-sm font-semibold text-primary-600" onClick={addField}>
                Add field
              </button>
            </div>
            <div className="space-y-2">
              {fields.length === 0 && <p className="text-sm text-[var(--wp-color-text-muted)]">No fields configured yet.</p>}
              {fields.map((field, index) => (
                <FieldRow
                  key={field.key || index}
                  field={field}
                  onChange={(update) => setFields((prev) => prev.map((item, idx) => (idx === index ? update : item)))}
                  onRemove={() => setFields((prev) => prev.filter((_, idx) => idx !== index))}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--wp-color-text)]">Attachment requirements</h3>
              <button type="button" className="text-sm font-semibold text-primary-600" onClick={addAttachment}>
                Add requirement
              </button>
            </div>
            <div className="space-y-2">
              {attachments.length === 0 && <p className="text-sm text-[var(--wp-color-text-muted)]">No attachment requirements yet.</p>}
              {attachments.map((attachment, index) => (
                <AttachmentRow
                  key={`${attachment.key}-form-${index}`}
                  attachment={attachment}
                  onChange={(update) =>
                    setAttachments((prev) => prev.map((item, idx) => (idx === index ? update : item)))
                  }
                  onRemove={() => setAttachments((prev) => prev.filter((_, idx) => idx !== index))}
                />
              ))}
            </div>

            <button
              type="button"
              className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-[var(--wp-color-text)] transition hover:bg-primary-700 disabled:opacity-60"
              onClick={handleSaveForm}
              disabled={savingForm}
            >
              {savingForm ? 'Saving form…' : 'Publish form'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

