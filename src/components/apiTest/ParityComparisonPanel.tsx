'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Filter,
} from 'lucide-react';
import { DataSourceProvider } from '@/services/datasource';
import { DevProviderTestItemResult } from '@/services/devApiTester';
import {
  ParityField,
  ProviderParityReport,
} from '@/services/providerParity';
import AirlineBadge from '@/components/common/AirlineBadge';
import { formatCurrency } from '@/utils/format';

interface ParityComparisonPanelProps {
  parity: ProviderParityReport;
  results: DevProviderTestItemResult[];
  currency: string;
}

const FIELD_LABELS: Record<ParityField, string> = {
  carrier: 'Carrier',
  flightNumber: 'Flight #',
  price: 'Price',
  stops: 'Stops',
  departureTime: 'Departure',
  arrivalTime: 'Arrival',
};

function formatStopsLabel(stops: number): string {
  if (stops === 0) return 'Nonstop';
  return stops === 1 ? '1 stop' : `${stops} stops`;
}

export default function ParityComparisonPanel({
  parity,
  results,
  currency,
}: ParityComparisonPanelProps) {
  const [onlyMismatches, setOnlyMismatches] = useState(false);

  const providerLabels: Record<string, string> = {};
  results.forEach((r) => {
    providerLabels[r.provider] = r.label;
  });

  const activeProviders: DataSourceProvider[] =
    parity.comparedProviders.length > 0
      ? parity.comparedProviders
      : results.map((r) => r.provider);

  const displayedRows = onlyMismatches
    ? parity.rows.filter((r) => !r.isFullMatch)
    : parity.rows;

  const mismatchFieldsWithCounts = (Object.keys(FIELD_LABELS) as ParityField[]).filter(
    (field) => parity.fieldMismatchCounts[field] > 0
  );

  return (
    <div className="bg-gunmetal-card border border-gunmetal-border rounded-lg p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Parity Banner Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gunmetal-border/70 pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              4. Cross-Provider Result Parity
            </h2>

            {parity.parityStatus === 'consistent' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded border bg-emerald-950/60 text-emerald-300 border-emerald-700/70">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>All Compared Providers Consistent</span>
              </span>
            )}

            {parity.parityStatus === 'mismatch' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded border bg-amber-950/60 text-amber-300 border-amber-700/70">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Parity Discrepancies Flagged</span>
              </span>
            )}

            {parity.parityStatus === 'insufficient_data' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded border bg-gunmetal-canvas text-slate-300 border-gunmetal-border">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Need &ge;2 Successful Providers for Cross-Diff</span>
              </span>
            )}
          </div>

          <p className="text-xs text-gunmetal-muted font-mono">{parity.statusSummary}</p>
        </div>

        {/* Summary KPIs */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {parity.lowestPriceSpread.minPrice !== null && (
            <div
              className={`px-2.5 py-1.5 rounded border ${
                parity.lowestPriceSpread.differs
                  ? 'bg-amber-950/40 border-amber-700/70 text-amber-200'
                  : 'bg-gunmetal-canvas border-gunmetal-border text-slate-200'
              }`}
            >
              <span className="text-gunmetal-muted mr-1.5">Lowest Price Spread:</span>
              {parity.lowestPriceSpread.differs && parity.lowestPriceSpread.maxPrice !== null ? (
                <strong>
                  {formatCurrency(parity.lowestPriceSpread.minPrice, currency)} –{' '}
                  {formatCurrency(parity.lowestPriceSpread.maxPrice, currency)} (Δ{' '}
                  {formatCurrency(parity.lowestPriceSpread.spread || 0, currency)})
                </strong>
              ) : (
                <strong>
                  {formatCurrency(parity.lowestPriceSpread.minPrice, currency)} (Exact Match)
                </strong>
              )}
            </div>
          )}

          {parity.totalRows > 0 && (
            <div className="px-2.5 py-1.5 rounded border bg-gunmetal-canvas border-gunmetal-border text-slate-200">
              <span className="text-emerald-400 font-bold">{parity.matchedRowCount}</span> matched /{' '}
              <span className="text-amber-300 font-bold">
                {parity.totalRows - parity.matchedRowCount}
              </span>{' '}
              differ
            </div>
          )}
        </div>
      </div>

      {/* Field Mismatch Pill Breakdown */}
      {(parity.statusMismatch ||
        parity.itineraryCountDiffers ||
        mismatchFieldsWithCounts.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-md bg-amber-950/25 border border-amber-800/50 text-xs">
          <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
            Flagged Differences:
          </span>

          {parity.statusMismatch && (
            <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-700/70 font-mono text-[11px]">
              Availability Status Mismatch (Success vs SoldOut)
            </span>
          )}

          {parity.itineraryCountDiffers && (
            <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-200 border border-amber-700/70 font-mono text-[11px]">
              Itinerary Count Differs
            </span>
          )}

          {mismatchFieldsWithCounts.map((field) => (
            <span
              key={field}
              className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-200 border border-amber-700/70 font-mono text-[11px]"
            >
              {FIELD_LABELS[field]} ({parity.fieldMismatchCounts[field]}{' '}
              {parity.fieldMismatchCounts[field] === 1 ? 'row' : 'rows'})
            </span>
          ))}
        </div>
      )}

      {/* Side-by-Side Normalized Itinerary Matrix */}
      {parity.rows.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-300">
              Normalized Itinerary Comparison ({displayedRows.length} of {parity.rows.length} flights)
            </span>

            <button
              type="button"
              onClick={() => setOnlyMismatches((prev) => !prev)}
              className={`min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                onlyMismatches
                  ? 'bg-amber-950/60 text-amber-200 border-amber-700/70'
                  : 'bg-gunmetal-canvas text-slate-300 border-gunmetal-border hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{onlyMismatches ? 'Showing Mismatches Only' : 'Filter: Mismatches Only'}</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-gunmetal-border rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gunmetal-canvas border-b border-gunmetal-border text-[11px] uppercase tracking-wider text-slate-300">
                  <th className="py-2.5 px-3 font-bold">Itinerary / Parity Status</th>
                  {activeProviders.map((prov) => (
                    <th key={prov} className="py-2.5 px-3 font-bold">
                      {providerLabels[prov] || prov}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gunmetal-border/70">
                {displayedRows.map((row) => (
                  <tr
                    key={row.rowKey}
                    className={
                      row.isFullMatch
                        ? 'bg-gunmetal-card hover:bg-gunmetal-canvas/40'
                        : 'bg-amber-950/15 hover:bg-amber-950/25'
                    }
                  >
                    {/* Row Key + Mismatched Field Badges */}
                    <td className="py-3 px-3 align-top min-w-[200px]">
                      <div className="font-mono font-bold text-slate-100">{row.displayLabel}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {row.isFullMatch ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Exact Match</span>
                          </span>
                        ) : (
                          <>
                            {row.mismatchedFields.map((field) => (
                              <span
                                key={field}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-700/70"
                              >
                                {FIELD_LABELS[field]} Mismatch
                              </span>
                            ))}
                            {row.missingInProviders.length > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60">
                                Missing in{' '}
                                {row.missingInProviders
                                  .map((p) => providerLabels[p] || p)
                                  .join(', ')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Per-Provider Cell */}
                    {activeProviders.map((prov) => {
                      const item = row.byProvider[prov];
                      if (!item) {
                        return (
                          <td
                            key={prov}
                            className="py-3 px-3 align-top text-gunmetal-muted font-mono italic min-w-[190px]"
                          >
                            Not returned
                          </td>
                        );
                      }

                      const highlight = (field: ParityField) =>
                        row.mismatchedFields.includes(field)
                          ? 'text-amber-300 font-bold underline decoration-amber-500/70'
                          : 'text-slate-200';

                      return (
                        <td key={prov} className="py-3 px-3 align-top min-w-[205px] space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className={
                                row.mismatchedFields.includes('carrier') ||
                                row.mismatchedFields.includes('flightNumber')
                                  ? 'ring-1 ring-amber-500/70 rounded'
                                  : ''
                              }
                            >
                              <AirlineBadge
                                code={item.carrier}
                                flightNumber={item.flightNumber || undefined}
                                size="xs"
                                align="left"
                              />
                            </div>
                            <span className={`font-mono text-sm font-bold ${highlight('price')}`}>
                              {formatCurrency(item.price, currency)}
                            </span>
                          </div>

                          <div className="font-mono text-[11px] space-y-0.5">
                            <div>
                              <span className="text-gunmetal-muted">Stops: </span>
                              <span className={highlight('stops')}>
                                {formatStopsLabel(item.stops)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gunmetal-muted">Dep: </span>
                              <span className={highlight('departureTime')}>
                                {item.departureTime || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gunmetal-muted">Arr: </span>
                              <span className={highlight('arrivalTime')}>
                                {item.arrivalTime || '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Fallback single-provider itinerary preview when <2 providers succeeded */
        results.some((r) => r.itineraries.length > 0) && (
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-300 block">
              Normalized Itineraries Returned
            </span>
            <div className="overflow-x-auto border border-gunmetal-border rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gunmetal-canvas border-b border-gunmetal-border text-[11px] uppercase tracking-wider text-slate-300">
                    <th className="py-2 px-3 font-bold">Provider</th>
                    <th className="py-2 px-3 font-bold">Flight</th>
                    <th className="py-2 px-3 font-bold">Price</th>
                    <th className="py-2 px-3 font-bold">Stops</th>
                    <th className="py-2 px-3 font-bold">Departure</th>
                    <th className="py-2 px-3 font-bold">Arrival</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gunmetal-border/70">
                  {results.flatMap((res) =>
                    res.itineraries.slice(0, 15).map((it, idx) => (
                      <tr key={`${res.provider}-${idx}`} className="bg-gunmetal-card">
                        <td className="py-2 px-3 font-semibold text-slate-200">{res.label}</td>
                        <td className="py-2 px-3">
                          <AirlineBadge
                            code={it.airline}
                            flightNumber={it.flightNumber}
                            size="xs"
                            align="left"
                          />
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-100">
                          {formatCurrency(it.price, currency)}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">
                          {formatStopsLabel(it.stops ?? (it.isNonstop ? 0 : 0))}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">
                          {it.departureTime || '—'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-300">
                          {it.arrivalTime || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}