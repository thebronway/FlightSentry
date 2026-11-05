'use client';

import { useMemo } from 'react';
import { PriceHistory, Flight } from '@/types';
import { computeCarrierMatrix, CarrierMatrixRow } from '@/utils/routeIntelligence';
import { formatCurrency } from '@/utils/format';
import { TrendingDown, TrendingUp, Minus, Award } from 'lucide-react';

interface Props {
  history: PriceHistory[];
  flight?: Flight | null;
}

export default function CarrierBreakdownTable({ history, flight }: Props) {
  const defaultRoute = flight?.origin && flight?.destination ? `${flight.origin} → ${flight.destination}` : undefined;
  const rows = useMemo(() => computeCarrierMatrix(history, defaultRoute), [history, defaultRoute]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Carrier Breakdown Matrix
        </h3>
        <span className="text-[11px] text-gunmetal-muted">
          Competitive route comparison across operating airlines
        </span>
      </div>

      <div className="border border-gunmetal-border rounded-lg bg-gunmetal-card/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gunmetal-border bg-gunmetal-canvas/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2.5 px-3.5">Airline</th>
                <th className="py-2.5 px-3.5">Best Flight & Schedule</th>
                <th className="py-2.5 px-3.5">Current Lowest</th>
                <th className="py-2.5 px-3.5">Historical Range</th>
                <th className="py-2.5 px-3.5 text-right">Recent Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gunmetal-border/70">
              {rows.map((row: CarrierMatrixRow) => (
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
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="font-bold text-slate-100 font-mono">
                        {row.flightIdentifier || row.airline}
                      </span>
                      {row.route && (
                        <span className="text-[11px] font-mono text-sky-400 bg-sky-950/40 border border-sky-800/40 px-1.5 py-0.5 rounded font-medium">
                          {row.route}
                        </span>
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
                        {formatCurrency(row.currentLowestPrice)}
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
                      {formatCurrency(row.allTimeLow)}
                    </span>
                    <span className="text-gunmetal-muted mx-1.5">–</span>
                    <span className="text-slate-400 font-medium">
                      {formatCurrency(row.allTimeHigh)}
                    </span>
                  </td>

                  {/* Check-to-Check Price Delta Trend Indicator */}
                  <td className="py-3 px-3.5 text-right whitespace-nowrap">
                    {row.deltaStatus === 'dropped' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded">
                        <TrendingDown className="w-3.5 h-3.5" />
                        -{formatCurrency(Math.abs(row.priceDelta))}
                      </span>
                    ) : row.deltaStatus === 'risen' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/40 border border-red-800/40 px-2 py-0.5 rounded">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{formatCurrency(row.priceDelta)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-gunmetal-canvas px-2 py-0.5 rounded border border-gunmetal-border">
                        <Minus className="w-3 h-3 text-gunmetal-muted" />
                        Steady
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}