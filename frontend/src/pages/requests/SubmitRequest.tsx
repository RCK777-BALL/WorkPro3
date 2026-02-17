/*
 * SPDX-License-Identifier: MIT
 */

import { useState } from 'react';
import { toast } from 'react-hot-toast';

import http from '@/lib/http';

type SubmissionPayload = {
  title: string;
  description: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  location?: string;
  assetTag?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  formSlug?: string;
  requestFormId?: string;
};

const initialPayload: SubmissionPayload = {
  title: '',
  description: '',
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
  location: '',
  assetTag: '',
  formSlug: 'default',
  priority: 'medium',
};

export default function SubmitRequest() {
  const [payload, setPayload] = useState<SubmissionPayload>(initialPayload);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string>();

  const handleChange = (key: keyof SubmissionPayload, value: string) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    setSubmitting(true);
    setToken(undefined);
    try {
      const response = await http.post('/requests', payload);
      const created = response.data as { token?: string };
      setToken(created.token);
      toast.success('Request submitted');
      setPayload(initialPayload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit request.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-3xl bg-[var(--wp-color-surface)] p-6 shadow-lg">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--wp-color-text)]">Submit a request</h1>
        <p className="text-sm text-[var(--wp-color-text-muted)]">Capture a new maintenance request and share contact details.</p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Title
            <input
              required
              value={payload.title}
              onChange={(evt) => handleChange('title', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="Short summary"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Priority
            <select
              value={payload.priority}
              onChange={(evt) => handleChange('priority', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>

        <label className="block space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
          Description
          <textarea
            required
            value={payload.description}
            onChange={(evt) => handleChange('description', evt.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
            rows={4}
            placeholder="What do you need help with?"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Your name
            <input
              required
              value={payload.requesterName}
              onChange={(evt) => handleChange('requesterName', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="Taylor User"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Email
            <input
              type="email"
              value={payload.requesterEmail}
              onChange={(evt) => handleChange('requesterEmail', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="you@example.com"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Phone
            <input
              value={payload.requesterPhone}
              onChange={(evt) => handleChange('requesterPhone', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="(555) 123-4567"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Location
            <input
              value={payload.location}
              onChange={(evt) => handleChange('location', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="Line A"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Asset tag
            <input
              value={payload.assetTag}
              onChange={(evt) => handleChange('assetTag', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="AS-1024"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Request form slug
            <input
              value={payload.formSlug}
              onChange={(evt) => handleChange('formSlug', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="default"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-[var(--wp-color-text)]">
            Form ID (optional)
            <input
              value={payload.requestFormId}
              onChange={(evt) => handleChange('requestFormId', evt.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--wp-color-border)] px-3 py-2"
              placeholder="Form ObjectId"
            />
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-[var(--wp-color-text)] disabled:opacity-60"
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit request'}
        </button>
      </form>

      {token && (
        <div className="rounded-2xl border border-[var(--wp-color-border)] bg-[var(--wp-color-surface)] p-4 text-sm text-[var(--wp-color-text)]">
          Request token: <span className="font-mono text-[var(--wp-color-text)]">{token}</span>
        </div>
      )}
    </div>
  );
}

