'use client';

import { useEffect, useState, useCallback, FormEvent } from 'react';
import { ShieldCheck, ShieldOff, Lock, Fingerprint, KeyRound, Eye, EyeOff, Check, X, Loader2, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthStatusResponse } from '@/types';
import { AUTH_USERNAME_REGEX } from '@/utils/authValidation';
import SettingsCard from '@/components/settings/shared/SettingsCard';
import { OnboardingStepProps } from '../types';

export default function SecurityStep({ onSkipToSettingsLater }: OnboardingStepProps) {
  const [status, setStatus] = useState<AuthStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState('admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const data: AuthStatusResponse = await res.json();
        setStatus(data);
        if (data.username) setUsername(data.username);
      }
    } catch {
      // Ignore transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAuthStatus();
  }, [fetchAuthStatus]);

  const rules = [
    { label: '10+ characters', met: newPassword.length >= 10 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter', met: /[a-z]/.test(newPassword) },
    {
      label: 'Number or symbol',
      met: /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword),
    },
  ];

  const allRulesMet = rules.every((r) => r.met);
  const usernameValid = AUTH_USERNAME_REGEX.test(username.trim());
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canEnable =
    !status?.envManaged &&
    !status?.authEnabled &&
    !savingAuth &&
    usernameValid &&
    allRulesMet &&
    passwordsMatch;

  const handleEnableAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEnable) return;

    setSavingAuth(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setNewPassword('');
        setConfirmPassword('');
        window.dispatchEvent(new Event('flightsentry:auth-changed'));
        await fetchAuthStatus();
        setFeedback({
          type: 'success',
          message: `Authentication enabled for "${data.username || username.trim()}"! Your current browser session is signed in.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to enable authentication',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Network error while enabling authentication',
      });
    } finally {
      setSavingAuth(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Protection Status */}
      <SettingsCard className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {status?.authEnabled ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldOff className="w-4 h-4 text-gunmetal-muted" />
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              1. Instance Access Protection
            </span>
          </div>

          {!loading && status && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                status.authEnabled
                  ? 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
                  : 'bg-zinc-900 border-gunmetal-border text-gunmetal-muted'
              }`}
            >
              {status.authEnabled
                ? `Enabled (${status.username})`
                : 'Disabled (Open Local Access)'}
            </span>
          )}
        </div>

        <p className="text-xs text-gunmetal-muted leading-relaxed">
          Authentication is <strong>disabled by default</strong> so local homelab deployments work immediately without friction. If you expose FlightSentry over a shared network or reverse proxy, enable login credentials below—or leave it unlocked and enable it later in <strong>Settings → Security</strong>.
        </p>

        {status?.envManaged && (
          <div className="p-3 rounded-lg bg-sky-950/30 border border-sky-800/50 text-xs text-sky-200 flex items-start gap-2">
            <Terminal className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
            <span>
              Credentials are managed via <code className="text-sky-100">AUTH_USERNAME</code> and{' '}
              <code className="text-sky-100">AUTH_PASSWORD</code> environment variables.
            </span>
          </div>
        )}

        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-700/70 text-emerald-200'
                : 'bg-rose-950/45 border-rose-700/70 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {!loading && status && !status.authEnabled && !status.envManaged && (
          <form onSubmit={handleEnableAuth} className="pt-2 border-t border-gunmetal-border/70 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="10+ chars"
                    className="w-full min-h-[40px] pl-3 pr-9 py-1.5 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 px-2.5 flex items-center text-gunmetal-muted hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {rules.map((r) => (
                  <span
                    key={r.label}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                      r.met
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted'
                    }`}
                  >
                    {r.met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{r.label}</span>
                  </span>
                ))}
              </div>

              <button
                type="submit"
                disabled={!canEnable}
                className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold shadow-sm transition-colors text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
              >
                {savingAuth ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span>{savingAuth ? 'Enabling...' : 'Enable Login Protection'}</span>
              </button>
            </div>
          </form>
        )}
      </SettingsCard>

      {/* 2. WebAuthn Passkeys & Public REST API Keys */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <SettingsCard className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
            <Fingerprint className="w-4 h-4 text-sky-400" />
            <span>2. WebAuthn Passkeys</span>
          </div>
          <p className="text-xs text-gunmetal-muted leading-relaxed">
            Once password login is enabled, you can enroll Touch ID, Face ID, YubiKeys, or password manager passkeys in <strong>Settings → Security</strong> (requires HTTPS or <code className="text-slate-300">localhost</code>).
          </p>
        </SettingsCard>

        <SettingsCard className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>3. Public REST API &amp; Scoped Keys</span>
          </div>
          <p className="text-xs text-gunmetal-muted leading-relaxed">
            Issue scoped bearer tokens (<code className="text-slate-300">fss_live_...</code> with <code className="text-slate-300">read</code>, <code className="text-slate-300">write</code>, or <code className="text-slate-300">admin</code> permissions) in <strong>Settings → Security</strong> for Home Assistant, n8n, Homepage, or TRMNL widgets, and explore <code className="text-slate-300">/api-docs</code>.
          </p>
        </SettingsCard>
      </div>

      </div>
  );
}