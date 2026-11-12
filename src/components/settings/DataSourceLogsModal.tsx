'use client';

import { useEffect, useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Clock, SlidersHorizontal } from 'lucide-react';
import SettingsModalPortal from './shared/SettingsModalPortal';

interface DataSourceLog {
  id: number;
  provider: string;
  route?: string | null;
  flightNumber?: string | null;
  departureDate?: string | null;
  status: string;
  statusCode?: number | null;
  errorMessage?: string | null;
  durationMs?: number | null;
  queriedAt: string;
}

interface Props {
  isOpen: boolean;
  providerKey: string | null;
  providerName: string;
  onClose: () => void;
}

export default function DataSourceLogsModal({
  isOpen,
  providerKey,
  providerName,
  onClose,
}: Props) {
  const [logs, setLogs] = useState<DataSourceLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!providerKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/datasource-logs?provider=${encodeURIComponent(providerKey)}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && providerKey) {
      fetchLogs();
    } else {
      setLogs([]);
    }
  }, [isOpen, providerKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !providerKey) return null;

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      >
        <div className="bg-gunmetal-card border-0 sm:border border-gunmetal-border rounded-none sm:rounded-xl shadow-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gunmetal-border flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0">
              <h3 className="font-bold text-base text-slate-100 truncate">
                Query Logs: {providerName}
              </h3>
              <span className="text-[11px] text-gunmetal-muted">
                (Last {logs.length} queries)
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                title="Refresh Logs"
                aria-label="Refresh Logs"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Logs"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
            {loading && logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-gunmetal-muted">
                Loading recent query logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-xs text-gunmetal-muted border border-dashed border-gunmetal-border rounded-lg">
                No query logs recorded yet for this provider.
              </div>
            ) : (
              logs.map(log => {
                const isSuccess = log.status === 'Success';
                const isRateLimited = log.status === 'RateLimited';
                const isManual = log.status === 'Manual';

                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                      isManual
                        ? 'bg-sky-950/20 border-sky-900/40'
                        : isSuccess
                        ? 'bg-gunmetal-canvas/40 border-gunmetal-border'
                        : isRateLimited
                        ? 'bg-amber-950/20 border-amber-900/40'
                        : 'bg-red-950/20 border-red-900/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                            isManual
                              ? 'bg-sky-950/60 text-sky-400 border-sky-800/60'
                              : isSuccess
                              ? 'bg-green-950/60 text-green-400 border-green-800/60'
                              : isRateLimited
                              ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                              : 'bg-red-950/60 text-red-400 border-red-800/60'
                          }`}
                        >
                          {isManual ? (
                            <SlidersHorizontal className="w-3 h-3" />
                          ) : isSuccess ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : isRateLimited ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {log.status}
                        </span>
                        <span className="font-semibold text-slate-200">
                          {log.route || (isManual ? 'Manual Quota Adjustment' : 'Unknown Route')}
                        </span>
                        {log.flightNumber && (
                          <span className="text-[11px] text-gunmetal-muted font-mono">
                            ({log.flightNumber})
                          </span>
                        )}
                        {log.departureDate && (
                          <span className="text-[11px] text-gunmetal-muted">
                            • {log.departureDate}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gunmetal-muted font-mono">
                        {log.durationMs !== null && log.durationMs !== undefined && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {log.durationMs}ms
                          </span>
                        )}
                        <span>
                          {new Date(log.queriedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {log.errorMessage && (
                      <p
                        className={`text-[11px] pt-1 leading-relaxed break-words ${
                          isRateLimited
                            ? 'text-amber-300/90 font-mono'
                            : !isSuccess && !isManual
                            ? 'text-red-300/90 font-mono'
                            : 'text-gunmetal-muted'
                        }`}
                      >
                        {log.errorMessage}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </SettingsModalPortal>
  );
}