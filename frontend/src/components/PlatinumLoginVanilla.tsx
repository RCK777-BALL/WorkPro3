import React, { useState } from "react";
import PlatinumLoginFrame from "./PlatinumLoginFrame";

type PlatinumLoginVanillaProps = {
  onSubmit?: (email: string, password: string, remember: boolean) => Promise<void> | void;
  onGoogle?: () => void | Promise<void>;
  onGithub?: () => void | Promise<void>;
  errorMessage?: string | null;
  actionSlot?: React.ReactNode;
};

export default function PlatinumLoginVanilla({
  onSubmit,
  onGoogle,
  onGithub,
  errorMessage,
  actionSlot,
}: PlatinumLoginVanillaProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit?.(email, password, remember);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlatinumLoginFrame title="Access your command center" subtitle="Sign in to continue" actionSlot={actionSlot}>
      {errorMessage && <div className="pl-alert">{errorMessage}</div>}

      <form onSubmit={submit}>
        <div className="pl-field">
          <label className="pl-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="pl-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="pl-field">
          <label className="pl-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="pl-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="pl-row">
          <label className="pl-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Remember this device
          </label>
          <a href="/forgot">Forgot password?</a>
        </div>

        <button className="pl-btn" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <div className="pl-sep">or continue with</div>
        <div className="pl-oauth">
          <button type="button" className="pl-ghost" onClick={() => onGoogle?.()}>
            Google SSO
          </button>
          <button type="button" className="pl-ghost" onClick={() => onGithub?.()}>
            GitHub
          </button>
        </div>
        <div className="pl-footer">
          No account? <a href="/register">Create account</a>
        </div>
      </form>
    </PlatinumLoginFrame>
  );
}
