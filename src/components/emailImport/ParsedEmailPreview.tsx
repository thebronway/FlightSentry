'use client';

import React from 'react';
import {
  Mail,
  Plane,
  Calendar,
  Coins,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Tag,
} from 'lucide-react';
import { EmailParseDiagnosticResult, EmailParserSource } from '@/types';
import { formatCurrency, isPointsCurrency } from '@/utils/format';
import { getAirlineName } from '@/utils/airline';

interface ParsedEmailPreviewProps {
  fileName?: string | null;
  diagnostic: EmailParseDiagnosticResult;
  actionSlot?: React.ReactNode;
}

const PARSER_TIER_LABELS: Record<EmailParserSource | 'none', string> = {
  schema_org: 'Schema.org JSON-LD',
  schema_org_microdata: 'Schema.org HTML Microdata',
  ics: 'iCalendar (.ics / RFC 5545)',
  heuristic: 'DOM-Segmented Heuristic',
  none: 'No Match',
};

const EVENT_TYPE_BADGES: Record<
  'new_booking' | 'schedule_change' | 'cancellation',
  { label: string; classes: string }
> = {
  new_booking: {
    label: 'New Booking',
    classes: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  },
  schedule_change: {
    label: 'Schedule Change',
    classes: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  },
  cancellation: {
    label: 'Cancellation',
    classes: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
  },
};

export default function ParsedEmailPreview({
  fileName,
  diagnostic,
  actionSlot,
}: ParsedEmailPreviewProps) {
  const hasEvents = diagnostic.events.length > 0;

  return (
    <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
      {/* Header Summary */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gunmetal-border pb-3.5">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {hasEvents ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-semibold bg-emerald-950/60 text-emerald-300 border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {diagnostic.events.length} Flight Event{diagnostic.events.length === 1 ? '' : 's'} Extracted
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-semibold bg-amber-950/60 text-amber-300 border-amber-800/60">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>No Actionable Flight Events</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border text-xs font-mono font-semibold bg-sky-950/60 text-sky-300 border-sky-800/60">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>{PARSER_TIER_LABELS[diagnostic.parserTierHit]}</span>
            </span>

            {diagnostic.unwrappedRfc822 && (
              <span className="px-2 py-0.5 rounded border text-[11px] font-mono font-semibold bg-gunmetal-canvas text-slate-300 border-gunmetal-border">
                Unwrapped message/rfc822
              </span>
            )}

            {diagnostic.icsAttachmentsCount > 0 && (
              <span className="px-2 py-0.5 rounded border text-[11px] font-mono font-semibold bg-gunmetal-canvas text-slate-300 border-gunmetal-border">
                {diagnostic.icsAttachmentsCount} .ics part{diagnostic.icsAttachmentsCount === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {diagnostic.subject && (
            <p className="text-sm font-bold text-slate-100 break-words pt-1">
              {diagnostic.subject}
            </p>
          )}
          {fileName && (
            <p className="text-[11px] font-mono text-gunmetal-muted">Source: {fileName}</p>
          )}
        </div>

        {actionSlot && <div className="flex items-center gap-2 flex-shrink-0">{actionSlot}</div>}
      </div>

      {/* Step-by-Step Envelope & Resolution Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-lg bg-gunmetal-canvas/70 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted flex items-center gap-1">
            <Mail className="w-3 h-3" />
            Effective Sender
          </span>
          <span className="font-mono text-slate-200 block mt-0.5 truncate" title={diagnostic.effectiveFromAddress || ''}>
            {diagnostic.effectiveFromAddress || 'Unknown'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gunmetal-canvas/70 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
            Resolved Carrier
          </span>
          <span className="font-semibold text-slate-200 block mt-0.5 truncate">
            {diagnostic.resolvedCarrier
              ? `${diagnostic.resolvedCarrier} (${getAirlineName(diagnostic.resolvedCarrier)})`
              : 'Not resolved'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gunmetal-canvas/70 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Email Header Date
          </span>
          <span className="font-mono text-slate-200 block mt-0.5 truncate">
            {diagnostic.emailDate ? diagnostic.emailDate.slice(0, 10) : 'None'}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-gunmetal-canvas/70 border border-gunmetal-border">
          <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Purchase / Cancel Date
          </span>
          <span className="font-mono text-slate-200 block mt-0.5 truncate">
            {diagnostic.effectiveTransactionDate || 'None'}
          </span>
        </div>
      </div>

      {/* Skip / Rejection Diagnostics */}
      {diagnostic.skipReason && (
        <div className="p-3 rounded-lg bg-amber-950/35 border border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Skip / Rejection Reason</span>
            <span>{diagnostic.skipReason}</span>
          </div>
        </div>
      )}

      {/* Extracted Flight Events List */}
      {hasEvents && (
        <div className="space-y-3">
          {diagnostic.events.map((ev, idx) => {
            const badge = EVENT_TYPE_BADGES[ev.eventType];
            const isPts = ev.isPoints === 1 || isPointsCurrency(ev.currency);
            const carrierCode = (ev.airline || '').toUpperCase();

            return (
              <div
                key={`${ev.dedupeKey}-${idx}`}
                className="p-3.5 rounded-xl bg-gunmetal-canvas/60 border border-gunmetal-border space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-gunmetal-muted">
                      Leg #{idx + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${badge.classes}`}>
                      {badge.label}
                    </span>
                    {isPts && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-amber-950/50 text-amber-300 border-amber-800/60 text-[11px] font-semibold">
                        <Coins className="w-3 h-3 text-amber-400" />
                        <span>{ev.currency || 'PTS'}</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-gunmetal-card border border-gunmetal-border font-mono text-[10px] text-gunmetal-muted uppercase">
                      Confidence: {ev.confidence}
                    </span>
                  </div>

                  {ev.alreadyInQueue && (
                    <span className="px-2 py-0.5 rounded border text-[11px] font-semibold bg-amber-950/40 text-amber-300 border-amber-800/60">
                      Already Seen / Queued
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
                    <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
                      Route
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-100 flex items-center gap-1.5 mt-0.5">
                      <Plane className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        {ev.origin || '???'} &rarr; {ev.destination || '???'}
                      </span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
                    <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
                      Carrier &amp; Flight
                    </span>
                    <span className="font-semibold text-slate-100 block mt-0.5 truncate">
                      {carrierCode
                        ? `${carrierCode}${ev.flightNumber ? ` ${ev.flightNumber}` : ''}`
                        : 'Not detected'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
                    <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
                      Departure / Arrival
                    </span>
                    <span className="font-mono text-slate-100 block mt-0.5">
                      {ev.departureDate || 'Date missing'}
                      {ev.departureTime ? ` · ${ev.departureTime}` : ''}
                      {ev.arrivalTime ? ` → ${ev.arrivalTime}` : ''}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-gunmetal-card/80 border border-gunmetal-border">
                    <span className="text-[10px] uppercase tracking-wider text-gunmetal-muted block">
                      {isPts ? 'PNR / Points Redeemed' : 'PNR / Paid Fare'}
                    </span>
                    <span className="font-mono text-slate-100 block mt-0.5">
                      {ev.pnr ? `PNR ${ev.pnr}` : 'No PNR'}
                      {ev.price && ev.price > 0
                        ? ` · ${formatCurrency(ev.price, isPts ? ev.currency || 'PTS' : ev.currency || 'USD')}`
                        : ''}
                      {isPts && ev.taxesAmount && ev.taxesAmount > 0
                        ? ` (+${formatCurrency(ev.taxesAmount, ev.taxesCurrency || 'USD')})`
                        : ''}
                    </span>
                  </div>
                </div>

                {ev.matchedFlightId && (
                  <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/50 flex items-center gap-2 text-[11px] text-sky-200">
                    <Link2 className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                    <span>
                      Matches Tracked Flight ID <strong className="font-mono">#{ev.matchedFlightId}</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}