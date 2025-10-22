import React, { useState } from "react";
import PlatinumLoginFrame from "./PlatinumLoginFrame";

type PlatinumLoginMfaProps = {
  onSubmit?: (code: string) => Promise<void> | void;
  onCancel?: () => void;
  errorMessage?: string | null;
  actionSlot?: React.ReactNode;
};

export default function PlatinumLoginMfa({
  onSubmit,
  onCancel,
  errorMessage,
  actionSlot,
}: PlatinumLoginMfaProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onSubmit?.(code);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlatinumLoginFrame
      title="Verify your identity"
      subtitle="Enter the six-digit code from your authenticator"
      actionSlot={actionSlot}
    >
      {errorMessage && <div className="pl-alert">{errorMessage}</div>}

      <form onSubmit={submit}>
        <div className="pl-field">
          <label className="pl-label" htmlFor="mfa-code">
            One-time code
          </label>
          <input
            id="mfa-code"
            type="text"
            className="pl-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            required
          />
        </div>

        <div className="pl-row" style={{ marginTop: 12 }}>
          <button type="button" className="pl-ghost" onClick={onCancel}>
            Back
          </button>
          <button type="submit" className="pl-btn" disabled={busy}>
            {busy ? "Verifying…" : "Verify"}
          </button>
        </div>
      </form>
    </PlatinumLoginFrame>
  );
}
