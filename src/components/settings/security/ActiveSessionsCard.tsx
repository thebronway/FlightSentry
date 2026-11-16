'use client';

import { useState } from 'react';
import { MonitorSmartphone, LogOut, Loader2, Clock } from 'lucide-react';
import { AuthSessionPublic } from '@/types';
import { SESSION_DURATION_OPTIONS } from '@/utils/authValidation';
import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';

interface Props {
  authEnabled: boolean;
  sessionDurationDays: number;
  sessions: AuthSessionPublic[];
  onRefresh: () => Promise<void>;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function summarizeUserAgent(ua?: string | null): string {
  if (!ua) return 'Unknown browser / device';
  if (/iPhone|iPad/i.test(ua)) return 'iOS / iPadOS Safari';
  if (/Android/i.test(ua)) return 'Android Browser';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Google Chrome';
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return 'Apple Safari';
  return ua.slice(0, 48);
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActiveSessionsCard({
  authEnabled,
  sessionDurationDays,
  sessions,
  onRefresh,
  onNotify,
}: Props) {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);

  if (!authEnabled) {
    return null;
  }

  const handleDurationChange = async (newDays: number) => {
    if (savingDuration || newDays === sessionDurationDays) return;
    setSavingDuration(true);
    try {
      const res = await fetch('/api/auth/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionDurationDays: newDays }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await onRefresh();
        const label =
          SESSION_DURATION_OPTIONS.find((opt) => opt.days === newDays)?.label.replace(' (Default)', '') ||
          `${newDays} days`;
        onNotify(`New session lifetime set to ${label}`, 'success');
      } else {
        onNotify(data.error || 'Failed to update session lifetime', 'error');
      }
    } catch {
      onNotify('Network error updating session lifetime', 'error');
    } finally {
      setSavingDuration(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  const handleRevokeSession = async (session: AuthSessionPublic) => {
    if (revokingId) return;
    setRevokingId(session.id);
    try {
      const res = await fetch(`/api/auth/sessions/${session.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.revokedCurrent) {
          window.location.assign('/login');
          return;
        }
        await onRefresh();
        onNotify('Session revoked', 'success');
      } else {
        onNotify(data.error || 'Failed to revoke session', 'error');
      }
    } catch {
      onNotify('Network error revoking session', 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (revokingOthers || otherSessionsCount === 0) return;
    setRevokingOthers(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'others' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await onRefresh();
        onNotify(`Signed out ${data.revokedCount ?? otherSessionsCount} other session(s)`, 'success');
      } else {
        onNotify(data.error || 'Failed to revoke other sessions', 'error');
      }
    } catch {
      onNotify('Network error revoking sessions', 'error');
    } finally {
      setRevokingOthers(false);
    }
  };

  return (
    <SettingsCard>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          <MonitorSmartphone className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Active Sessions</h3>
            <p className="text-xs text-gunmetal-muted mt-0.5">
              Sessions are stored in SQLite and checked on every API request for immediate revocation.
            </p>
          </div>
        </div>

        {otherSessionsCount > 0 && (
          <button
            type="button"
            disabled={revokingOthers}
            onClick={handleRevokeOtherSessions}
            className="self-start sm:self-center flex-shrink-0 min-h-[40px] sm:min-h-[34px] px-3 py-1.5 rounded-md bg-gunmetal-card hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {revokingOthers ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>Sign Out Other Sessions ({otherSessionsCount})</span>
          </button>
        )}
      </div>

      <div className="mb-4 pb-4 border-b border-gunmetal-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <label
            htmlFor="session-duration-days"
            className="text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Session Lifetime</span>
          </label>
          <p className="text-[11px] text-gunmetal-muted">
            Controls how long newly signed-in devices stay authenticated before requiring sign-in again.
          </p>
        </div>

        <SettingsSelect
          id="session-duration-days"
          compactDesktop
          disabled={savingDuration}
          value={String(sessionDurationDays)}
          onChange={(e) => void handleDurationChange(parseInt(e.target.value, 10))}
          wrapperClassName="w-full sm:w-52 flex-shrink-0"
          className="text-xs font-medium"
        >
          {SESSION_DURATION_OPTIONS.map((opt) => (
            <option key={opt.days} value={String(opt.days)} className="bg-gunmetal-card text-slate-200">
              {opt.label}
            </option>
          ))}
        </SettingsSelect>
      </div>

      {sessions.length === 0 ? (
        <p className="text-xs text-gunmetal-muted">No active sessions found.</p>
      ) : (
        <div className="divide-y divide-gunmetal-border border border-gunmetal-border rounded-lg bg-gunmetal-card/90 overflow-hidden">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-100">
                    {summarizeUserAgent(s.userAgent)}
                  </span>
                  {s.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/70 border border-emerald-700/70 text-emerald-300">
                      Current Session
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gunmetal-muted">
                  User: <span className="text-slate-300">{s.username}</span>
                  {s.ipAddress && s.ipAddress !== 'unknown' ? ` · IP: ${s.ipAddress}` : ''} · Last active{' '}
                  {formatTimestamp(s.lastActiveAt)} · Expires {formatTimestamp(s.expiresAt)}
                </p>
              </div>

              <button
                type="button"
                disabled={revokingId === s.id}
                onClick={() => handleRevokeSession(s)}
                className="self-end sm:self-center min-h-[36px] px-2.5 py-1.5 rounded-md bg-rose-950/40 hover:bg-rose-900/65 border border-rose-800/60 text-xs text-rose-200 inline-flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>{revokingId === s.id ? 'Revoking...' : s.isCurrent ? 'Sign Out' : 'Revoke'}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </SettingsCard>
  );
}