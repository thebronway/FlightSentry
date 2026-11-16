'use client';

import { MailCheck, RefreshCw, Bell, Globe } from 'lucide-react';
import { Settings } from '@/types';
import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';

interface Props {
  settings: Settings;
  scanningNow: boolean;
  lastScanSummary: string | null;
  enabledAccountCount: number;
  onToggleScannerEnabled: (checked: boolean) => void;
  onPollIntervalChange: (minutes: number) => void;
  onToggleNotifyEnabled: (checked: boolean) => void;
  onAppBaseUrlChange: (url: string) => void;
  onAppBaseUrlBlur: () => void;
  onScanNow: () => void;
}

const POLL_OPTIONS = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 10, label: 'Every 10 minutes' },
  { value: 15, label: 'Every 15 minutes (Default)' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every 60 minutes' },
];

export default function EmailScannerPollingCard({
  settings,
  scanningNow,
  lastScanSummary,
  enabledAccountCount,
  onToggleScannerEnabled,
  onPollIntervalChange,
  onToggleNotifyEnabled,
  onAppBaseUrlChange,
  onAppBaseUrlBlur,
  onScanNow,
}: Props) {
  const scannerEnabled = settings.emailScannerEnabled === 1;
  const notifyEnabled = settings.emailScannerNotifyEnabled !== 0;
  const pollMinutes = settings.emailScannerPollIntervalMinutes ?? 15;

  return (
    <SettingsCard className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <label className="min-h-[44px] sm:min-h-0 flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={scannerEnabled}
            onChange={(e) => onToggleScannerEnabled(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-slate-500 rounded"
          />
          <div>
            <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <MailCheck className="w-4 h-4 text-sky-400" />
              <span>Enable Automated IMAP Email Polling</span>
            </span>
            <span className="text-xs text-gunmetal-muted block mt-0.5">
              Polls enabled inboxes for newly arriving airline confirmations, schedule changes, and cancellations. Raw email bodies are parsed in memory and never written to disk.
            </span>
          </div>
        </label>

        <button
          type="button"
          onClick={onScanNow}
          disabled={scanningNow || enabledAccountCount === 0}
          title={
            enabledAccountCount === 0
              ? 'Add and enable at least one IMAP account first'
              : 'Poll all enabled IMAP accounts now'
          }
          className="min-h-[44px] sm:min-h-[38px] px-4 py-2 bg-gunmetal-border hover:bg-slate-700 text-slate-100 border border-slate-500 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${scanningNow ? 'animate-spin' : ''}`} />
          <span>{scanningNow ? 'Scanning Inboxes...' : 'Scan Now'}</span>
        </button>
      </div>

      {lastScanSummary && (
        <div className="px-3 py-2 rounded-md bg-sky-950/30 border border-sky-800/50 text-xs text-sky-200">
          {lastScanSummary}
        </div>
      )}

      <div className="pt-3 border-t border-gunmetal-border/70 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="email-scanner-poll-interval"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
          >
            Polling Interval
          </label>
          <SettingsSelect
            id="email-scanner-poll-interval"
            compactDesktop
            disabled={!scannerEnabled}
            value={pollMinutes}
            onChange={(e) => onPollIntervalChange(Number(e.target.value))}
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
            htmlFor="email-scanner-base-url"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>App Base URL (For Notification Deep Links)</span>
          </label>
          <input
            id="email-scanner-base-url"
            type="url"
            value={settings.appBaseUrl || ''}
            onChange={(e) => onAppBaseUrlChange(e.target.value)}
            onBlur={onAppBaseUrlBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="http://localhost:4000"
            className="w-full min-h-[44px] sm:min-h-[38px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm font-mono"
          />
        </div>
      </div>

      <div className="pt-2">
        <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notifyEnabled}
            onChange={(e) => onToggleNotifyEnabled(e.target.checked)}
            className="w-4 h-4 accent-slate-500 rounded"
          />
          <Bell className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-slate-300">
            Send alerts via active Notification Channels (Discord, Slack, Webhook, SMTP) when new flight events are queued
          </span>
        </label>
      </div>
    </SettingsCard>
  );
}