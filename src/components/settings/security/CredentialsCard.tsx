'use client';

import { useEffect, useState, FormEvent } from 'react';
import { Lock, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';
import { AuthStatusResponse } from '@/types';
import { AUTH_USERNAME_REGEX } from '@/utils/authValidation';
import SettingsCard from '../shared/SettingsCard';

interface Props {
  status: AuthStatusResponse;
  onSaved: (message: string) => Promise<void>;
  onError: (message: string) => void;
}

export default function CredentialsCard({ status, onSaved, onError }: Props) {
  const [username, setUsername] = useState(status.username || 'admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUsername(status.username || 'admin');
  }, [status.username]);

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
  const currentPasswordOk = !status.authEnabled || currentPassword.length > 0;

  const canSubmit =
    !status.envManaged &&
    !saving &&
    usernameValid &&
    allRulesMet &&
    passwordsMatch &&
    currentPasswordOk;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          newPassword,
          currentPassword: status.authEnabled ? currentPassword : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        onError(data.error || 'Failed to save credentials');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.dispatchEvent(new Event('flightsentry:auth-changed'));
      await onSaved(
        status.authEnabled
          ? 'Credentials updated and other sessions signed out'
          : 'Authentication enabled — sign-in is now active'
      );
    } catch {
      onError('Network error while saving credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard>
      <div className="flex items-start gap-2.5 mb-4">
        <Lock className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-slate-100">
            {status.authEnabled ? 'Update Username & Password' : 'Enable Username & Password Sign-In'}
          </h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Passwords are salted per user and hashed with Node <code className="text-slate-300">crypto.scrypt</code>. Updating your password immediately revokes all other active sessions.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="security-username"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Username
            </label>
            <input
              id="security-username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={status.envManaged || saving}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full min-h-[44px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
            {!usernameValid && username.length > 0 && (
              <p className="text-[11px] text-rose-400 mt-1">
                3–32 characters: letters, numbers, dots, underscores, or hyphens.
              </p>
            )}
          </div>

          {status.authEnabled && (
            <div>
              <label
                htmlFor="security-current-password"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Current Password *
              </label>
              <div className="relative">
                <input
                  id="security-current-password"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={status.envManaged || saving}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required to confirm changes"
                  className="w-full min-h-[44px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((prev) => !prev)}
                  aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gunmetal-muted hover:text-slate-200 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="security-new-password"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              {status.authEnabled ? 'New Password *' : 'Password *'}
            </label>
            <div className="relative">
              <input
                id="security-new-password"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={status.envManaged || saving}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 10 characters"
                className="w-full min-h-[44px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gunmetal-muted hover:text-slate-200 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="security-confirm-password"
              className="block text-xs font-semibold text-slate-300 mb-1"
            >
              Confirm Password *
            </label>
            <input
              id="security-confirm-password"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              disabled={status.envManaged || saving}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full min-h-[44px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 disabled:opacity-50"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-[11px] text-rose-400 mt-1">Passwords do not match.</p>
            )}
          </div>
        </div>

        {/* Password complexity checklist */}
        <div className="flex flex-wrap gap-2">
          {rules.map((rule) => (
            <span
              key={rule.label}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border ${
                rule.met
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted'
              }`}
            >
              {rule.met ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <X className="w-3 h-3 text-slate-500" />
              )}
              <span>{rule.label}</span>
            </span>
          ))}
        </div>

        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {saving
                ? 'Saving...'
                : status.authEnabled
                ? 'Save Updated Credentials'
                : 'Enable Authentication'}
            </span>
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}