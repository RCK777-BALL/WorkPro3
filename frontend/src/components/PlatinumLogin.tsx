import React from "react";
import {
  ArrowRight,
  Github,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface PlatinumLoginProps {
  onSubmit: (email: string, password: string, remember: boolean) => void | Promise<void>;
  onGoogle: () => void;
  onGithub: () => void;
  errorMessage?: string | null;
  brandName?: string;
  productName?: string;
}

const gradients = [
  "bg-gradient-to-br from-slate-900/40 via-slate-800/40 to-zinc-900/40",
  "bg-gradient-to-br from-emerald-500/10 via-cyan-400/10 to-blue-500/10",
];

export default function PlatinumLogin({
  onSubmit,
  onGoogle,
  onGithub,
  errorMessage,
  brandName = "Platinum",
  productName = "CMMS Platform",
}: PlatinumLoginProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await onSubmit(email, password, remember);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-zinc-700/20 to-transparent lg:block" />
        <div className="absolute -left-10 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl sm:-left-20 sm:top-32" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.12),_transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-16 sm:px-10">
        <div className="mb-10 flex flex-col items-center text-center text-zinc-100">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.35em] text-zinc-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>{brandName}</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            {productName}
          </h1>
          <p className="mt-3 max-w-xl text-balance text-sm text-zinc-400 sm:text-base">
            Experience the platinum standard in maintenance intelligence—secure, predictive, and crafted for world-class operations.
          </p>
        </div>

        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className={`relative hidden overflow-hidden rounded-3xl border border-zinc-800/60 p-10 text-zinc-200 shadow-2xl backdrop-blur-xl lg:block ${gradients[0]}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_55%)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/50 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-emerald-200">
                  <Sparkles className="h-4 w-4" />
                  Platinum CMMS
                </div>
                <h2 className="text-3xl font-semibold leading-tight text-white">
                  Orchestrate maintenance workflows with breathtaking clarity.
                </h2>
                <p className="text-sm leading-relaxed text-zinc-300">
                  Stay ahead with predictive scheduling, real-time analytics, and intelligent collaboration tools. Designed for teams who treat uptime as a promise.
                </p>
              </div>

              <div className="mt-8 grid gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6 backdrop-blur">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Zero-trust perimeter</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Enterprise-grade security hardened for the modern facility.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-200">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Intelligent automations</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Automate inspections, compliance, and asset lifecycle monitoring.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`relative overflow-hidden rounded-3xl border border-zinc-800/60 bg-zinc-950/70 p-8 shadow-2xl backdrop-blur-xl sm:p-10 ${gradients[1]}`}>
            <form onSubmit={handleSubmit} className="relative z-10 space-y-6 text-zinc-100">
              <div>
                <p className="text-sm text-zinc-400">Sign in to continue</p>
                <h2 className="text-2xl font-semibold text-white">Access your command center</h2>
              </div>

              <label className="block text-sm font-medium text-zinc-300">
                Email
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-700/70 bg-zinc-900/80 px-4 py-3 shadow-inner shadow-black/20 focus-within:border-emerald-400/70 focus-within:bg-zinc-900/90">
                  <Mail className="h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@enterprise.com"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>

              <label className="block text-sm font-medium text-zinc-300">
                Password
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-700/70 bg-zinc-900/80 px-4 py-3 shadow-inner shadow-black/20 focus-within:border-emerald-400/70 focus-within:bg-zinc-900/90">
                  <Lock className="h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                  />
                </div>
              </label>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-900/80 text-emerald-500 focus:ring-emerald-400"
                  />
                  Remember this device
                </label>
                <div className="flex items-center gap-3 text-xs text-emerald-200">
                  <a href="/forgot-password" className="transition hover:text-emerald-100">
                    Forgot password?
                  </a>
                  <span className="text-zinc-600">/</span>
                  <a href="/register" className="transition hover:text-emerald-100">
                    Create account
                  </a>
                </div>
              </div>

              {errorMessage ? (
                <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{submitting ? "Signing in" : "Sign in"}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="space-y-3">
                <p className="text-center text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Or continue with
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onGoogle}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-700/70 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-white transition hover:border-emerald-400/60 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      Google SSO
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={onGithub}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-700/70 bg-zinc-900/80 px-4 py-3 text-sm font-medium text-white transition hover:border-emerald-400/60 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    <Github className="h-4 w-4" />
                    GitHub
                  </button>
                </div>
              </div>
            </form>

            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
