import React, { useState } from "react";
import "../styles/platinum.css";

type PlatinumLoginVanillaProps = {
  onSubmit?: (email: string, password: string, remember: boolean) => Promise<void> | void;
  onGoogle?: () => void | Promise<void>;
  onGithub?: () => void | Promise<void>;
  errorMessage?: string | null;
};

export default function PlatinumLoginVanilla({
  onSubmit,
  onGoogle,
  onGithub,
  errorMessage,
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
    <div className="pl-wrap">
      <div className="pl-card">
        <section className="pl-left">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              style={{
                height: 36,
                width: 36,
                borderRadius: 12,
                background: "#dfe3ec",
                display: "grid",
                placeItems: "center",
                color: "#0c0f15",
                fontWeight: 800,
              }}
            >
              C
            </div>
            <div>
              <div style={{ fontWeight: 700, letterSpacing: "-.02em" }}>CMMS</div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: ".28em",
                  textTransform: "uppercase",
                  color: "#9aa2b1",
                }}
              >
                WorkPro Suite
              </div>
            </div>
          </div>

          <h1 className="pl-h1">Orchestrate maintenance workflows with breathtaking clarity.</h1>
          <p className="pl-sub">
            Predictive scheduling, real-time analytics, and collaboration—designed for teams who treat uptime as a
            promise.
          </p>

          <div className="pl-points">
            <div className="pl-point">
              <i>🔒</i>Zero-trust perimeter • enterprise-grade security
            </div>
            <div className="pl-point">
              <i>🤝</i>Collaboration, notifications, permits & audits
            </div>
            <div className="pl-point">
              <i>📈</i>KPI dashboards • trends • smart insights
            </div>
          </div>
        </section>

        <section className="pl-right">
          <h3 className="pl-title">Access your command center</h3>
          <p className="pl-muted">Sign in to continue</p>

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
        </section>
      </div>
    </div>
  );
}
