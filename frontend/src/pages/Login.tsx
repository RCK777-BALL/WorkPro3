/*
 * SPDX-License-Identifier: MIT
 */

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', remember: true } });

  const onSubmit = async (values: FormValues) => {
    setServerMsg(null);
    try {
      await login(values.email, values.password, Boolean(values.remember));
      nav('/dashboard', { replace: true });
    } catch (e) {
      setServerMsg(getErrorMessage(e));
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-md bg-neutral-900/60 backdrop-blur rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-4">Access your command center</h1>
        {serverMsg && (
          <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
            {serverMsg}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-sm">Email</label>
            <input className="mt-1 w-full rounded-md bg-neutral-800 px-3 py-2 outline-none"
              type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input className="mt-1 w-full rounded-md bg-neutral-800 px-3 py-2 outline-none"
              type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('remember')} />
            Remember this device
          </label>
          <button disabled={isSubmitting}
            className="w-full rounded-md bg-white/90 text-black font-semibold py-2 disabled:opacity-50">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
