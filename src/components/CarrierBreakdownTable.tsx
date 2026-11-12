'use client';

import { useMemo, useState, Fragment } from 'react';
import { PriceHistory, Flight } from '@/types';
import { computeCarrierMatrix, CarrierMatrixRow } from '@/utils/routeIntelligence';
import { formatCurrency } from '@/utils/format';
import { Minus, Award, ChevronDown, ChevronsUpDown, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { resolveLocationDisplay } from '@/utils/coLocations';

interface Props {
  history: PriceHistory[];
  flight?: Flight | null;
}

type SortField = 'price' | 'airline';
type SortOrder = 'asc' | 'desc';

export default function CarrierBreakdownTable({ history, flight }: Props) {
  const defaultRoute = flight?.origin && flight?.destination ? `${flight.origin} → ${flight.destination}` : undefined;
  const rows = useMemo(() => computeCarrierMatrix(history, defaultRoute), [history, defaultRoute]);
  const [expandedAirlines, setExpandedAirlines] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>('price');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const toggleExpand = (carrierCode: string) => {
    setExpandedAirlines(prev => ({
      ...prev,
      [carrierCode]: !prev[carrierCode],
    }));
  };

  const toggleExpandAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const updated: Record<string, boolean> = {};
    rows.forEach(r => {
      updated[r.airline] = nextState;
    });
    setExpandedAirlines(updated);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (sortField === 'airline') {
      return list.sort((a, b) =>
        sortOrder === 'asc'
          ? a.airline.localeCompare(b.airline)
          : b.airline.localeCompare(a.airline)
      );
    }
    // Default / Price sorting
    return list.sort((a, b) => {
      if (sortOrder === 'asc') {
        if (a.isRouteFloor && !b.isRouteFloor) return -1;
        if (!a.isRouteFloor && b.isRouteFloor) return 1;
        return a.currentLowestPrice - b.currentLowestPrice;
      }
      return b.currentLowestPrice - a.currentLowestPrice;
    });
  }, [rows, sortField, sortOrder]);

  const hasAnyMultiDepartures = useMemo(() => {
    return rows.some(r => r.departures && r.departures.length > 1);
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Carrier Breakdown
          </h3>
          {hasAnyMultiDepartures && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="min-h-[44px] sm:min-h-0 px-2.5 sm:px-0 inline-flex items-center text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              {allExpanded ? 'Collapse All Departures' : 'Expand All Departures'}
            </button>
          )}
        </div>
        <span className="text-[11px] text-gunmetal-muted">
          Competitive route comparison across operating airlines
        </span>
      </div>

      {/* Mobile Sort Bar (< 768px) */}
      <div className="flex md:hidden items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted">Sort:</span>
        <button
          type="button"
          onClick={() => handleSort('price')}
          className={`flex-1 min-h-[44px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            sortField === 'price'
              ? 'bg-gunmetal-border border-slate-500 text-slate-100'
              : 'bg-gunmetal-canvas border-gunmetal-border text-gunmetal-muted'
          }`}
        >
          <span>Lowest Price</span>
          {sortField === 'price' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-400" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
          )}
        </button>
        <button
          type="button"
          onClick={() => handleSort('airline')}
          className={`flex-1 min-h-[44px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            sortField === 'airline'
              ? 'bg-gunmetal-border border-slate-500 text-slate-100'
              : 'bg-gunmetal-canvas border-gunmetal-border text-gunmetal-muted'
          }`}
        >
          <span>Airline</span>
          {sortField === 'airline' && (
            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sky-400" /> : <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
          )}
        </button>
      </div>

      {/* Mobile Stacked Cards (< 768px) */}
      <div className="md:hidden space-y-3">
        {sortedRows.map((row: CarrierMatrixRow) => {
          const [origRaw, destRaw] = row.route ? row.route.split('→').map(s => s.trim()) : ['', ''];
          const origDisp = origRaw ? resolveLocationDisplay(origRaw) : null;
          const destDisp = destRaw ? resolveLocationDisplay(destRaw) : null;
          const isExpanded = Boolean(expandedAirlines[row.airline]);

          return (
            <div
              key={row.airline}
              className={`border rounded-lg p-3.5 space-y-2.5 shadow-sm ${
                row.isRouteFloor
                  ? 'bg-green-950/15 border-emerald-700/60 border-l-4 border-l-emerald-500'
                  : 'bg-gunmetal-card/90 border-gunmetal-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-black/40"
                    style={{ backgroundColor: row.color }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-100">{row.airline}</span>
                      {row.isRouteFloor && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-950/70 text-green-300 border border-green-800/60 uppercase tracking-wider">
                          <Award className="w-3 h-3" /> Route Floor
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gunmetal-muted block truncate">{row.airlineName}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="font-black text-base text-slate-100 font-mono block">
                    {formatCurrency(row.currentLowestPrice, flight?.currency)}
                  </span>
                  {row.deltaStatus === 'dropped' ? (
                    <span className="text-[11px] font-bold text-green-400 font-mono">
                      ▼ {formatCurrency(Math.abs(row.priceDelta), flight?.currency)}
                    </span>
                  ) : row.deltaStatus === 'risen' ? (
                    <span className="text-[11px] font-bold text-red-400 font-mono">
                      ▲ {formatCurrency(row.priceDelta, flight?.currency)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gunmetal-muted">Steady</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gunmetal-border/60 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-100 font-mono">
                    {row.flightIdentifier || row.airline}
                  </span>
                  {origDisp && destDisp && (
                    <span className="inline-flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                        origDisp.isCluster
                          ? 'bg-sky-950/60 border border-sky-500/70 text-sky-200'
                          : 'bg-slate-900/80 border border-sky-900/50 text-slate-300'
                      }`}>
                        {origDisp.code}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-gunmetal-muted flex-shrink-0" />
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                        destDisp.isCluster
                          ? 'bg-sky-950/60 border border-sky-500/70 text-sky-200'
                          : 'bg-slate-900/80 border border-sky-900/50 text-slate-300'
                      }`}>
                        {destDisp.code}
                      </span>
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px]">
                  <span className="text-green-400 font-semibold">{formatCurrency(row.allTimeLow, flight?.currency)}</span>
                  <span className="text-gunmetal-muted mx-1">–</span>
                  <span className="text-slate-400">{formatCurrency(row.allTimeHigh, flight?.currency)}</span>
                </span>
              </div>

              {row.scheduleDetail && (
                <div className="text-[11px] text-gunmetal-muted">
                  {row.scheduleDetail}
                </div>
              )}

              {row.departures && row.departures.length > 1 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleExpand(row.airline)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-sky-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>
                      {isExpanded
                        ? `Hide ${row.departures.length - 1} Additional Departure${row.departures.length - 1 > 1 ? 's' : ''}`
                        : `View All ${row.departures.length} Departures`}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 pl-2.5 border-l-2 border-gunmetal-border">
                      {row.departures.slice(1).map((dep, dIdx) => (
                        <div
                          key={`${row.airline}-mobile-dep-${dIdx}`}
                          className="p-2.5 rounded bg-gunmetal-canvas/70 border border-gunmetal-border/60 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-semibold text-slate-200 block">{dep.flightIdentifier}</span>
                            {dep.scheduleDetail && (
                              <span className="text-[10px] text-gunmetal-muted block mt-0.5">{dep.scheduleDetail}</span>
                            )}
                          </div>
                          <div className="text-right font-mono flex-shrink-0">
                            <span className="font-bold text-slate-200 block">{formatCurrency(dep.price, flight?.currency)}</span>
                            <span className="text-[10px] text-gunmetal-muted">
                              +{formatCurrency(dep.price - row.currentLowestPrice, flight?.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet Matrix Table (≥ 768px) */}
      <div className="hidden md:block border border-gunmetal-border rounded-lg bg-gunmetal-card/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gunmetal-border bg-gunmetal-canvas/60 text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
                <th
                  onClick={() => handleSort('airline')}
                  className="py-2.5 px-3.5 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Airline</span>
                    {sortField === 'airline' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-sky-400" /> : <ArrowDown className="w-3 h-3 text-sky-400" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 text-gunmetal-muted" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3.5">Best Flight & Schedule</th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-2.5 px-3.5 cursor-pointer hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Current Lowest</span>
                    {sortField === 'price' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-sky-400" /> : <ArrowDown className="w-3 h-3 text-sky-400" />
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 text-gunmetal-muted" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3.5">Historical Range</th>
                <th className="py-2.5 px-3.5 text-right">Recent Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gunmetal-border/70">
              {sortedRows.map((row: CarrierMatrixRow) => (
                <Fragment key={row.airline}>
                  <tr
                    key={row.airline}
                    className={`hover:bg-gunmetal-canvas/60 transition-colors ${
                      row.isRouteFloor ? 'bg-green-950/15' : ''
                    }`}
                  >
                  {/* Airline Name & Color Badge */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-black/40"
                        style={{ backgroundColor: row.color }}
                      />
                      <div>
                        <span className="font-bold text-slate-100 block">
                          {row.airline}
                        </span>
                        <span className="text-[11px] text-gunmetal-muted block">
                          {row.airlineName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Best Flight & Schedule (2-Line Stack) */}
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="font-bold text-slate-100 font-mono">
                        {row.flightIdentifier || row.airline}
                      </span>
                      {row.route && (() => {
                        const [origRaw, destRaw] = row.route.split('→').map(s => s.trim());
                        const origDisp = resolveLocationDisplay(origRaw);
                        const destDisp = resolveLocationDisplay(destRaw);
                        return (
                          <span className="inline-flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-sm ${
                              origDisp.isCluster
                                ? 'bg-sky-950/60 border border-sky-500/70 text-sky-200'
                                : 'bg-slate-900/80 border border-sky-900/50 text-slate-300'
                            }`}>
                              {origDisp.code}
                            </span>
                            <ArrowRight className="w-2.5 h-2.5 text-gunmetal-muted flex-shrink-0" />
                            <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold shadow-sm ${
                              destDisp.isCluster
                                ? 'bg-sky-950/60 border border-sky-500/70 text-sky-200'
                                : 'bg-slate-900/80 border border-sky-900/50 text-slate-300'
                            }`}>
                              {destDisp.code}
                            </span>
                          </span>
                        );
                      })()}
                      {row.departures && row.departures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.airline)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gunmetal-canvas text-sky-400 hover:text-sky-300 border border-gunmetal-border hover:border-slate-500 transition-colors cursor-pointer"
                        >
                          <span>{row.departures.length} departures</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedAirlines[row.airline] ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                    {row.scheduleDetail && (
                      <div className="text-[11px] text-gunmetal-muted mt-0.5 whitespace-nowrap">
                        {row.scheduleDetail}
                      </div>
                    )}
                  </td>

                  {/* Current Lowest Price */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-100 font-mono">
                        {formatCurrency(row.currentLowestPrice, flight?.currency)}
                      </span>
                      {row.isRouteFloor && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-950/70 text-green-300 border border-green-800/60 uppercase tracking-wider">
                          <Award className="w-3 h-3" /> Route Floor
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Airline-Specific Historical Low / High */}
                  <td className="py-3 px-3.5 whitespace-nowrap font-mono text-xs">
                    <span className="text-green-400 font-semibold">
                      {formatCurrency(row.allTimeLow, flight?.currency)}
                    </span>
                    <span className="text-gunmetal-muted mx-1.5">–</span>
                    <span className="text-slate-400 font-medium">
                      {formatCurrency(row.allTimeHigh, flight?.currency)}
                    </span>
                  </td>

                  {/* Check-to-Check Price Delta Trend Indicator */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    {row.deltaStatus === 'dropped' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded">
                        ▼ {formatCurrency(Math.abs(row.priceDelta), flight?.currency)}
                      </span>
                    ) : row.deltaStatus === 'risen' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded">
                        ▲ {formatCurrency(row.priceDelta, flight?.currency)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-gunmetal-canvas px-2 py-0.5 rounded border border-gunmetal-border">
                        <Minus className="w-3 h-3 text-gunmetal-muted" />
                        Steady
                      </span>
                    )}
                  </td>
                </tr>

                {/* Expandable Secondary Departures Rows */}
                {expandedAirlines[row.airline] && row.departures && row.departures.length > 1 && (
                  row.departures.slice(1).map((dep, dIdx) => (
                    <tr
                      key={`${row.airline}-dep-${dIdx}`}
                      className="bg-gunmetal-canvas/40 border-b border-gunmetal-border/50 text-[11px]"
                    >
                      <td className="py-2 pl-9 pr-3.5 text-gunmetal-muted font-mono">
                        <span className="text-slate-500 mr-1.5">└</span>
                        Departure #{dIdx + 2}
                      </td>
                      <td className="py-2 px-3.5">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="font-semibold text-slate-200">{dep.flightIdentifier}</span>
                          {dep.route && (() => {
                            const [origRaw, destRaw] = dep.route.split('→').map(s => s.trim());
                            const origDisp = resolveLocationDisplay(origRaw);
                            const destDisp = resolveLocationDisplay(destRaw);
                            return (
                              <span className="inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-slate-900/80 border border-sky-900/50 text-slate-300">
                                  {origDisp.code}
                                </span>
                                <ArrowRight className="w-2.5 h-2.5 text-gunmetal-muted flex-shrink-0" />
                                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-slate-900/80 border border-sky-900/50 text-slate-300">
                                  {destDisp.code}
                                </span>
                              </span>
                            );
                          })()}
                        </div>
                        {dep.scheduleDetail && (
                          <div className="text-[10px] text-gunmetal-muted mt-0.5">{dep.scheduleDetail}</div>
                        )}
                      </td>
                      <td className="py-2 px-3.5 font-mono">
                        <span className="font-semibold text-slate-200">{formatCurrency(dep.price, flight?.currency)}</span>
                        <span className="text-gunmetal-muted text-[10px] ml-1.5">
                          (+{formatCurrency(dep.price - row.currentLowestPrice, flight?.currency)})
                        </span>
                      </td>
                      <td className="py-2 px-3.5 text-gunmetal-muted font-mono text-[10px]">—</td>
                      <td className="py-2 px-3.5 text-right text-gunmetal-muted font-mono text-[10px]">—</td>
                    </tr>
                  ))
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}