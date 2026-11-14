'use client';

import { useState, useEffect, useCallback } from 'react';
import { Archive, Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';
import SettingsModalPortal from '../shared/SettingsModalPortal';

export const RETENTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Keep Forever (Archive All)' },
  { value: '90', label: '90 Days' },
  { value: '180', label: '180 Days (6 Months)' },
  { value: '365', label: '1 Year (365 Days)' },
  { value: '730', label: '2 Years (730 Days)' },
];

interface Props {
  retentionDays: number | null;
  onSelectRetentionDays: (days: number | null) => Promise<void>;
}

interface PastSummary {
  totalPastCount: number;
  eligibleCount: number;
  cutoffDate: string | null;
}

export default function PastFlightsRetentionCard({
  retentionDays,
  onSelectRetentionDays,
}: Props) {
  const [summary, setSummary] = useState<PastSummary>({
    totalPastCount: 0,
    eligibleCount: 0,
    cutoffDate: null,
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cleanupScope, setCleanupScope] = useState<'retention' | 'all'>('all');
  const [purging, setPurging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const fetchSummary = useCallback(async (days: number | null) => {
    setLoadingSummary(true);
    try {
      const query = days !== null ? `?retentionDays=${days}` : '';
      const res = await fetch(`/api/flights/cleanup-past${query}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSummary({
          totalPastCount: Number(data.totalPastCount || 0),
          eligibleCount: Number(data.eligibleCount || 0),
          cutoffDate: data.cutoffDate || null,
        });
      }
    } catch {
      // Ignore transient fetch errors
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    void fetchSummary(retentionDays);
  }, [retentionDays, fetchSummary]);

  useEffect(() => {
    if (!showConfirmModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !purging) {
        setShowConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal, purging]);

  const handleOpenCleanupModal = () => {
    setErrorMsg(null);
    if (retentionDays !== null && summary.eligibleCount > 0) {
      setCleanupScope('retention');
    } else {
      setCleanupScope('all');
    }
    setShowConfirmModal(true);
  };

  const targetDeleteCount =
    cleanupScope === 'retention' && retentionDays !== null
      ? summary.eligibleCount
      : summary.totalPastCount;

  const handleConfirmCleanup = async () => {
    if (purging || targetDeleteCount <= 0) return;
    setPurging(true);
    setErrorMsg(null);

    try {
      const payload =
        cleanupScope === 'retention' && retentionDays !== null
          ? { scope: 'retention' as const, retentionDays }
          : { scope: 'all' as const };

      const res = await fetch('/api/flights/cleanup-past', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to clean up past flights');
      }

      const deleted = Number(data.deletedCount || 0);
      setShowConfirmModal(false);
      setStatusFeedback(
        deleted === 0
          ? 'No archived past flights matched cleanup criteria.'
          : `Removed ${deleted} archived past ${deleted === 1 ? 'flight' : 'flights'} and associated price history.`
      );
      await fetchSummary(retentionDays);
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while cleaning up past flights.');
    } finally {
      setPurging(false);
    }
  };

  return (
    <>
      <SettingsCard className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-1">
              <Archive className="w-4 h-4 text-sky-400" />
              Past Flights Archive &amp; Retention
            </label>
            <p className="text-[11px] text-gunmetal-muted">
              Departed flights automatically move to Past status and stop consuming API checks. Choose how long to keep archived flights before automatic cleanup, or purge old records manually.
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-xs font-mono text-slate-200 flex-shrink-0">
            {loadingSummary
              ? 'Counting...'
              : `${summary.totalPastCount} archived ${summary.totalPastCount === 1 ? 'flight' : 'flights'}`}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
          <div className="w-full sm:max-w-sm">
            <label
              htmlFor="pastFlightRetentionDays"
              className="block text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted mb-1.5"
            >
              Automatic Retention Period
            </label>
            <SettingsSelect
              id="pastFlightRetentionDays"
              value={retentionDays !== null && retentionDays !== undefined ? String(retentionDays) : ''}
              onChange={e => {
                setStatusFeedback(null);
                const val = e.target.value;
                void onSelectRetentionDays(val === '' ? null : parseInt(val, 10));
              }}
              className="font-medium"
            >
              {RETENTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-gunmetal-card text-slate-200">
                  {opt.label}
                </option>
              ))}
            </SettingsSelect>
          </div>

          <button
            type="button"
            disabled={loadingSummary || summary.totalPastCount === 0}
            onClick={handleOpenCleanupModal}
            className="min-h-[44px] px-4 py-2 rounded-md bg-gunmetal-canvas hover:bg-rose-950/40 border border-gunmetal-border hover:border-rose-700/70 text-slate-200 hover:text-rose-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clean Up Past Flights</span>
          </button>
        </div>

        {retentionDays !== null && summary.totalPastCount > 0 && (
          <p className="text-[11px] text-gunmetal-muted font-mono">
            {summary.eligibleCount > 0
              ? `${summary.eligibleCount} past ${summary.eligibleCount === 1 ? 'flight' : 'flights'} departed more than ${retentionDays} days ago (before ${summary.cutoffDate}).`
              : `All ${summary.totalPastCount} archived past ${summary.totalPastCount === 1 ? 'flight is' : 'flights are'} within the ${retentionDays}-day retention window.`}
          </p>
        )}

        {statusFeedback && (
          <p className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-800/50 rounded-md px-3 py-2">
            {statusFeedback}
          </p>
        )}
      </SettingsCard>

      {showConfirmModal && (
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
                    <Trash2 className="w-5 h-5 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-100 truncate">
                      Clean Up Past Flights
                    </h3>
                    <p className="text-xs text-gunmetal-muted">
                      Permanent archive deletion
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={purging}
                  onClick={() => setShowConfirmModal(false)}
                  aria-label="Close modal"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                {errorMsg && (
                  <div className="bg-red-950/40 border border-red-800/70 p-3 rounded-md text-xs text-red-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {retentionDays !== null && (
                  <div className="space-y-2">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                      Cleanup Scope
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setCleanupScope('retention')}
                        className={`min-h-[44px] p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          cleanupScope === 'retention'
                            ? 'bg-rose-950/35 border-rose-600/80 text-slate-100'
                            : 'bg-gunmetal-canvas border-gunmetal-border text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span>Older than {retentionDays} days</span>
                          <span className="font-mono text-rose-300">
                            {summary.eligibleCount} {summary.eligibleCount === 1 ? 'flight' : 'flights'}
                          </span>
                        </div>
                        <span className="block text-[11px] text-gunmetal-muted mt-0.5">
                          Departed before {summary.cutoffDate}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCleanupScope('all')}
                        className={`min-h-[44px] p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          cleanupScope === 'all'
                            ? 'bg-rose-950/35 border-rose-600/80 text-slate-100'
                            : 'bg-gunmetal-canvas border-gunmetal-border text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <span>All Archived Past Flights</span>
                          <span className="font-mono text-rose-300">
                            {summary.totalPastCount} {summary.totalPastCount === 1 ? 'flight' : 'flights'}
                          </span>
                        </div>
                        <span className="block text-[11px] text-gunmetal-muted mt-0.5">
                          Remove every flight currently in Past status
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 space-y-1.5 text-xs text-amber-300/90">
                  <p className="font-semibold text-amber-200">
                    {targetDeleteCount} archived past {targetDeleteCount === 1 ? 'flight' : 'flights'} will be permanently deleted
                  </p>
                  <p className="leading-relaxed">
                    All recorded price history, carrier breakdowns, and market corridor benchmarks attached to those past flights will also be deleted. Active Watching, Booked, and Paused flights are unaffected.
                  </p>
                </div>

                <div className="pt-2 border-t border-gunmetal-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={purging}
                    onClick={() => setShowConfirmModal(false)}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={purging || targetDeleteCount === 0}
                    onClick={handleConfirmCleanup}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/80 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {purging ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Cleaning Up...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          Delete {targetDeleteCount} {targetDeleteCount === 1 ? 'Flight' : 'Flights'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SettingsModalPortal>
      )}
    </>
  );
}