'use client';

import { useState } from 'react';
import { ArrowRight, GitBranch, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { TrackedFlightLeg } from '@/types';
import AirlineTagInput from '../common/AirlineTagInput';
import { isValidAirlineCode, normalizeAirlineCode } from '@/utils/airline';

interface Props {
  legs: TrackedFlightLeg[];
  departureDate: string;
  onUpdateLeg: (index: number, patch: Partial<TrackedFlightLeg>) => void;
  onAddLeg: () => void;
  onRemoveLeg: (index: number) => void;
  onClearLayovers: () => void;
}

export default function ConnectingLegsSection({
  legs,
  departureDate,
  onUpdateLeg,
  onAddLeg,
  onRemoveLeg,
  onClearLayovers,
}: Props) {
  const [lookingUpIndex, setLookingUpIndex] = useState<number | null>(null);
  const [lookupHint, setLookupHint] = useState<{ index: number; text: string } | null>(null);
  const [draftCarriers, setDraftCarriers] = useState<Record<number, string>>({});

  const resolveCarrierForLookup = (leg: TrackedFlightLeg, idx: number): string => {
    if (leg.airline && isValidAirlineCode(leg.airline)) return leg.airline;
    const raw = (draftCarriers[idx] || '').trim();
    if (!raw) return '';
    const norm = normalizeAirlineCode(raw);
    if (norm !== 'UN' && isValidAirlineCode(norm)) return norm;
    const upper = raw.toUpperCase();
    return isValidAirlineCode(upper) ? upper : '';
  };

  const handleLegLookup = async (idx: number) => {
    const leg = legs[idx];
    if (!leg || lookingUpIndex !== null) return;
    const carrier = resolveCarrierForLookup(leg, idx);
    const flightNum = (leg.flightNumber || '').trim().replace(/\D/g, '');
    if (!carrier || !flightNum) return;

    setLookingUpIndex(idx);
    setLookupHint(null);
    try {
      const res = await fetch('/api/flights/lookup-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airline: carrier,
          flightNumber: flightNum,
          departureDate: departureDate || undefined,
        }),
      });
      const data = await res.json();
      const routes = Array.isArray(data.routes) && data.routes.length > 0
        ? data.routes
        : data.success && data.origin && data.destination
        ? [{ origin: data.origin, destination: data.destination }]
        : [];

      if (routes.length === 1) {
        const match = routes[0];
        const patch: Partial<TrackedFlightLeg> = { airline: carrier };
        if (idx === 0 && !leg.origin) {
          patch.origin = String(match.origin).toUpperCase();
        }
        if (!leg.destination) {
          patch.destination = String(match.destination).toUpperCase();
        }
        onUpdateLeg(idx, patch);
        setLookupHint({
          index: idx,
          text: `Scheduled: ${String(match.origin).toUpperCase()} → ${String(match.destination).toUpperCase()}`,
        });
      } else if (routes.length > 1) {
        setLookupHint({
          index: idx,
          text: `Operates ${routes.map((r: any) => `${r.origin} → ${r.destination}`).join(' or ')}`,
        });
      } else {
        setLookupHint({
          index: idx,
          text: 'Route not auto-detected — enter airports manually.',
        });
      }
    } catch {
      setLookupHint({
        index: idx,
        text: 'Route lookup unavailable — enter airports manually.',
      });
    } finally {
      setLookingUpIndex(null);
    }
  };

  const sanitizeAirport = (raw: string): string =>
    raw.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();

  const layoverCount = Math.max(1, legs.length - 1);

  return (
    <div className="pt-3 border-t border-gunmetal-border/70 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-sky-400" />
            <span>Connecting Itinerary Legs ({legs.length} Legs · {layoverCount} {layoverCount === 1 ? 'Layover' : 'Layovers'})</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onClearLayovers}
          className="min-h-[44px] sm:min-h-[34px] px-2.5 py-1 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Switch to Nonstop / Direct</span>
        </button>
      </div>

      <p className="text-xs text-gunmetal-muted leading-relaxed">
        Enter each flight segment in order. FlightSentry queries the full connecting itinerary on a single card so married-segment fares and layover airports stay grouped together.
      </p>

      <div className="space-y-3">
        {legs.map((leg, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === legs.length - 1;
          const carrierForLookup = resolveCarrierForLookup(leg, idx);
          const canLookup = carrierForLookup.length >= 2 && (leg.flightNumber || '').replace(/\D/g, '').length >= 1;

          return (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold bg-sky-950/60 text-sky-300 border-sky-800/60">
                    Leg {idx + 1} of {legs.length}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-300 inline-flex items-center gap-1">
                    <span>{leg.origin || '___'}</span>
                    <ArrowRight className="w-3 h-3 text-gunmetal-muted" />
                    <span>{leg.destination || '___'}</span>
                  </span>
                  {!isLast && leg.destination.length === 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold bg-amber-950/60 text-amber-300 border-amber-800/60">
                      Layover at {leg.destination}
                    </span>
                  )}
                </div>

                {legs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => onRemoveLeg(idx)}
                    aria-label={`Remove Leg ${idx + 1}`}
                    title={`Remove Leg ${idx + 1}`}
                    className="min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px] inline-flex items-center justify-center rounded-md text-gunmetal-muted hover:text-rose-300 hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Carrier */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Carrier *
                  </label>
                  <AirlineTagInput
                    value={leg.airline}
                    onChange={(val) => onUpdateLeg(idx, { airline: val })}
                    onDraftChange={(draft) =>
                      setDraftCarriers((prev) => ({ ...prev, [idx]: draft }))
                    }
                    maxTags={1}
                    placeholder="e.g. DL"
                  />
                </div>

                {/* Flight Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Flight # *
                  </label>
                  <div className="relative">
                    <input
                      required
                      pattern="\d+"
                      placeholder="e.g. 523"
                      value={leg.flightNumber}
                      onChange={(e) =>
                        onUpdateLeg(idx, {
                          flightNumber: e.target.value.replace(/\D/g, ''),
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleLegLookup(idx);
                        }
                      }}
                      className="w-full min-h-[44px] sm:min-h-[38px] pl-3 pr-10 py-2 text-sm rounded-md bg-gunmetal-card text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                    />
                    <button
                      type="button"
                      disabled={!canLookup || lookingUpIndex !== null}
                      onClick={() => void handleLegLookup(idx)}
                      title="Look up scheduled leg route"
                      aria-label={`Look up Leg ${idx + 1} route`}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-sky-300 transition-colors disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                    >
                      {lookingUpIndex === idx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Leg Origin */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {isFirst ? 'Origin Airport *' : `Layover ${idx} Airport *`}
                  </label>
                  <input
                    required
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    readOnly={!isFirst}
                    placeholder="e.g. DCA"
                    value={leg.origin}
                    onChange={(e) => {
                      if (isFirst) {
                        onUpdateLeg(idx, { origin: sanitizeAirport(e.target.value) });
                      }
                    }}
                    className={`w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm uppercase rounded-md border border-gunmetal-border font-mono focus:outline-none ${
                      isFirst
                        ? 'bg-gunmetal-card text-slate-100 focus:border-slate-500 placeholder-zinc-500'
                        : 'bg-gunmetal-card/50 text-sky-300 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Leg Destination */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    {isLast ? 'Final Destination *' : `Layover ${idx + 1} Airport *`}
                  </label>
                  <input
                    required
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    placeholder={isLast ? 'e.g. LAX' : 'e.g. ATL'}
                    value={leg.destination}
                    onChange={(e) =>
                      onUpdateLeg(idx, { destination: sanitizeAirport(e.target.value) })
                    }
                    className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-card text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
              </div>

              {lookupHint && lookupHint.index === idx && (
                <p className="text-[11px] font-mono text-sky-300">
                  {lookupHint.text}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {legs.length < 4 && (
        <button
          type="button"
          onClick={onAddLeg}
          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Another Layover</span>
        </button>
      )}
    </div>
  );
}