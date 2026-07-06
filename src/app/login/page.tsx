"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  const { login, configured } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password, remember);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        configured
          ? "Invalid email or password."
          : err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <Brand size="lg" center />
        <h1 className="mt-6 text-center font-serif text-2xl font-semibold text-foreground">
          Welcome back
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          Sign in to manage classrooms and student data.
        </p>

        {!configured && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            Firebase is not configured yet. Add your project keys to
            .env.local to enable sign-in.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="flex select-none items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            Remember me
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
