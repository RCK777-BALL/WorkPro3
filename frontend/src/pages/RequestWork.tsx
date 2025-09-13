/*
 * SPDX-License-Identifier: MIT
 */

import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import http from '@/lib/http';

const requestWorkSchema = z.object({
  assetId: z.string().optional(),
  locationText: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  contact: z.string().min(1, 'Contact is required'),
});

export type RequestWorkForm = z.infer<typeof requestWorkSchema>;

const POLL_INTERVAL = 1000;

const RequestWork = () => {
  const resolver: Resolver<RequestWorkForm> = async (values) => {
    const result = requestWorkSchema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const fieldErrors = result.error.flatten().fieldErrors;
    const errors = Object.fromEntries(
      Object.entries(fieldErrors).map(([key, value]) => [
        key,
        { type: 'validation', message: value?.[0] ?? 'Invalid value' },
      ]),
    );
    return { values: {} as RequestWorkForm, errors };
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestWorkForm>({ resolver });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!code) return;
    const interval = setInterval(async () => {
      try {
        const res = await http.get(`/public/request-work/${code}`);
        setStatus(res.data.data.status);
        if (res.data.data.status && res.data.data.status !== 'pending') {
          clearInterval(interval);
        }
      } catch (err) {
        setError('Failed to fetch status');
        clearInterval(interval);
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [code]);

  const onSubmit = async (values: RequestWorkForm) => {
    setLoading(true);
    setError(null);
    try {
      const res = await http.post('/public/request-work', values);
      setCode(res.data.data.code);
      setStatus('pending');
    } catch (err) {
      setError('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Request Work</h1>
      {error && <p role="alert" className="text-red-500">{error}</p>}
      {!code && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="assetId" className="block text-sm font-medium">Asset ID</label>
            <input id="assetId" className="border p-2 w-full" {...register('assetId')} />
          </div>
          <div>
            <label htmlFor="locationText" className="block text-sm font-medium">Location</label>
            <input id="locationText" className="border p-2 w-full" {...register('locationText')} />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium">Description</label>
            <textarea
              id="description"
              className="border p-2 w-full"
              {...register('description')}
            />
            {errors.description && <p className="text-red-500">{errors.description.message}</p>}
          </div>
          <div>
            <label htmlFor="contact" className="block text-sm font-medium">Contact</label>
            <input id="contact" className="border p-2 w-full" {...register('contact')} />
            {errors.contact && <p className="text-red-500">{errors.contact.message}</p>}
          </div>
          <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      )}
      {code && (
        <div className="space-y-2">
          <p>
            Code: <span className="font-mono" data-testid="code">{code}</span>
          </p>
          <p>
            Status: <span data-testid="status">{status}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default RequestWork;

