'use client';

import { Fragment } from 'react';
import { ArrowRight, Pencil } from 'lucide-react';
import { RouteItinerary, RouteSegment, TrackedFlightLeg } from '@/types';
import { formatCurrency } from '@/utils/format';
import { cleanDisplayTime } from '@/utils/airline';
import { normalizeSingleTrackedLeg, getLayoverAirports } from '@/utils/flightLegs';
import AirlineBadge from '../common/AirlineBadge';

export interface ConvertCandidateFlight {
  key: string;
  airline: string;
  flightNumber?: string;
  price: number;
  departureTime?: string;
  stops?: number;
  isNonstop?: boolean;
  layoverAirports?: string[];
  legs?: TrackedFlightLeg[];
}

export function parseMonitoredCandidates(latestMetadata?: string | null): ConvertCandidateFlight[] {
  if (!latestMetadata) return [];
  try {
    const parsed = JSON.parse(latestMetadata);
    if (!Array.isArray(parsed)) return [];

    const byKey = new Map<string, ConvertCandidateFlight>();

    for (const rawIt of parsed as RouteItinerary[]) {
      const code = (rawIt.airline || '').trim().toUpperCase();
      const fNum = (rawIt.flightNumber || '').trim();
      const price = typeof rawIt.price === 'number' ? rawIt.price : 0;
      if (!code || price <= 0) continue;

      let validTrackedLegs: TrackedFlightLeg[] | undefined;
      if (Array.isArray(rawIt.legs) && rawIt.legs.length >= 2) {
        const normalized: TrackedFlightLeg[] = [];
        let allValid = true;
        for (const seg of rawIt.legs as RouteSegment[]) {
          const leg = normalizeSingleTrackedLeg({
            airline: seg.airline,
            flightNumber: seg.flightNumber,
            origin: seg.origin,
            destination: seg.destination,
          });
          if (!leg) {
            allValid = false;
            break;
          }
          normalized.push(leg);
        }
        if (allValid && normalized.length >= 2) {
          for (let i = 0; i < normalized.length - 1; i++) {
            if (normalized[i].destination !== normalized[i + 1].origin) {
              allValid = false;
              break;
            }
          }
        }
        if (allValid && normalized.length >= 2) {
          validTrackedLegs = normalized;
        }
      }

      const key = validTrackedLegs
        ? validTrackedLegs.map(l => `${l.airline}${l.flightNumber}`).join('+')
        : `${code}-${fNum || 'var'}`;

      const layovers = validTrackedLegs
        ? getLayoverAirports(validTrackedLegs)
        : Array.isArray(rawIt.layoverAirports) && rawIt.layoverAirports.length > 0
        ? rawIt.layoverAirports.map(c => c.trim().toUpperCase()).filter(c => c.length === 3)
        : undefined;

      const stops = validTrackedLegs
        ? validTrackedLegs.length - 1
        : typeof rawIt.stops === 'number'
        ? rawIt.stops
        : 0;

      const candidate: ConvertCandidateFlight = {
        key,
        airline: validTrackedLegs ? validTrackedLegs[0].airline : code,
        flightNumber: validTrackedLegs ? validTrackedLegs[0].flightNumber : fNum || undefined,
        price,
        departureTime: rawIt.departureTime,
        stops,
        isNonstop: stops === 0,
        layoverAirports: layovers,
        legs: validTrackedLegs,
      };

      const existing = byKey.get(key);
      if (!existing || candidate.price < existing.price) {
        byKey.set(key, candidate);
      }
    }

    return Array.from(byKey.values())
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
  } catch {
    return [];
  }
}

interface Props {
  candidates: ConvertCandidateFlight[];
  selectedCandidateKey: string | null;
  currency: string;
  onSelectCandidate: (candidate: ConvertCandidateFlight) => void;
  onSelectCustom: () => void;
}

export default function MonitoredFlightCandidates({
  candidates,
  selectedCandidateKey,
  currency,
  onSelectCandidate,
  onSelectCustom,
}: Props) {
  if (candidates.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Select Booked Flight (from Monitored Options)
        </label>
        <span className="text-[11px] text-gunmetal-muted">
          Click an option to pre-fill flight segments and price
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {candidates.map((c, idx) => {
          const isSelected = selectedCandidateKey === c.key;
          const formattedTime = cleanDisplayTime(c.departureTime);
          const layoverSuffix =
            c.layoverAirports && c.layoverAirports.length > 0
              ? ` (${c.layoverAirports.join(', ')})`
              : '';
          const stopsLabel = c.isNonstop
            ? 'Nonstop'
            : c.stops === 1
            ? `1 Stop${layoverSuffix}`
            : `${c.stops || 1} Stops${layoverSuffix}`;

          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectCandidate(c)}
              className={`min-h-[68px] p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/50 shadow-sm'
                  : 'bg-gunmetal-canvas/60 border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-canvas'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 min-w-0">
                  {c.legs && c.legs.length >= 2 ? (
                    c.legs.map((leg, legIdx) => (
                      <Fragment key={`${leg.airline}-${leg.flightNumber}-${legIdx}`}>
                        {legIdx > 0 && (
                          <ArrowRight className="w-2.5 h-2.5 text-gunmetal-muted flex-shrink-0" />
                        )}
                        <AirlineBadge
                          code={leg.airline}
                          flightNumber={leg.flightNumber}
                          size="xs"
                          align="left"
                        />
                      </Fragment>
                    ))
                  ) : (
                    <AirlineBadge
                      code={c.airline}
                      flightNumber={c.flightNumber}
                      size="xs"
                      align="left"
                    />
                  )}
                </div>
                <span className="font-black text-sm text-slate-100 font-mono flex-shrink-0">
                  {formatCurrency(c.price, currency)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-gunmetal-muted">
                <span className="truncate">{stopsLabel}</span>
                {formattedTime && (
                  <span className="font-mono text-slate-300 flex-shrink-0">{formattedTime}</span>
                )}
              </div>

              {idx === 0 && (
                <span className="absolute -top-2 -right-1 text-[9px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded shadow-sm">
                  Lowest Fare
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onSelectCustom}
          className={`min-h-[68px] p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
            selectedCandidateKey === 'custom'
              ? 'bg-slate-800/75 border-slate-400 ring-1 ring-slate-400/50 shadow-sm text-slate-100'
              : 'bg-gunmetal-canvas/40 border-dashed border-gunmetal-border text-gunmetal-muted hover:text-slate-300 hover:border-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-gunmetal-card border border-gunmetal-border">
              <Pencil className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <span className="font-bold text-xs text-slate-200">Different Flight</span>
          </div>
          <span className="text-[11px] text-gunmetal-muted">
            Enter custom carrier, flight #, and price
          </span>
        </button>
      </div>
    </div>
  );
}