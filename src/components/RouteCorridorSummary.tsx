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

  // Resolve human-readable deal label
  const dealBadge = !hasSpread
    ? 'Single Check Recorded'
    : spreadPercent === 0
    ? 'Route Floor (All-Time Low)'
    : spreadPercent === 100
    ? 'Route Ceiling (All-Time High)'
    : spreadPercent < 35
    ? `Great Deal (${spreadPercent}% of range)`
    : spreadPercent <= 65
    ? `Typical Range (${spreadPercent}% of range)`
    : `Above Average (${spreadPercent}% of range)`;

  // Normalized clamped position for indicator pin so it never clips edges
  const pinPositionPercent = hasSpread ? Math.min(97, Math.max(3, spreadPercent)) : 50;

  if (compact) {
    return (
      <div className="space-y-2 pt-2.5 pb-2 border-t border-gunmetal-border/70">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-gunmetal-muted flex items-center gap-1 font-medium">
            <Gauge className="w-3 h-3 text-slate-400" /> Market Corridor
          </span>
          <span className="font-bold text-slate-200">
            {hasSpread
              ? `${formatCurrency(allTimeLow)} – ${formatCurrency(allTimeHigh)}`
              : `${formatCurrency(currentFloor)} (1 Check)`}
          </span>
        </div>

        {/* Visual Spread Bar on Card */}
        <div className="relative w-full h-2 rounded-full border border-gunmetal-border/80 p-0">
          <div
            className={`w-full h-full rounded-full ${
              hasSpread
                ? 'bg-gradient-to-r from-emerald-500/80 via-amber-400/70 to-rose-500/80'
                : 'bg-slate-700/60'
            }`}
          />
          {/* Circular White Indicator Pip */}
          <div
            className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md ring-2 ring-gunmetal-card border border-slate-300 flex items-center justify-center transition-all pointer-events-none"
            style={{
              left: `${pinPositionPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title={hasSpread ? `Current: ${formatCurrency(currentFloor)} (${spreadPercent}%)` : `Recorded: ${formatCurrency(currentFloor)}`}
          >
            <div className="w-1 h-1 rounded-full bg-slate-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-lg p-4 space-y-4">
      {/* 3 Corridor Stat Cards */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2.5 rounded-md bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 flex items-center justify-center gap-1">
            <ArrowDown className="w-3 h-3" /> All-Time Low
          </span>
          <span className="text-lg font-black text-slate-100 block mt-0.5">
            {formatCurrency(allTimeLow)}
          </span>
        </div>

        <div className="p-2.5 rounded-md bg-gunmetal-card/80 border border-slate-600/70 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-center gap-1">
            <Gauge className="w-3 h-3" /> Current Floor
          </span>
          <span className="text-lg font-black text-white block mt-0.5">
            {formatCurrency(currentFloor)}
          </span>
        </div>

        <div className="p-2.5 rounded-md bg-gunmetal-card/80 border border-gunmetal-border">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center justify-center gap-1">
            <ArrowUp className="w-3 h-3" /> All-Time High
          </span>
          <span className="text-lg font-black text-slate-100 block mt-0.5">
            {formatCurrency(allTimeHigh)}
          </span>
        </div>
      </div>

      {/* Visual Market Spread Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Market Spread Corridor</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                !hasSpread
                  ? 'bg-gunmetal-card text-gunmetal-muted border-gunmetal-border'
                  : spreadPercent === 0
                  ? 'bg-green-950/60 text-green-400 border-green-800/60'
                  : spreadPercent < 35
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50'
                  : spreadPercent <= 65
                  ? 'bg-amber-950/50 text-amber-300 border-amber-800/50'
                  : 'bg-rose-950/50 text-rose-300 border-rose-800/50'
              }`}
            >
              {dealBadge}
            </span>
          </div>
          <span className="text-[11px] text-gunmetal-muted font-medium">
            {!hasSpread
              ? 'Monitoring route to plot market spread'
              : currentFloor === allTimeLow
              ? 'Lowest recorded fare available today!'
              : `${formatCurrency(currentFloor - allTimeLow)} above route low`}
          </span>
        </div>

        {/* The Track with Gradient */}
        <div className="relative w-full h-3 rounded-full border border-slate-700/60 shadow-inner">
          <div
            className={`w-full h-full rounded-full ${
              hasSpread
                ? 'bg-gradient-to-r from-emerald-500/80 via-amber-400/70 to-rose-500/80'
                : 'bg-slate-800/80'
            }`}
          />
          {/* Circular White Indicator Pip */}
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.8)] ring-2 ring-gunmetal-card border border-slate-300 flex items-center justify-center transition-all pointer-events-none"
            style={{
              left: `${pinPositionPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
            title={hasSpread ? `Current: ${formatCurrency(currentFloor)} (${spreadPercent}%)` : `Recorded: ${formatCurrency(currentFloor)}`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-gunmetal-muted font-mono px-0.5">
          <span className="text-green-400 font-semibold">{formatCurrency(allTimeLow)} (Low)</span>
          {hasSpread && (
            <span className="text-slate-300 font-semibold">Current: {formatCurrency(currentFloor)}</span>
          )}
          <span>{formatCurrency(allTimeHigh)} (High)</span>
        </div>
      </div>
    </div>
  );
}