'use client';

import { useEffect, useState, FormEvent } from 'react';
import { ShieldOff, X, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import SettingsModalPortal from '../shared/SettingsModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export default function DisableAuthModal({ isOpen, onClose, onDisabled }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPassword('');
    setShowPassword(false);
    setError('');
    setSubmitting(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !currentPassword) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auth/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        onDisabled();
        onClose();
        return;
      }
      setError(data.error || 'Failed to disable authentication');
    } catch {
      setError('Network error while disabling authentication');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
      >
        <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gunmetal-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-rose-400 min-w-0">
              <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/60 flex-shrink-0">
                <ShieldOff className="w-5 h-5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-100 truncate">Disable Authentication</h3>
                <p className="text-xs text-gunmetal-muted">Confirm with your current password</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-lg transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
            <div className="bg-amber-950/25 border border-amber-800/50 rounded-lg p-3 text-xs text-amber-200/90 leading-relaxed">
              Disabling authentication will immediately revoke all active sessions and allow anyone with network access to view and modify your FlightSentry dashboard without signing in.
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-md bg-rose-950/45 border border-rose-700/70 text-rose-200 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="disable-auth-password"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Current Password
              </label>
              <div className="relative">
                <input
                  id="disable-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full min-h-[44px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gunmetal-muted hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-gunmetal-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !currentPassword}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-rose-950/85 hover:bg-rose-900 text-rose-100 border border-rose-700/80 rounded-md transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? 'Disabling...' : 'Disable Authentication'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </SettingsModalPortal>
  );
}