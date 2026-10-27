'use client';

import { RouteCorridorMetrics } from '@/utils/routeIntelligence';
import { formatCurrency } from '@/utils/format';
import { ArrowDown, ArrowUp, Gauge } from 'lucide-react';

interface Props {
  metrics: RouteCorridorMetrics;
  compact?: boolean;
}

export default function RouteCorridorSummary({ metrics, compact = false }: Props) {
  const { currentFloor, allTimeLow, allTimeHigh, spreadPercent, hasSpread } = metrics;

  if (compact) {
    return (
      <div className="space-y-1.5 pt-2 border-t border-gunmetal-border/70">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gunmetal-muted flex items-center gap-1 font-medium">
            <Gauge className="w-3 h-3 text-slate-400" /> Market Corridor
          </span>
          <span className="font-bold text-slate-200">
            {formatCurrency(allTimeLow)} – {formatCurrency(allTimeHigh)}
          </span>
        </div>
        {/* Visual Spread Bar */}
        <div className="relative w-full h-2 bg-gunmetal-canvas rounded-full border border-gunmetal-border overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-rose-500 transition-all"
            style={{ width: '100%' }}
          />
          {hasSpread && (
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-white shadow-sm ring-1 ring-black/40 rounded-full transition-all"
              style={{ left: `calc(${spreadPercent}% - 3px)` }}
              title={`Current Floor: ${formatCurrency(currentFloor)} (${spreadPercent}% of corridor)`}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-4">
      {/* 3 Corridor Metrics */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2.5 rounded-md bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 block flex items-center justify-center gap-1">
            <ArrowDown className="w-3 h-3" /> All-Time Low
          </span>
          <span className="text-lg font-black text-slate-100 block mt-0.5">
            {formatCurrency(allTimeLow)}
          </span>
        </div>

        <div className="p-2.5 rounded-md bg-gunmetal-card/80 border border-slate-600/70 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3" /> Current Floor
          </span>
          <span className="text-lg font-black text-white block mt-0.5">
            {formatCurrency(currentFloor)}
          </span>
        </div>

        <div className="p-2.5 rounded-md bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block flex items-center justify-center gap-1">
            <ArrowUp className="w-3 h-3" /> All-Time High
          </span>
          <span className="text-lg font-black text-slate-100 block mt-0.5">
            {formatCurrency(allTimeHigh)}
          </span>
        </div>
      </div>

      {/* Visual Market Spread Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span>Market Spread Corridor</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gunmetal-card text-gunmetal-muted border border-gunmetal-border">
              {spreadPercent}% to ceiling
            </span>
          </span>
          <span className="text-[11px] text-gunmetal-muted font-medium">
            {currentFloor === allTimeLow
              ? 'Lowest recorded fare available today!'
              : `${formatCurrency(currentFloor - allTimeLow)} above route low`}
          </span>
        </div>

        <div className="relative w-full h-3 bg-gunmetal-canvas rounded-full border border-gunmetal-border p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 opacity-80"
            style={{ width: '100%' }}
          />
          {/* Position Marker */}
          <div
            className="absolute -top-1 w-2.5 h-5 bg-white border border-slate-900 rounded-sm shadow-md transition-all flex items-center justify-center pointer-events-none"
            style={{ left: `calc(${spreadPercent}% - 5px)` }}
          >
            <div className="w-0.5 h-2.5 bg-slate-800 rounded-full" />
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-gunmetal-muted font-mono px-0.5">
          <span>{formatCurrency(allTimeLow)}</span>
          <span>{formatCurrency(allTimeHigh)}</span>
        </div>
      </div>
    </div>
  );
}