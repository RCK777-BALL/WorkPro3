/*
 * SPDX-License-Identifier: MIT
 */

import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

type PublicStatus = {
  token: string;
  status: string;
  title: string;
  description?: string;
  createdAt?: string;
  workOrderId?: string;
  photos?: string[];
};

type SubmissionResponse = {
  requestId: string;
  token: string;
  status: string;
};

const initialFormState = {
  title: '',
  description: '',
  requesterName: '',
  requesterEmail: '',
  requesterPhone: '',
  location: '',
  assetTag: '',
};

export default function PublicRequestPage() {
  const { slug = 'default' } = useParams();
  const [values, setValues] = useState(initialFormState);
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusToken, setStatusToken] = useState('');
  const [submissionResult, setSubmissionResult] = useState<SubmissionResponse | null>(null);
  const [statusResult, setStatusResult] = useState<PublicStatus | null>(null);
  const [error, setError] = useState<string>();

  const isFormValid = useMemo(() => {
    return Boolean(values.title && values.description && values.requesterName);
  }, [values]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(event.target.files);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value);
        }
      });
      formData.append('formSlug', slug);
      if (files) {
        Array.from(files).forEach((file) => formData.append('photos', file));
      }
      const response = await fetch('/api/public/work-requests', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to submit request.');
      }
      const submission: SubmissionResponse = payload.data ?? payload;
      setSubmissionResult(submission);
      setStatusToken(submission.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit request.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = statusToken.trim();
    if (!trimmed) return;
    setError(undefined);
    try {
      const response = await fetch(`/api/public/work-requests/${encodeURIComponent(trimmed)}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to find request.');
      }
      setStatusResult(payload.data ?? payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to lookup request.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 md:flex-row">
        <section className="flex-1 rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="text-2xl font-semibold text-neutral-900">Submit a work request</h1>
          <p className="mt-1 text-sm text-neutral-500">Let our maintenance team know what needs attention at your site.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="title" className="text-sm font-medium text-neutral-700">
                Title
              </label>
              <input
                id="title"
                name="title"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                value={values.title}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium text-neutral-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                rows={4}
                value={values.description}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="requesterName" className="text-sm font-medium text-neutral-700">
                  Your name
                </label>
                <input
                  id="requesterName"
                  name="requesterName"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  value={values.requesterName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="requesterEmail" className="text-sm font-medium text-neutral-700">
                  Email
                </label>
                <input
                  id="requesterEmail"
                  name="requesterEmail"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  value={values.requesterEmail}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="requesterPhone" className="text-sm font-medium text-neutral-700">
                  Phone
                </label>
                <input
                  id="requesterPhone"
                  name="requesterPhone"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  value={values.requesterPhone}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="location" className="text-sm font-medium text-neutral-700">
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  value={values.location}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label htmlFor="assetTag" className="text-sm font-medium text-neutral-700">
                Asset tag (optional)
              </label>
              <input
                id="assetTag"
                name="assetTag"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                value={values.assetTag}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="photos" className="text-sm font-medium text-neutral-700">
                Photos
              </label>
              <input
                id="photos"
                name="photos"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFiles}
                className="mt-1 block w-full text-sm text-neutral-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-70"
              disabled={!isFormValid || submitting}
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </button>
            {submissionResult && (
              <div className="space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <p>
                  Thank you! Save this token to check status later: <strong>{submissionResult.token}</strong>
                </p>
                <p>
                  You can always open <a className="font-semibold underline" href={`/request/${submissionResult.token}`}>work request status</a> to see technician updates.
                </p>
              </div>
            )}
          </form>
        </section>
        <section className="flex-1 rounded-2xl bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-neutral-900">Check a request</h2>
          <p className="mt-1 text-sm text-neutral-500">Enter your token to view the latest status and attachments.</p>
          <form className="mt-4 space-y-4" onSubmit={handleStatusLookup}>
            <div>
              <label htmlFor="statusToken" className="text-sm font-medium text-neutral-700">
                Request token
              </label>
              <input
                id="statusToken"
                name="statusToken"
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                value={statusToken}
                onChange={(event) => setStatusToken(event.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Check status
            </button>
          </form>
          {statusResult && (
            <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Status</p>
              <p className="text-lg font-semibold text-neutral-900">{statusResult.status}</p>
              <p className="mt-4 text-sm font-medium text-neutral-800">{statusResult.title}</p>
              <p className="text-sm text-neutral-500">{statusResult.description}</p>
              {statusResult.workOrderId && (
                <p className="mt-2 text-sm text-neutral-500">Linked work order: {statusResult.workOrderId}</p>
              )}
              <a
                href={`/request/${statusResult.token}`}
                className="mt-3 inline-flex text-sm font-semibold text-primary-600 hover:underline"
              >
                View detailed timeline
              </a>
              {statusResult.photos && statusResult.photos.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-neutral-500">Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {statusResult.photos.map((photo) => (
                      <a
                        key={photo}
                        href={`/static/uploads/${photo}`}
                        className="inline-flex items-center rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:border-neutral-400"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
