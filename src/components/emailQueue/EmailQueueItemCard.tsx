'use client';

import { Mail, Plane, Calendar, Clock, Check, Pencil, Trash2, XCircle, Link2, AlertCircle, Coins } from 'lucide-react';
import { EmailQueueItem } from '@/types';
import { formatCurrency, isPointsCurrency } from '@/utils/format';
import { getAirlineName } from '@/utils/airline';

export interface ActiveFlightSummary {
  id: number;
  airline: string;
  flightNumber: string | null;
  origin: string | null;
  destination: string | null;
  departureDate: string;
  pnr: string | null;
  status: string;
}

interface Props {
  item: EmailQueueItem;
  matchedFlight: ActiveFlightSummary | null;
  selected: boolean;
  highlighted: boolean;
  busy: boolean;
  errorMessage?: string | null;
  onToggleSelect: (id: number) => void;
  onApply: (item: EmailQueueItem) => void;
  onEdit: (item: EmailQueueItem) => void;
  onDeny: (item: EmailQueueItem) => void;
}

const EVENT_BADGES: Record<
  EmailQueueItem['eventType'],
  { label: string; badgeClass: string; applyLabel: string }
> = {
  new_booking: {
    label: 'New Booking',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    applyLabel: 'Add Flight',
  },
  schedule_change: {
    label: 'Schedule Change',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    applyLabel: 'Apply Update',
  },
  cancellation: {
    label: 'Cancellation',
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    applyLabel: 'Delete Flight',
  },
};

export default function EmailQueueItemCard({
  item,
  matchedFlight,
  selected,
  highlighted,
  busy,
  errorMessage,
  onToggleSelect,
  onApply,
  onEdit,
  onDeny,
}: Props) {
  const meta = EVENT_BADGES[item.eventType] || EVENT_BADGES.new_booking;
  const carrierCode = (item.airline || '').toUpperCase();
  const carrierName = carrierCode ? getAirlineName(carrierCode) : null;
  const isCancellation = item.eventType === 'cancellation';
  const isPointsItem = item.isPoints === 1 || isPointsCurrency(item.currency);
  const isConvertingWatched = item.eventType === 'new_booking' && Boolean(matchedFlight);
  const applyButtonLabel = isConvertingWatched
    ? isPointsItem
      ? 'Convert to Booked (Points)'
      : 'Convert to Booked'
    : item.eventType === 'new_booking' && isPointsItem
    ? 'Add Points Flight'
    : meta.applyLabel;

  return (
    <div
      className={`rounded-xl border transition-all p-4 space-y-3 ${
        highlighted
          ? 'bg-sky-950/25 border-sky-500/80 ring-1 ring-sky-500/50'
          : selected
          ? 'bg-gunmetal-canvas/90 border-slate-500'
          : 'bg-gunmetal-canvas/60 border-gunmetal-border'
      }`}
    >
      {/* Top Row: Selection Checkbox, Badges & Inbox Source */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            disabled={busy}
            onChange={() => onToggleSelect(item.id)}
            aria-label={`Select email event ${item.id}`}
            className="w-4 h-4 accent-slate-500 rounded cursor-pointer"
          />

          <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${meta.badgeClass}`}>
            {meta.label}
          </span>

          {isPointsItem && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-amber-950/50 text-amber-300 border-amber-800/60 text-[11px] font-semibold">
              <Coins className="w-3 h-3 text-amber-400" />
              <span>{item.currency && item.currency !== 'PTS' ? item.currency : 'Points / Miles'}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gunmetal-card border border-gunmetal-border text-[11px] font-semibold text-sky-300">
            <Mail className="w-3 h-3 text-sky-400" />
            <span>{item.accountLabel}</span>
          </span>

          <span className="px-2 py-0.5 rounded bg-gunmetal-card border border-gunmetal-border font-mono text-[10px] text-gunmetal-muted uppercase">
            {item.parserSource === 'schema_org' ? 'Schema.org' : 'Heuristic'} · {item.confidence}
          </span>
        </div>

        {item.emailDate && (
          <span className="text-[11px] text-gunmetal-muted">
            {new Date(item.emailDate).toLocaleString()}
          </span>
        )}
      </div>

      {/* Main Itinerary Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
            Route
          </span>
          <span className="font-mono font-bold text-sm text-slate-100 flex items-center gap-1.5 mt-0.5">
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {item.origin || '???'} &rarr; {item.destination || '???'}
            </span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
            Carrier &amp; Flight
          </span>
          <span className="font-semibold text-slate-100 block mt-0.5 truncate">
            {carrierCode
              ? `${carrierCode}${item.flightNumber ? ` ${item.flightNumber}` : ''}${
                  carrierName ? ` (${carrierName})` : ''
                }`
              : 'Not detected'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Departure
          </span>
          <span className="font-mono text-slate-100 block mt-0.5">
            {item.departureDate || 'Date missing'}
            {item.departureTime ? ` · ${item.departureTime}` : ''}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
            {isPointsItem ? 'PNR / Points Redeemed' : 'PNR / Paid Fare'}
          </span>
          <span className="font-mono text-slate-100 block mt-0.5">
            {item.pnr ? `PNR ${item.pnr}` : 'No PNR'}
            {item.price && item.price > 0
              ? ` · ${formatCurrency(item.price, isPointsItem ? (item.currency || 'PTS') : (item.currency || 'USD'))}`
              : ''}
            {isPointsItem && item.taxesAmount && item.taxesAmount > 0
              ? ` (+${formatCurrency(item.taxesAmount, item.taxesCurrency || 'USD')})`
              : ''}
          </span>
        </div>
      </div>

      {/* Email Metadata & Matched Tracked Flight Callout */}
      <div className="space-y-1.5 text-xs">
        {(item.emailSubject || item.emailFrom) && (
          <div className="text-[11px] text-gunmetal-muted flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {item.emailSubject && (
              <span className="text-slate-300 font-medium truncate max-w-full">
                Subject: &ldquo;{item.emailSubject}&rdquo;
              </span>
            )}
            {item.emailFrom && <span>from {item.emailFrom}</span>}
          </div>
        )}

        {matchedFlight && (
          <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/50 flex items-center gap-2 text-[11px] text-sky-200">
            <Link2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span>
              {item.eventType === 'new_booking' ? 'Matches Watched ' : 'Matched Tracked Flight: '}
              <strong className="font-mono">
                {matchedFlight.airline && matchedFlight.flightNumber
                  ? `${matchedFlight.airline} ${matchedFlight.flightNumber}`
                  : 'Route Watch'}{' '}
                ({matchedFlight.origin || '?'} &rarr; {matchedFlight.destination || '?'} on{' '}
                {matchedFlight.departureDate})
              </strong>{' '}
              [{matchedFlight.status}]
              {item.eventType === 'new_booking'
                ? ' — applying will convert in place and keep price history'
                : ''}
            </span>
          </div>
        )}

        {!matchedFlight &&
          (item.eventType === 'schedule_change' || isCancellation) && (
            <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/50 flex items-center gap-2 text-[11px] text-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                {isCancellation ? (
                  <>
                    No tracked flight matched automatically. Click <strong>Select Flight</strong> to choose which flight to delete, or <strong>Deny</strong> to dismiss.
                  </>
                ) : (
                  <>
                    No tracked flight matched automatically. Click <strong>Edit Before Applying</strong> to select which flight to update.
                  </>
                )}
              </span>
            </div>
          )}

        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-rose-950/45 border border-rose-700/70 flex items-start gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2.5 border-t border-gunmetal-border/70 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onDeny(item)}
          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/80 text-rose-200 hover:text-white inline-flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Deny</span>
        </button>

        {!isCancellation ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(item)}
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {item.eventType === 'schedule_change' ? 'Edit Before Applying' : 'Edit Before Adding'}
            </span>
          </button>
        ) : !matchedFlight ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(item)}
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Select Flight</span>
          </button>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => onApply(item)}
          className={`min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1.5 border shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${
            isCancellation
              ? 'bg-rose-950/60 hover:bg-rose-900/80 border-rose-700/80 text-rose-200 hover:text-white'
              : 'bg-emerald-950/60 hover:bg-emerald-900/75 border-emerald-700/80 text-emerald-200 hover:text-white'
          }`}
        >
          {isCancellation ? (
            <Trash2 className="w-3.5 h-3.5" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>{applyButtonLabel}</span>
        </button>
      </div>
    </div>
  );
}