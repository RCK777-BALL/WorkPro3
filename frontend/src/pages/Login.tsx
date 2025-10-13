/*
 * SPDX-License-Identifier: MIT
 */

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { emitToast } from "../context/ToastContext";
import http, { SITE_KEY, TENANT_KEY, TOKEN_KEY } from "../lib/http";
import type { AuthMfaVerifyResponse, AuthSession } from "../types";
import { api, API_BASE } from "../utils/api";
import PlatinumLoginVanilla from "../components/PlatinumLoginVanilla";
import PlatinumLoginMfa from "../components/PlatinumLoginMfa";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type MfaLoginResponse = {
  mfaRequired: true;
  userId: string;
};

type LoginResult = AuthSession | MfaLoginResponse;

const Login: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [mfaUser, setMfaUser] = useState<string | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const emailFromOauth = params.get("email");

    if (token && emailFromOauth) {
      const id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}`;

      setUser({
        id,
        name: emailFromOauth.split("@")[0],
        role: "tech",
        email: emailFromOauth,
      });
      localStorage.setItem(TOKEN_KEY, token);
      navigate("/dashboard", { replace: true });
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", handler as EventListener);
  }, [location.search, navigate, setUser]);

  const promptInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowInstall(false);
  };

  const persistSession = (session: AuthSession) => {
    setUser({ ...session.user });
    if (session.token) {
      localStorage.setItem(TOKEN_KEY, session.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (session.user?.tenantId) localStorage.setItem(TENANT_KEY, session.user.tenantId);
    if (session.user?.siteId) localStorage.setItem(SITE_KEY, session.user.siteId);
  };

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    setError(null);
    try {
      const result = (await api.login({ email, password, remember })) as LoginResult;

      if ("mfaRequired" in result && result.mfaRequired) {
        setMfaUser(result.userId);
        return;
      }

      persistSession(result);
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message;
      const errorMessage = message || t("auth.loginFailed", "Login failed");
      emitToast(errorMessage, "error");
      setError(errorMessage);
    }
  };

  const handleVerify = async (code: string) => {
    if (!mfaUser) return;
    setError(null);
    try {
      const { data } = await http.post<AuthMfaVerifyResponse>("/auth/mfa/verify", {
        userId: mfaUser,
        token: code,
      });
      const session = data as AuthSession;
      persistSession(session);
      navigate("/dashboard", { replace: true });
    } catch {
      const invalidMessage = t("auth.invalidCode", "Invalid code");
      setError(invalidMessage);
      emitToast(invalidMessage, "error");
    }
  };

  const installSlot = showInstall ? (
    <div style={{ marginBottom: 16 }}>
      <button type="button" className="pl-btn" onClick={promptInstall}>
        {t("app.install", "Install App")}
      </button>
    </div>
  ) : null;

  const oauthBase = `${API_BASE}/auth/oauth`;

  if (mfaUser) {
    return (
      <PlatinumLoginMfa
        onSubmit={handleVerify}
        onCancel={() => {
          setMfaUser(null);
          setError(null);
        }}
        errorMessage={error}
        actionSlot={installSlot}
      />
    );
  }

  return (
    <PlatinumLoginVanilla
      onSubmit={handleLogin}
      onGoogle={() => (window.location.href = `${oauthBase}/google`)}
      onGithub={() => (window.location.href = `${oauthBase}/github`)}
      errorMessage={error}
      actionSlot={installSlot}
    />
  );
};

export default Login;
