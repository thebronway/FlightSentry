'use client';

import { useState } from 'react';
import { Mail, ShieldCheck, ShieldOff, FolderOpen, Clock, AlertTriangle, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { ImapAccountPublic } from '@/types';
import ImapConnectionTestBanner, { ImapTestFeedback } from './ImapConnectionTestBanner';

interface Props {
  account: ImapAccountPublic;
  testing: boolean;
  testFeedback: ImapTestFeedback | null;
  onToggleEnabled: (account: ImapAccountPublic, enabled: boolean) => void;
  onTestConnection: (account: ImapAccountPublic) => void;
  onEdit: (account: ImapAccountPublic) => void;
  onDelete: (account: ImapAccountPublic) => void;
}

export default function ImapAccountCard({
  account,
  testing,
  testFeedback,
  onToggleEnabled,
  onTestConnection,
  onEdit,
  onDelete,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isEnabled = account.enabled === 1;

  const formattedLastChecked = account.lastCheckedAt
    ? new Date(account.lastCheckedAt).toLocaleString()
    : 'Never polled yet';

  return (
    <div
      className={`border rounded-lg transition-all ${
        isEnabled
          ? 'bg-gunmetal-canvas/60 border-gunmetal-border shadow-sm'
          : 'bg-gunmetal-canvas/30 border-gunmetal-border/50 opacity-70'
      }`}
    >
      <div className="p-3.5 sm:p-4 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onToggleEnabled(account, e.target.checked)}
              className="w-4 h-4 accent-slate-500 rounded"
            />
            <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>{account.label}</span>
            </span>
          </label>

          {account.tls === 1 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-950/40 text-emerald-300 border-emerald-800/50">
              <ShieldCheck className="w-3 h-3" />
              TLS / SSL
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-950/40 text-amber-300 border-amber-800/50">
              <ShieldOff className="w-3 h-3" />
              Plaintext
            </span>
          )}

          {!isEnabled && (
            <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
              Paused
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={() => onTestConnection(account)}
            disabled={testing}
            className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test'}</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(account)}
            className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit</span>
          </button>

          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete ${account.label}`}
              className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 hover:border-rose-800/60 rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  onDelete(account);
                }}
                className="min-h-[44px] sm:min-h-[34px] px-2.5 py-1 text-xs font-bold bg-rose-900/70 hover:bg-rose-800 text-rose-100 border border-rose-600 rounded-md transition-colors cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="min-h-[44px] sm:min-h-[34px] px-2.5 py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 sm:p-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-[11px]">
          <div className="p-2 rounded bg-gunmetal-card/70 border border-gunmetal-border">
            <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted">
              Username
            </span>
            <span className="text-slate-200 truncate block" title={account.username}>
              {account.username}
            </span>
          </div>

          <div className="p-2 rounded bg-gunmetal-card/70 border border-gunmetal-border">
            <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted">
              IMAP Server
            </span>
            <span className="text-slate-200 truncate block">
              {account.host}:{account.port}
            </span>
          </div>

          <div className="p-2 rounded bg-gunmetal-card/70 border border-gunmetal-border">
            <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              Folder &amp; UID Cursor
            </span>
            <span className="text-slate-200 truncate block">
              {account.folder} (UID &gt; {account.lastUid})
            </span>
          </div>

          <div className="p-2 rounded bg-gunmetal-card/70 border border-gunmetal-border">
            <span className="block text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last Checked
            </span>
            <span className="text-slate-200 font-sans text-[11px] truncate block">
              {formattedLastChecked}
            </span>
          </div>
        </div>

        {account.lastError && (
          <div className="p-2.5 rounded-md bg-amber-950/35 border border-amber-800/60 flex items-start gap-2 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold block text-[11px]">Last Poll Warning</span>
              <span className="text-[11px] break-words">{account.lastError}</span>
            </div>
          </div>
        )}

        <ImapConnectionTestBanner feedback={testFeedback} />
      </div>
    </div>
  );
}