'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarClock, RefreshCw, X, Plane, Server, AlertTriangle, ArrowRight } from 'lucide-react';
import SettingsModalPortal from '../shared/SettingsModalPortal';
import { formatCustomCadenceLabel } from '../shared/cadenceOptions';
import type { ScheduledFlightTask, ScheduledSystemTask } from '@/app/api/settings/scheduled-tasks/route';

interface Props {
  isOpen: boolean;
  timezone: string;
  onClose: () => void;
}

interface ScheduledTasksPayload {
  timezone: string;
  generatedAt: string;
  queueStatus: {
    globalPause: boolean;
    circuitBreakerActive: boolean;
    circuitBreakerUntil: string | null;
    canMakeApiCall: boolean;
  };
  flightTasks: ScheduledFlightTask[];
  systemTasks: ScheduledSystemTask[];
}

function formatConfiguredDateTime(iso: string | null | undefined, timezone: string): string {
  if (!iso) return 'Not scheduled';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(parsed);
  } catch {
    return parsed.toUTCString();
  }
}

function formatRelativeCountdown(iso: string | null | undefined): string {
  if (!iso) return '';
  const targetMs = Date.parse(iso);
  if (Number.isNaN(targetMs)) return '';
  const diffMs = targetMs - Date.now();
  if (diffMs <= 60_000) return 'Due now / queued';

  const totalMinutes = Math.round(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `in ${days}d ${hours}h` : `in ${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `in ${hours}h ${minutes}m` : `in ${hours}h`;
  }
  return `in ${minutes}m`;
}

export default function ScheduledTasksModal({
  isOpen,
  timezone,
  onClose,
}: Props) {
  const [data, setData] = useState<ScheduledTasksPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/settings/scheduled-tasks', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Failed to load scheduled tasks');
      }
      setData(body);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to fetch scheduled tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchTasks();
    } else {
      setData(null);
      setErrorMsg(null);
    }
  }, [isOpen, fetchTasks]);

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

  if (!isOpen) return null;

  const activeTimezone = data?.timezone || timezone || 'UTC';
  const flightTasks = data?.flightTasks || [];
  const systemTasks = data?.systemTasks || [];
  const queueStatus = data?.queueStatus;

  const showPauseWarning =
    queueStatus &&
    (queueStatus.globalPause ||
      queueStatus.circuitBreakerActive ||
      !queueStatus.canMakeApiCall);

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 md:p-6"
      >
        <div className="bg-gunmetal-card border-0 sm:border border-gunmetal-border rounded-none sm:rounded-2xl shadow-2xl max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
          {/* Sticky Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gunmetal-border bg-gunmetal-card flex items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-sky-950/60 border border-sky-800/60 flex-shrink-0">
                <CalendarClock className="w-5 h-5 text-sky-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">
                  Upcoming Scheduled Tasks
                </h2>
                <p className="text-xs text-gunmetal-muted truncate">
                  Configured Timezone: <span className="font-mono text-slate-300">{activeTimezone}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => void fetchTasks()}
                disabled={loading}
                title="Refresh Scheduled Tasks"
                aria-label="Refresh Scheduled Tasks"
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Scheduled Tasks"
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto [overflow-anchor:none] p-4 sm:p-6 space-y-5 min-h-0">
            {errorMsg && (
              <div className="bg-rose-950/45 border border-rose-700/70 p-3 rounded-lg text-xs text-rose-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {showPauseWarning && (
              <div className="bg-amber-950/30 border border-amber-800/60 p-3.5 rounded-lg text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-amber-100 block mb-0.5">
                    Automated Flight Checks Currently Paused
                  </span>
                  {queueStatus.globalPause
                    ? 'Global Pause is active in Settings → Data Sources. Queued flight checks will resume once unpaused.'
                    : queueStatus.circuitBreakerActive
                    ? `Rate-limit circuit breaker is active until ${formatConfiguredDateTime(queueStatus.circuitBreakerUntil, activeTimezone)}.`
                    : 'No active data source provider has available quota.'}
                </div>
              </div>
            )}

            {/* Section 1: Upcoming Flight Price Checks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-sky-400" />
                  <span>Flight Price Checks ({flightTasks.length})</span>
                </h3>
                <span className="text-[11px] text-gunmetal-muted">
                  Ordered by next check
                </span>
              </div>

              {loading && !data ? (
                <div className="py-10 text-center text-xs text-gunmetal-muted">
                  Loading scheduled tasks...
                </div>
              ) : flightTasks.length === 0 ? (
                <div className="py-8 px-4 text-center border-2 border-dashed border-gunmetal-border rounded-xl bg-gunmetal-canvas/30 space-y-1">
                  <p className="text-sm font-semibold text-slate-300">No active flights tracked</p>
                  <p className="text-xs text-gunmetal-muted">
                    Add a route or flight on the Dashboard to schedule automated fare checks.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {flightTasks.map((task) => {
                    const countdown = task.isActiveQueue
                      ? formatRelativeCountdown(task.nextCheckAt)
                      : null;

                    return (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-lg bg-gunmetal-canvas/60 border border-gunmetal-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {task.searchMode === 'FlightNumber' && task.airline && task.flightNumber ? (
                              <span className="text-xs font-mono font-bold text-slate-100">
                                {task.airline} {task.flightNumber}
                              </span>
                            ) : null}

                            {task.origin && task.destination && (
                              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-200">
                                <span>{task.origin}</span>
                                <ArrowRight className="w-3 h-3 text-gunmetal-muted" />
                                <span>{task.destination}</span>
                              </span>
                            )}

                            <span className="text-[11px] text-gunmetal-muted font-mono">
                              • {task.departureDate}
                            </span>

                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold ${
                                !task.isActiveQueue
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                  : task.status === 'Booked'
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                  : 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                              }`}
                            >
                              {task.isManualOrPoints
                                ? 'Manual / Points'
                                : task.status === 'Paused'
                                ? 'Paused'
                                : task.cadenceHours <= 0
                                ? 'Window Paused'
                                : task.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gunmetal-muted">
                            <span>{task.proximityTier}</span>
                            <span>•</span>
                            <span>
                              {task.isManualOrPoints
                                ? 'Automated checks disabled'
                                : formatCustomCadenceLabel(task.cadenceHours)}
                            </span>
                            {task.hasOverride && (
                              <span className="px-1.5 py-0.2 rounded bg-gunmetal-card border border-gunmetal-border text-[10px] text-slate-300 font-semibold">
                                Custom Cadence
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="sm:text-right flex-shrink-0">
                          {task.isActiveQueue ? (
                            <>
                              <span className="text-xs font-mono font-bold text-sky-300 block">
                                {formatConfiguredDateTime(task.nextCheckAt, activeTimezone)}
                              </span>
                              {countdown && (
                                <span className="text-[11px] font-mono text-gunmetal-muted block mt-0.5">
                                  {countdown}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-mono text-gunmetal-muted">
                              {task.cadenceHours <= 0 && !task.isManualOrPoints && task.status !== 'Paused'
                                ? `Dormant until next window (${formatConfiguredDateTime(task.nextCheckAt, activeTimezone)})`
                                : 'Not queued'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Background System Jobs */}
            <div className="space-y-3 pt-2 border-t border-gunmetal-border">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-purple-400" />
                <span>Background Maintenance &amp; Sync Jobs</span>
              </h3>

              <div className="space-y-2.5">
                {systemTasks.map((job) => {
                  const countdown =
                    job.status === 'active' && job.nextRunAt
                      ? formatRelativeCountdown(job.nextRunAt)
                      : null;

                  return (
                    <div
                      key={job.id}
                      className="p-3.5 rounded-lg bg-gunmetal-canvas/60 border border-gunmetal-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-100">
                            {job.name}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${
                              job.status === 'active'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                                : job.status === 'paused'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                                : 'bg-gunmetal-card text-gunmetal-muted border-gunmetal-border'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-mono">
                          {job.scheduleLabel}
                        </p>
                        <p className="text-[11px] text-gunmetal-muted leading-relaxed">
                          {job.details}
                        </p>
                      </div>

                      <div className="sm:text-right flex-shrink-0">
                        {job.nextRunAt ? (
                          <>
                            <span className="text-xs font-mono font-bold text-slate-200 block">
                              {formatConfiguredDateTime(job.nextRunAt, activeTimezone)}
                            </span>
                            {countdown && (
                              <span className="text-[11px] font-mono text-gunmetal-muted block mt-0.5">
                                {countdown}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-mono text-gunmetal-muted">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-4 sm:px-6 py-3.5 border-t border-gunmetal-border bg-gunmetal-card flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 flex-shrink-0">
            <span className="text-[11px] text-gunmetal-muted">
              Times shown in configured timezone ({activeTimezone}).
            </span>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </SettingsModalPortal>
  );
}