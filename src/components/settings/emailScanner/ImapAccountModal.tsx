'use client';

import { useEffect, useState, FormEvent } from 'react';
import { X, Mail, Eye, EyeOff, RefreshCw, ShieldCheck, Info } from 'lucide-react';
import { ImapAccountPublic } from '@/types';
import SettingsModalPortal from '../shared/SettingsModalPortal';
import ImapConnectionTestBanner, { ImapTestFeedback } from './ImapConnectionTestBanner';

interface Props {
  isOpen: boolean;
  editingAccount: ImapAccountPublic | null;
  onClose: () => void;
  onSaved: (account: ImapAccountPublic, isNew: boolean) => void;
}

interface ProviderPreset {
  id: string;
  name: string;
  host: string;
  port: number;
  tls: boolean;
  hint: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    hint: 'Requires 2-Step Verification and a 16-character Google App Password.',
  },
  {
    id: 'outlook',
    name: 'Outlook / M365',
    host: 'outlook.office365.com',
    port: 993,
    tls: true,
    hint: 'Ensure IMAP access is enabled in Outlook mail settings.',
  },
  {
    id: 'icloud',
    name: 'iCloud Mail',
    host: 'imap.mail.me.com',
    port: 993,
    tls: true,
    hint: 'Use your @icloud.com address and an Apple ID App-Specific Password.',
  },
  {
    id: 'fastmail',
    name: 'Fastmail',
    host: 'imap.fastmail.com',
    port: 993,
    tls: true,
    hint: 'Generate a dedicated IMAP app password in Fastmail Settings → Privacy & Security.',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Mail',
    host: 'imap.mail.yahoo.com',
    port: 993,
    tls: true,
    hint: 'Generate an app password under Yahoo Account Security settings.',
  },
  {
    id: 'custom',
    name: 'Custom IMAP',
    host: '',
    port: 993,
    tls: true,
    hint: 'Enter your self-hosted or custom provider IMAP hostname, port, and TLS setting.',
  },
];

export default function ImapAccountModal({
  isOpen,
  editingAccount,
  onClose,
  onSaved,
}: Props) {
  const [label, setLabel] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(993);
  const [tls, setTls] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [folder, setFolder] = useState('INBOX');
  const [enabled, setEnabled] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);

  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<ImapTestFeedback | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setShowPassword(false);
    setActiveHint(null);

    if (editingAccount) {
      setLabel(editingAccount.label);
      setHost(editingAccount.host);
      setPort(editingAccount.port);
      setTls(editingAccount.tls === 1);
      setUsername(editingAccount.username);
      setPassword('');
      setFolder(editingAccount.folder || 'INBOX');
      setEnabled(editingAccount.enabled === 1);
    } else {
      setLabel('');
      setHost('');
      setPort(993);
      setTls(true);
      setUsername('');
      setPassword('');
      setFolder('INBOX');
      setEnabled(true);
    }
  }, [isOpen, editingAccount]);

  if (!isOpen) return null;

  const applyPreset = (preset: ProviderPreset) => {
    if (preset.host) {
      setHost(preset.host);
    }
    setPort(preset.port);
    setTls(preset.tls);
    if (!label.trim() && preset.id !== 'custom') {
      setLabel(preset.name);
    }
    setActiveHint(preset.hint);
    setFeedback(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/email-scanner/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: editingAccount?.id ?? null,
          host,
          port,
          tls: tls ? 1 : 0,
          username,
          password,
          folder: folder.trim() || 'INBOX',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          message: `Connected to "${data.folder}" successfully!`,
          details: `Messages in folder: ${data.exists} · Baseline UIDNEXT: ${data.uidNext} (only emails arriving after UID ${Math.max(0, (data.uidNext || 1) - 1)} will be scanned)`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Connection test failed',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Network error while testing IMAP connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const url = editingAccount
        ? `/api/email-scanner/accounts/${editingAccount.id}`
        : '/api/email-scanner/accounts';
      const method = editingAccount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          host,
          port,
          tls: tls ? 1 : 0,
          username,
          password,
          folder: folder.trim() || 'INBOX',
          enabled: enabled ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data.account) {
        onSaved(data.account, !editingAccount);
        onClose();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to save IMAP account',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Network error saving IMAP account',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      >
        <div className="bg-gunmetal-card w-full h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl border border-gunmetal-border flex flex-col overflow-hidden max-w-2xl">
          <div className="px-4 sm:px-6 py-4 border-b border-gunmetal-border flex items-center justify-between bg-gunmetal-card">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-sky-400" />
              <h2 className="text-base sm:text-lg font-bold text-slate-100">
                {editingAccount ? 'Edit IMAP Account' : 'Add IMAP Email Account'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto [overflow-anchor:none] p-4 sm:p-6 space-y-4 min-h-0">
            {/* Quick Provider Presets */}
            <div>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted mb-1.5">
                Quick Provider Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PROVIDER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="min-h-[44px] sm:min-h-[34px] px-3 sm:px-2.5 py-1.5 rounded-md text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
              {activeHint && (
                <div className="mt-2 p-2.5 rounded-md bg-sky-950/30 border border-sky-800/50 flex items-start gap-2 text-xs text-sky-200">
                  <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span>{activeHint}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Label *
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Personal Gmail"
                  className="w-full min-h-[44px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monitored Folder / Label
                </label>
                <input
                  type="text"
                  value={folder}
                  onChange={(e) => setFolder(e.target.value)}
                  placeholder="INBOX"
                  className="w-full min-h-[44px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  IMAP Server Host *
                </label>
                <input
                  type="text"
                  required
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="imap.gmail.com"
                  className="w-full min-h-[44px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Port *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value) || 993)}
                  className="w-full min-h-[44px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username / Email *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full min-h-[44px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {editingAccount ? 'Password (blank = keep saved)' : 'Password / App Password *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingAccount}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingAccount ? editingAccount.maskedPassword : '••••••••••••••••'}
                    className="w-full min-h-[44px] border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gunmetal-muted hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tls}
                  onChange={(e) => setTls(e.target.checked)}
                  className="w-4 h-4 accent-slate-500 rounded"
                />
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Use Implicit TLS / SSL (Recommended, Port 993)</span>
              </label>

              <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4 accent-slate-500 rounded"
                />
                <span>Account Enabled</span>
              </label>
            </div>

            <div className="p-3 rounded-lg bg-gunmetal-canvas/70 border border-gunmetal-border text-[11px] text-gunmetal-muted">
              On save, FlightSentry connects to record the mailbox&apos;s current <span className="font-mono text-slate-300">UIDNEXT</span> baseline. Only emails arriving <strong>after</strong> this moment will be scanned—existing inbox history is never backfilled.
            </div>

            <ImapConnectionTestBanner feedback={feedback} />

            <div className="pt-3 border-t border-gunmetal-border flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving || !host.trim() || !username.trim()}
                className="min-h-[44px] sm:min-h-[38px] px-4 py-2 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-200 border border-gunmetal-border rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Testing Connection...' : 'Test Connection'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-4 py-2 bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || testing}
                  className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] px-5 py-2 bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                >
                  {saving ? 'Verifying & Saving...' : editingAccount ? 'Save Changes' : 'Verify & Add Account'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </SettingsModalPortal>
  );
}