"use client";

import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin ? { admin: true, password } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign in failed");
      const next = new URLSearchParams(window.location.search).get("next");
      // Only follow same-site paths.
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-[var(--navy-800)] px-4 py-3 text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[var(--navy-900)] to-[var(--navy-950)] px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <img src="/newshift-logo-white.svg" alt="NewShift AI" className="h-12 w-auto" />
        </Link>
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-[var(--navy-900)] p-6">
          <h1 className="text-xl font-semibold">{admin ? "NewShift admin" : "Sign in to your shop"}</h1>
          {!admin && (
            <input className={input} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          )}
          <input
            className={input}
            type="password"
            placeholder={admin ? "Admin password" : "Password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</div>}
          <button disabled={busy} className="w-full rounded-xl bg-sky-400 py-3 font-bold text-[var(--navy-950)] disabled:opacity-60">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="mt-4 space-y-2 text-center text-sm text-slate-400">
          {!admin && (
            <div>
              New here?{" "}
              <Link href="/setup" className="text-sky-300 hover:underline">
                Set up your shop
              </Link>
            </div>
          )}
          <button onClick={() => setAdmin(!admin)} className="text-xs text-slate-500 hover:text-slate-300">
            {admin ? "← Shop sign in" : "NewShift admin"}
          </button>
        </div>
      </div>
    </main>
  );
}
