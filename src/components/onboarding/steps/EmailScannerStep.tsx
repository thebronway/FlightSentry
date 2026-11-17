'use client';

import { useEffect, useState, useCallback } from 'react';
import { MailCheck, Plus, Bell, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ImapAccountPublic } from '@/types';
import SettingsCard from '@/components/settings/shared/SettingsCard';
import SettingsSelect from '@/components/settings/shared/SettingsSelect';
import ImapAccountModal from '@/components/settings/emailScanner/ImapAccountModal';
import { OnboardingStepProps } from '../types';

const POLL_OPTIONS = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 10, label: 'Every 10 minutes' },
  { value: 15, label: 'Every 15 minutes (Default)' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every 60 minutes' },
];

export default function EmailScannerStep({
  settings,
  onChange,
  onSkipToSettingsLater,
}: OnboardingStepProps) {
  const [accounts, setAccounts] = useState<ImapAccountPublic[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/email-scanner/accounts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      }
    } catch {
      // Ignore transient errors
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const scannerEnabled = settings.emailScannerEnabled === 1;
  const notifyEnabled = settings.emailScannerNotifyEnabled !== 0;
  const pollMinutes = settings.emailScannerPollIntervalMinutes ?? 15;

  return (
    <div className="space-y-4">
      {/* Architecture & Privacy Explanation */}
      <div className="p-3.5 rounded-xl bg-sky-950/25 border border-sky-800/50 text-xs text-sky-200/90 leading-relaxed space-y-1">
        <p className="font-bold text-sky-100">
          How the IMAP Email Scanner &amp; Review Queue Work
        </p>
        <p>
          FlightSentry connects read-only to configured IMAP inboxes (Gmail, Outlook, iCloud, Fastmail, or self-hosted) to detect newly arriving airline confirmations, schedule changes, and cancellations—including Points &amp; Miles bookings with cash taxes/fees. Raw emails are parsed strictly in memory, historical inbox messages are never backfilled, and every detected event waits in your Dashboard <strong>Email Queue</strong> for your approval before touching any flight.
        </p>
      </div>

      {/* 1. Polling & Queue Alert Settings */}
      <SettingsCard className="space-y-3.5">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={scannerEnabled}
            onChange={(e) =>
              onChange({ ...settings, emailScannerEnabled: e.target.checked ? 1 : 0 })
            }
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded cursor-pointer"
          />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <MailCheck className="w-4 h-4 text-sky-400" />
              <span>1. Enable Automated IMAP Email Polling</span>
            </span>
            <p className="text-xs text-gunmetal-muted leading-relaxed mt-0.5">
              Background worker checks enabled IMAP accounts on the schedule below.
            </p>
          </div>
        </label>

        <div className="pt-2 border-t border-gunmetal-border/70 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label
              htmlFor="onboarding-email-poll-interval"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1"
            >
              Polling Interval
            </label>
            <SettingsSelect
              id="onboarding-email-poll-interval"
              compactDesktop
              disabled={!scannerEnabled}
              value={pollMinutes}
              onChange={(e) =>
                onChange({
                  ...settings,
                  emailScannerPollIntervalMinutes: Number(e.target.value),
                })
              }
            >
              {POLL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gunmetal-card text-slate-200">
                  {opt.label}
                </option>
              ))}
            </SettingsSelect>
          </div>

          <div>
            <label
              htmlFor="onboarding-app-base-url"
              className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>App Base URL (Optional Deep Links)</span>
            </label>
            <input
              id="onboarding-app-base-url"
              type="url"
              value={settings.appBaseUrl || ''}
              onChange={(e) => onChange({ ...settings, appBaseUrl: e.target.value })}
              placeholder="http://localhost:4000"
              className="w-full min-h-[40px] border border-gunmetal-border px-3 py-1.5 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-xs sm:text-sm font-mono"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={notifyEnabled}
            onChange={(e) =>
              onChange({ ...settings, emailScannerNotifyEnabled: e.target.checked ? 1 : 0 })
            }
            className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
          />
          <Bell className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>
            Send alerts via active Notification Channels when new flight emails are queued
          </span>
        </label>
      </SettingsCard>

      {/* 2. Connected IMAP Accounts */}
      <SettingsCard className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>2. Monitored IMAP Accounts (Optional)</span>
            </h4>
            <p className="text-xs text-gunmetal-muted mt-0.5">
              IMAP passwords are encrypted at rest with AES-256-GCM. Add an account now or defer until later.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAccountModalOpen(true)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-md bg-gunmetal-border hover:bg-slate-700 border border-slate-500 text-xs font-semibold text-slate-100 inline-flex items-center justify-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Email Account</span>
          </button>
        </div>

        {loadingAccounts ? (
          <p className="text-xs text-gunmetal-muted">Checking connected IMAP accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="p-3.5 rounded-lg bg-gunmetal-canvas/70 border border-dashed border-gunmetal-border text-xs text-gunmetal-muted">
            No IMAP accounts added yet. You can add Gmail, Outlook, iCloud, Fastmail, or custom IMAP inboxes now or anytime in <strong>Settings → Email Scanner</strong>.
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-2.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-100 truncate">{acc.label}</span>
                  <span className="text-gunmetal-muted font-mono truncate">
                    ({acc.username} · {acc.folder})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-sky-400 flex-shrink-0">
                  UID &gt; {acc.lastUid}
                </span>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      <ImapAccountModal
        isOpen={isAccountModalOpen}
        editingAccount={null}
        onClose={() => setIsAccountModalOpen(false)}
        onSaved={(savedAcc) => {
          setAccounts((prev) => [...prev, savedAcc]);
          if (settings.emailScannerEnabled !== 1) {
            onChange({ ...settings, emailScannerEnabled: 1 });
          }
        }}
      />
    </div>
  );
}