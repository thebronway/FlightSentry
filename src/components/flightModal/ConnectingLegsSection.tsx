'use client';

import { Fragment, useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, ArrowRight, CheckCircle2, GitBranch, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { TrackedFlightLeg } from '@/types';
import AirlineTagInput from '../common/AirlineTagInput';
import { isValidAirlineCode, normalizeAirlineCode } from '@/utils/airline';

interface DetectedLegCandidate {
  origin: string;
  destination: string;
}

interface LegLookupFeedback {
  index: number;
  status: 'applied' | 'multiple' | 'mismatch' | 'empty';
  text: string;
  candidates?: DetectedLegCandidate[];
}

interface Props {
  legs: TrackedFlightLeg[];
  departureDate: string;
  onUpdateLeg: (index: number, patch: Partial<TrackedFlightLeg>) => void;
  onAddLeg: () => void;
  onRemoveLeg: (index: number) => void;
  onClearLayovers?: () => void;
}

export default function ConnectingLegsSection({
  legs,
  departureDate,
  onUpdateLeg,
  onAddLeg,
  onRemoveLeg,
}: Props) {
  const [lookingUpIndex, setLookingUpIndex] = useState<number | null>(null);
  const [lookupFeedback, setLookupFeedback] = useState<LegLookupFeedback | null>(null);
  const [draftCarriers, setDraftCarriers] = useState<Record<number, string>>({});

  const debounceTimersRef = useRef<Record<number, NodeJS.Timeout>>({});
  const lastQueriedKeyRef = useRef<Record<number, string>>({});
  const latestLegsRef = useRef(legs);
  const latestDepartureDateRef = useRef(departureDate);
  const latestDraftCarriersRef = useRef(draftCarriers);
  const onUpdateLegRef = useRef(onUpdateLeg);

  latestLegsRef.current = legs;
  latestDepartureDateRef.current = departureDate;
  latestDraftCarriersRef.current = draftCarriers;
  onUpdateLegRef.current = onUpdateLeg;

  const resolveCarrierFromData = useCallback(
    (leg: TrackedFlightLeg | undefined, idx: number, drafts: Record<number, string>): string => {
      if (!leg) return '';
      if (leg.airline && isValidAirlineCode(leg.airline)) return leg.airline;
      const raw = (drafts[idx] || '').trim();
      if (!raw) return '';
      const norm = normalizeAirlineCode(raw, leg.flightNumber);
      if (norm !== 'UN' && isValidAirlineCode(norm)) return norm;
      const upper = raw.toUpperCase();
      return isValidAirlineCode(upper) ? upper : '';
    },
    []
  );

  const resolveCarrierForLookup = useCallback(
    (leg: TrackedFlightLeg, idx: number): string =>
      resolveCarrierFromData(leg, idx, draftCarriers),
    [draftCarriers, resolveCarrierFromData]
  );

  const clearLegTimer = useCallback((idx: number) => {
    if (debounceTimersRef.current[idx]) {
      clearTimeout(debounceTimersRef.current[idx]);
      delete debounceTimersRef.current[idx];
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const applyRouteCandidateToLeg = (idx: number, candidate: DetectedLegCandidate) => {
    const leg = legs[idx];
    if (!leg) return;
    const carrier = resolveCarrierForLookup(leg, idx);
    const patch: Partial<TrackedFlightLeg> = {
      origin: candidate.origin,
      destination: candidate.destination,
    };
    if (carrier) {
      patch.airline = carrier;
    }
    onUpdateLeg(idx, patch);
    setLookupFeedback({
      index: idx,
      status: 'applied',
      text: `Applied ${candidate.origin} → ${candidate.destination}`,
    });
  };

  const handleLegLookup = useCallback(
    async (idx: number, force = false) => {
      const currentLegs = latestLegsRef.current;
      const leg = currentLegs[idx];
      if (!leg) return;

      const carrier = resolveCarrierFromData(leg, idx, latestDraftCarriersRef.current);
      const flightNum = (leg.flightNumber || '').trim().replace(/\D/g, '');
      const cleanDate = latestDepartureDateRef.current?.trim() || '';
      if (!carrier || !flightNum) return;

      const queryKey = `${carrier}:${flightNum}:${cleanDate}`;
      if (!force && lastQueriedKeyRef.current[idx] === queryKey) {
        return;
      }
      lastQueriedKeyRef.current[idx] = queryKey;

      setLookingUpIndex(idx);
      setLookupFeedback(prev => (prev?.index === idx ? null : prev));
      try {
        const res = await fetch('/api/flights/lookup-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            airline: carrier,
            flightNumber: flightNum,
            departureDate: cleanDate || undefined,
          }),
        });
        const data = await res.json();
        const rawRoutes: any[] =
          Array.isArray(data.routes) && data.routes.length > 0
            ? data.routes
            : data.success && data.origin && data.destination
            ? [{ origin: data.origin, destination: data.destination }]
            : [];

        const candidates: DetectedLegCandidate[] = rawRoutes
          .map(r => ({
            origin: String(r.origin || '').trim().toUpperCase(),
            destination: String(r.destination || '').trim().toUpperCase(),
          }))
          .filter(r => r.origin.length === 3 && r.destination.length === 3 && r.origin !== r.destination);

        const freshLeg = latestLegsRef.current[idx] || leg;

        if (candidates.length === 1) {
          const match = candidates[0];
          const canAutoSetOrigin = !freshLeg.origin || freshLeg.origin === match.origin;
          const canAutoSetDest = !freshLeg.destination || freshLeg.destination === match.destination;

          if (canAutoSetOrigin && canAutoSetDest) {
            const patch: Partial<TrackedFlightLeg> = {
              airline: carrier,
              origin: match.origin,
              destination: match.destination,
            };
            onUpdateLegRef.current(idx, patch);
            setLookupFeedback({
              index: idx,
              status: 'applied',
              text: `Scheduled: ${match.origin} → ${match.destination}`,
            });
          } else {
            setLookupFeedback({
              index: idx,
              status: 'mismatch',
              text: `Schedule shows ${match.origin} → ${match.destination}.`,
              candidates: [match],
            });
          }
        } else if (candidates.length > 1) {
          setLookupFeedback({
            index: idx,
            status: 'multiple',
            text: 'Multiple routes operate under this flight number — select your segment:',
            candidates,
          });
        } else {
          setLookupFeedback({
            index: idx,
            status: 'empty',
            text: 'Route not auto-detected — enter airport codes manually.',
          });
        }
      } catch {
        setLookupFeedback({
          index: idx,
          status: 'empty',
          text: 'Route lookup unavailable — enter airport codes manually.',
        });
      } finally {
        setLookingUpIndex(prev => (prev === idx ? null : prev));
      }
    },
    [resolveCarrierFromData]
  );

  // Hybrid idle debounce while typing on any leg (matches nonstop route lookup behavior)
  useEffect(() => {
    legs.forEach((leg, idx) => {
      clearLegTimer(idx);
      const carrier = resolveCarrierFromData(leg, idx, draftCarriers);
      const flightNum = (leg.flightNumber || '').trim().replace(/\D/g, '');
      if (!carrier || flightNum.length < 2) {
        return;
      }
      const delayMs = flightNum.length >= 4 ? 600 : 1200;
      debounceTimersRef.current[idx] = setTimeout(() => {
        void handleLegLookup(idx, false);
      }, delayMs);
    });
  }, [legs, draftCarriers, departureDate, clearLegTimer, resolveCarrierFromData, handleLegLookup]);

  const triggerLegBlurLookup = (idx: number) => {
    clearLegTimer(idx);
    void handleLegLookup(idx, false);
  };

  const sanitizeAirport = (raw: string): string =>
    raw.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();

  const layoverCount = Math.max(1, legs.length - 1);
  const airportChain = legs.length > 0 ? [legs[0].origin, ...legs.map(l => l.destination)] : [];

  return (
    <div className="pt-3 border-t border-gunmetal-border/70 space-y-3.5">
      {/* Header & Visual Itinerary Path Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-sky-400" />
          <span>
            Connecting Segments ({legs.length} Legs · {layoverCount} {layoverCount === 1 ? 'Layover' : 'Layovers'})
          </span>
        </span>

        {/* Live Airport Chain Preview */}
        <div className="flex flex-wrap items-center gap-1.5">
          {airportChain.map((code, idx) => {
            const isLayover = idx > 0 && idx < airportChain.length - 1;
            const label = code && code.length === 3 ? code : '___';
            return (
              <Fragment key={`chain-${idx}`}>
                {idx > 0 && <ArrowRight className="w-3 h-3 text-gunmetal-muted flex-shrink-0" />}
                <span
                  className={`px-2 py-0.5 rounded font-mono text-xs font-bold border ${
                    label === '___'
                      ? 'bg-gunmetal-canvas border-dashed border-gunmetal-border text-gunmetal-muted'
                      : isLayover
                      ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                      : 'bg-sky-950/60 border-sky-700/60 text-sky-200'
                  }`}
                >
                  {label}
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gunmetal-muted leading-relaxed">
        Enter each flight leg in sequence. Each leg&apos;s arrival airport automatically becomes the next leg&apos;s departure airport.
      </p>

      {/* Segment Cards with Explicit Connection Bridges */}
      <div className="space-y-2.5">
        {legs.map((leg, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === legs.length - 1;
          const carrierForLookup = resolveCarrierForLookup(leg, idx);
          const canLookup =
            carrierForLookup.length >= 2 && (leg.flightNumber || '').replace(/\D/g, '').length >= 1;
          const legFeedback = lookupFeedback && lookupFeedback.index === idx ? lookupFeedback : null;

          return (
            <Fragment key={`segment-${idx}`}>
              <div className="p-3.5 sm:p-4 rounded-lg bg-gunmetal-canvas border border-gunmetal-border space-y-3">
                {/* Segment Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold bg-sky-950/60 text-sky-300 border-sky-800/60">
                      Leg {idx + 1} of {legs.length}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200 inline-flex items-center gap-1.5">
                      <span>{leg.origin || '___'}</span>
                      <ArrowRight className="w-3 h-3 text-gunmetal-muted" />
                      <span>{leg.destination || '___'}</span>
                    </span>
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

                {/* Segment Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Carrier */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Carrier *
                    </label>
                    <AirlineTagInput
                      value={leg.airline}
                      onChange={val => onUpdateLeg(idx, { airline: val })}
                      onDraftChange={draft =>
                        setDraftCarriers(prev => ({ ...prev, [idx]: draft }))
                      }
                      onBlur={() => triggerLegBlurLookup(idx)}
                      maxTags={1}
                      placeholder="e.g. DL"
                    />
                  </div>

                  {/* Flight Number + Route Lookup */}
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
                        onChange={e =>
                          onUpdateLeg(idx, {
                            flightNumber: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        onBlur={() => triggerLegBlurLookup(idx)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            clearLegTimer(idx);
                            void handleLegLookup(idx, true);
                          }
                        }}
                        className="w-full min-h-[44px] sm:min-h-[38px] pl-3 pr-11 py-2 text-sm rounded-md bg-gunmetal-card text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                      />
                      <button
                        type="button"
                        disabled={!canLookup || lookingUpIndex !== null}
                        onClick={() => {
                          clearLegTimer(idx);
                          void handleLegLookup(idx, true);
                        }}
                        title="Look up scheduled leg route"
                        aria-label={`Look up Leg ${idx + 1} route`}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-7 sm:w-7 flex items-center justify-center rounded bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-sky-300 transition-colors disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                      >
                        {lookingUpIndex === idx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Departure Airport */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      {isFirst ? 'Origin Airport *' : 'From Layover *'}
                    </label>
                    {isFirst ? (
                      <input
                        required
                        maxLength={3}
                        pattern="[A-Za-z]{3}"
                        placeholder="e.g. DCA"
                        value={leg.origin}
                        onChange={e =>
                          onUpdateLeg(idx, { origin: sanitizeAirport(e.target.value) })
                        }
                        className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-card text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                      />
                    ) : (
                      <div className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm rounded-md bg-gunmetal-card/60 border border-gunmetal-border flex items-center justify-between font-mono">
                        <span className={leg.origin ? 'font-bold text-amber-300' : 'text-gunmetal-muted'}>
                          {leg.origin || 'Set Leg ' + idx + ' arrival'}
                        </span>
                        <span className="text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted">
                          Auto-linked
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrival Airport */}
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
                      onChange={e =>
                        onUpdateLeg(idx, { destination: sanitizeAirport(e.target.value) })
                      }
                      className="w-full min-h-[44px] sm:min-h-[38px] px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-card text-slate-100 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                    />
                  </div>
                </div>

                {/* Per-Leg Route Lookup Feedback */}
                {legFeedback && (
                  <div
                    className={`p-2.5 rounded-md border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      legFeedback.status === 'applied'
                        ? 'bg-emerald-950/35 border-emerald-800/60 text-emerald-300'
                        : legFeedback.status === 'mismatch'
                        ? 'bg-amber-950/35 border-amber-800/60 text-amber-200'
                        : legFeedback.status === 'multiple'
                        ? 'bg-sky-950/35 border-sky-800/60 text-sky-200'
                        : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {legFeedback.status === 'applied' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      )}
                      <span>{legFeedback.text}</span>
                    </span>

                    {legFeedback.candidates && legFeedback.candidates.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {legFeedback.candidates.map(cand => (
                          <button
                            key={`${cand.origin}-${cand.destination}`}
                            type="button"
                            onClick={() => applyRouteCandidateToLeg(idx, cand)}
                            className="min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded bg-slate-800/85 hover:bg-slate-700 border border-slate-500/80 text-slate-100 font-mono text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Use {cand.origin} → {cand.destination}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Visual Connection Bridge Between Legs */}
              {!isLast && (
                <div className="flex items-center justify-center gap-2 py-0.5 text-[11px] font-mono text-amber-300">
                  <span className="h-px flex-1 bg-gunmetal-border" />
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/50 border border-amber-800/60">
                    <ArrowDown className="w-3 h-3" />
                    <span>
                      {leg.destination && leg.destination.length === 3
                        ? `Connection at ${leg.destination}`
                        : `Layover ${idx + 1} Airport`}
                    </span>
                  </span>
                  <span className="h-px flex-1 bg-gunmetal-border" />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Add Another Layover Button (up to 4 legs / 3 layovers) */}
      {legs.length < 4 && (
        <button
          type="button"
          onClick={onAddLeg}
          className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-slate-300 hover:text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Another Layover (Up to 3 Stops)</span>
        </button>
      )}
    </div>
  );
}