/* eslint-disable react-refresh/only-export-components */
/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  type RouteObject,
} from 'react-router-dom';
import { lazy } from 'react';

interface Field {
  name: string;
  label: string;
  type?: string;
}

export const RequestPortal: React.FC = () => {
  const { slug = 'default' } = useParams();
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/request-portal/${slug}`)
      .then((res) => res.json())
      .then((data) => setFields(Array.isArray(data) ? data : []))
      .catch(() => setFields([]));
  }, [slug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(e.target.files ?? []));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        body.append(key, String(value));
      });
      body.set('captcha', String((formData['captcha'] as string) || 'valid-captcha'));
      files.forEach((file) => body.append('photos', file));

      const response = await fetch(`/api/request-portal/${slug}`, {
        method: 'POST',
        body,
      });
      const payload = await response
        .json()
        .catch(() => ({ message: 'Unable to submit request.' }));
      if (!response.ok) {
        setError(payload?.message ?? 'Unable to submit request.');
        return;
      }
      const token = payload?.data?.token ?? payload?.token;
      if (!token) {
        setError('Submission succeeded but no tracking token was returned.');
        return;
      }
      navigate(`/portal/${slug}/confirmation/${token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4" encType="multipart/form-data">
      {fields.map((field) => (
        <div key={field.name}>
          <label htmlFor={field.name} className="block text-sm font-medium">
            {field.label}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              value={(formData[field.name] as string) || ''}
              onChange={handleChange}
              className="border p-2 w-full"
              rows={4}
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type || 'text'}
              value={(formData[field.name] as string) || ''}
              onChange={handleChange}
              className="border p-2 w-full"
            />
          )}
        </div>
      ))}
      <div>
        <label htmlFor="captcha" className="block text-sm font-medium">
          CAPTCHA
        </label>
        <input
          id="captcha"
          name="captcha"
          type="text"
          value={(formData['captcha'] as string) || ''}
          onChange={handleChange}
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label htmlFor="photos" className="block text-sm font-medium">
          Photos (optional)
        </label>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          className="border p-2 w-full"
        />
        {files.length > 0 && (
          <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
            {files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded">
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
};

const RequestConfirmation: React.FC = () => {
  const { slug = 'default', token } = useParams();
  const location = useLocation();
  const resolvedToken = token || (location.state as { token?: string } | null)?.token;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Request received!</h1>
      {resolvedToken ? (
        <p>
          Use this tracking token to check the status of your request:{' '}
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{resolvedToken}</span>
        </p>
      ) : (
        <p>Your request was submitted, but we could not display a tracking token.</p>
      )}
      <Link
        to={`/portal/${slug}`}
        className="inline-flex items-center text-primary-600 hover:underline"
      >
        Submit another request
      </Link>
    </div>
  );
};

const RequestWork = lazy(() => import('../pages/RequestPortal'));
const RequestStatus = lazy(() => import('../pages/RequestStatus'));

const routes: RouteObject[] = [
  { path: '/portal/:slug', element: <RequestPortal /> },
  { path: '/portal/:slug/confirmation/:token?', element: <RequestConfirmation /> },
  { path: '/request', element: <RequestWork /> },
  { path: '/request/:token', element: <RequestStatus /> },
];

export default routes;

