'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, Trash2 } from 'lucide-react';
import { EmailScanLog, EmailScanLogOutcome } from '@/types';
import SettingsCard from '../shared/SettingsCard';

interface EmailScanLogsCardProps {
  refreshTrigger?: number;
}

const OUTCOME_BADGE: Record<EmailScanLogOutcome, { label: string; classes: string }> = {
  queued: {
    label: 'Queued',
    classes: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  },
  duplicate: {
    label: 'Duplicate',
    classes: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
  },
  skipped: {
    label: 'Skipped',
    classes: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  },
};

export default function EmailScanLogsCard({ refreshTrigger = 0 }: EmailScanLogsCardProps) {
  const [logs, setLogs] = useState<EmailScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email-scanner/logs?limit=50', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs, refreshTrigger]);

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/email-scanner/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <SettingsCard className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <span>Recent Scan Audit Trail</span>
          </h3>
          <p className="text-xs text-gunmetal-muted mt-0.5">
            Shows recent per-message scan outcomes (<span className="text-slate-300">queued</span>, <span className="text-slate-300">duplicate</span>, or <span className="text-slate-300">skipped</span> with exact reason).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchLogs()}
            className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-md text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border inline-flex items-center gap-1.5 transition-colors disabled:opacity-45 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {logs.length > 0 && (
            <button
              type="button"
              disabled={clearing}
              onClick={() => void handleClear()}
              className="min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-rose-200 hover:text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-45 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="p-4 text-center text-xs text-gunmetal-muted">
          Loading scan audit trail...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-5 text-center border border-dashed border-gunmetal-border rounded-lg text-xs text-gunmetal-muted">
          No scan audit entries recorded yet.
        </div>
      ) : (
        <div className="border border-gunmetal-border rounded-lg overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gunmetal-card/90 border-b border-gunmetal-border sticky top-0">
              <tr>
                <th className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Outcome
                </th>
                <th className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Account
                </th>
                <th className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Subject / Sender
                </th>
                <th className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Reason
                </th>
                <th className="py-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Scanned
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gunmetal-border/70">
              {logs.map((log) => {
                const badge = OUTCOME_BADGE[log.outcome] || OUTCOME_BADGE.skipped;
                return (
                  <tr key={log.id} className="hover:bg-gunmetal-card/40">
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                      {log.accountLabel}
                    </td>
                    <td className="py-2 px-3 max-w-xs">
                      <div className="text-slate-200 font-medium truncate" title={log.emailSubject || ''}>
                        {log.emailSubject || '(No Subject)'}
                      </div>
                      {log.emailFrom && (
                        <div className="text-[11px] font-mono text-gunmetal-muted truncate" title={log.emailFrom}>
                          {log.emailFrom}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{log.reason}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-gunmetal-muted whitespace-nowrap">
                      {new Date(log.scannedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SettingsCard>
  );
}