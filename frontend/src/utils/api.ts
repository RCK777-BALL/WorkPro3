export const api = {
  async login(payload: { email: string; password: string; remember: boolean }) {
    const res = await fetch(import.meta.env.VITE_API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },
  oauth(provider: "google" | "github") {
    window.location.href = (import.meta.env.VITE_API_BASE || "") + "/auth/" + provider;
  },
  me() {
    return fetch((import.meta.env.VITE_API_BASE || "") + "/auth/me", { credentials: "include" });
  }
};
