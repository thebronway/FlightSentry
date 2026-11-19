'use client';

import { useEffect, useState, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { AuthStatusResponse } from '@/types';
import { sanitizeRedirectPath } from '@/utils/authValidation';
import PasskeyLoginButton from './PasskeyLoginButton';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeNext = sanitizeRedirectPath(searchParams.get('next'));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasPasskeys, setHasPasskeys] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AuthStatusResponse | null) => {
        if (!active || !data) return;
        if (!data.authEnabled || data.authenticated) {
          router.replace(safeNext);
          return;
        }
        setHasPasskeys(Boolean(data.hasPasskeys));
        setCheckingSession(false);
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router, safeNext]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || cooldownSeconds > 0) return;

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        window.location.assign(safeNext);
        return;
      }

      if (res.status === 429 && typeof data.retryAfterSeconds === 'number') {
        setCooldownSeconds(data.retryAfterSeconds);
      }

      setError(data.error || 'Sign-in failed. Please check your credentials.');
    } catch {
      setError('Network error while signing in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-gunmetal-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <Image
            src="/FlightSentry-Main-icon-sm.png"
            alt="FlightSentry Logo"
            width={180}
            height={45}
            className="h-[46px] w-auto object-contain rounded mb-3"
          />
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Sign in to FlightSentry</h1>
          <p className="text-xs text-gunmetal-muted mt-1">
            Enter your credentials to access your flight dashboard
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-md bg-rose-950/45 border border-rose-700/70 text-rose-200 text-xs flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>
              {error}
              {cooldownSeconds > 0 ? ` (${cooldownSeconds}s remaining)` : ''}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="flightsentry-username"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Username
            </label>
            <input
              id="flightsentry-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              disabled={submitting || cooldownSeconds > 0}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full min-h-[44px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400 transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="flightsentry-password"
              className="block text-xs font-semibold text-slate-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="flightsentry-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                disabled={submitting || cooldownSeconds > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full min-h-[44px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gunmetal-muted hover:text-slate-200 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || cooldownSeconds > 0 || !username.trim() || !password}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Locked ({cooldownSeconds}s)</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <PasskeyLoginButton
          hasPasskeys={hasPasskeys}
          disabled={submitting || cooldownSeconds > 0}
          onSuccess={() => window.location.assign(safeNext)}
          onError={(msg) => setError(msg)}
        />
      </div>
    </div>
  );
}