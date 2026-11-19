'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Mail, CheckCheck, Trash2, RefreshCw, Inbox } from 'lucide-react';
import { EmailQueueItem } from '@/types';
import SettingsModalPortal from '../settings/shared/SettingsModalPortal';
import EmailQueueItemCard, { ActiveFlightSummary } from './EmailQueueItemCard';
import EmailQueueEditModal from './EmailQueueEditModal';

interface Props {
  isOpen: boolean;
  highlightedItemId?: number | null;
  onClose: () => void;
  onQueueMutated: () => void;
}

export default function EmailQueueModal({
  isOpen,
  highlightedItemId,
  onClose,
  onQueueMutated,
}: Props) {
  const [items, setItems] = useState<EmailQueueItem[]>([]);
  const [flights, setFlights] = useState<ActiveFlightSummary[]>([]);
  const [pointsCurrencies, setPointsCurrencies] = useState<string[]>([]);
  const [defaultFiatCurrency, setDefaultFiatCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [editingItem, setEditingItem] = useState<EmailQueueItem | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/email-queue', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const loadedItems = (data.items || []) as EmailQueueItem[];
        setItems(loadedItems);
        setFlights((data.flights || []) as ActiveFlightSummary[]);
        setPointsCurrencies(Array.isArray(data.pointsCurrencies) ? data.pointsCurrencies : []);
        if (typeof data.defaultCurrency === 'string' && data.defaultCurrency) {
          setDefaultFiatCurrency(data.defaultCurrency);
        }
        setSelectedIds((prev) =>
          prev.filter((id) => loadedItems.some((it) => it.id === id))
        );
      }
    } catch (err) {
      console.error('Failed to load email queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setItemErrors({});
      void fetchQueue();
    }
  }, [isOpen, fetchQueue]);

  if (!isOpen) return null;

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((it) => it.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApplySingle = async (item: EmailQueueItem) => {
    setBusyIds((prev) => [...prev, item.id]);
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    try {
      const res = await fetch(`/api/email-queue/${item.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        onQueueMutated();
      } else {
        setItemErrors((prev) => ({
          ...prev,
          [item.id]: data.error || 'Unable to apply this item',
        }));
      }
    } catch (err: any) {
      setItemErrors((prev) => ({
        ...prev,
        [item.id]: err?.message || 'Network error applying item',
      }));
    } finally {
      setBusyIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const handleDenySingle = async (item: EmailQueueItem) => {
    setBusyIds((prev) => [...prev, item.id]);
    try {
      const res = await fetch(`/api/email-queue/${item.id}/deny`, {
        method: 'POST',
      });
      if (res.ok) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        setSelectedIds((prev) => prev.filter((id) => id !== item.id));
        onQueueMutated();
      }
    } finally {
      setBusyIds((prev) => prev.filter((id) => id !== item.id));
    }
  };

  const handleBulkAction = async (action: 'apply' | 'deny') => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    setItemErrors({});

    try {
      const res = await fetch('/api/email-queue/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (action === 'deny') {
          setItems((prev) => prev.filter((it) => !selectedIds.includes(it.id)));
          setSelectedIds([]);
        } else {
          const appliedIds = new Set(
            ((data.applied || []) as Array<{ queueItemId: number }>).map(
              (a) => a.queueItemId
            )
          );
          const failures = (data.failed || []) as Array<{ id: number; error: string }>;
          const errMap: Record<number, string> = {};
          for (const f of failures) {
            errMap[f.id] = f.error;
          }
          setItemErrors(errMap);
          setItems((prev) => prev.filter((it) => !appliedIds.has(it.id)));
          setSelectedIds((prev) => prev.filter((id) => !appliedIds.has(id)));
        }
        onQueueMutated();
      }
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 md:p-6"
      >
        <div className="bg-gunmetal-card w-full h-full sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-2xl shadow-2xl border border-gunmetal-border flex flex-col overflow-hidden max-w-4xl lg:max-w-5xl xl:max-w-6xl">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gunmetal-border flex items-center justify-between bg-gunmetal-nav/80">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-sky-400" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Email Scanner Review Queue</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800/60">
                    {items.length}
                  </span>
                </h2>
                <p className="text-xs text-gunmetal-muted">
                  Review, edit, apply, or dismiss detected airline bookings, schedule changes, and cancellations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void fetchQueue()}
                disabled={loading}
                title="Refresh queue"
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close email queue modal"
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {items.length > 0 && (
            <div className="px-4 sm:px-6 py-2.5 border-b border-gunmetal-border bg-gunmetal-canvas/70 flex flex-wrap items-center justify-between gap-2.5">
              <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
                />
                <span>
                  {selectedIds.length > 0
                    ? `${selectedIds.length} of ${items.length} selected`
                    : `Select All (${items.length})`}
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={selectedIds.length === 0 || bulkBusy}
                  onClick={() => void handleBulkAction('deny')}
                  className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-rose-200 hover:text-white inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Deny Selected</span>
                </button>

                <button
                  type="button"
                  disabled={selectedIds.length === 0 || bulkBusy}
                  onClick={() => void handleBulkAction('apply')}
                  className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/75 border border-emerald-700/80 text-emerald-200 hover:text-white inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{bulkBusy ? 'Applying...' : 'Add / Apply Selected'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Queue Items List */}
          <div className="flex-1 overflow-y-auto [overflow-anchor:none] p-4 sm:p-6 space-y-3.5 min-h-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-gunmetal-muted">
                Loading pending email events...
              </div>
            ) : items.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed border-gunmetal-border rounded-xl bg-gunmetal-canvas/30 space-y-2">
                <Inbox className="w-7 h-7 text-gunmetal-muted mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Email review queue is empty</p>
                <p className="text-xs text-gunmetal-muted max-w-md mx-auto">
                  Newly detected airline confirmations, schedule changes, and cancellations will appear here for your approval.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const matchedFlight = item.matchedFlightId
                  ? flights.find((f) => f.id === item.matchedFlightId) || null
                  : null;
                return (
                  <EmailQueueItemCard
                    key={item.id}
                    item={item}
                    matchedFlight={matchedFlight}
                    selected={selectedIds.includes(item.id)}
                    highlighted={highlightedItemId === item.id}
                    busy={bulkBusy || busyIds.includes(item.id)}
                    errorMessage={itemErrors[item.id] || null}
                    onToggleSelect={toggleSelectOne}
                    onApply={handleApplySingle}
                    onEdit={(it) => setEditingItem(it)}
                    onDeny={handleDenySingle}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      <EmailQueueEditModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        flights={flights}
        pointsCurrencies={pointsCurrencies}
        defaultFiatCurrency={defaultFiatCurrency}
        onClose={() => setEditingItem(null)}
        onApplied={(appliedId) => {
          setItems((prev) => prev.filter((it) => it.id !== appliedId));
          setSelectedIds((prev) => prev.filter((id) => id !== appliedId));
          onQueueMutated();
        }}
      />
    </SettingsModalPortal>
  );
}