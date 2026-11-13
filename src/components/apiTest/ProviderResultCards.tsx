'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Plane,
  KeyRound,
  ShieldCheck,
  Ban,
} from 'lucide-react';
import { CheckResultStatus } from '@/types';
import { DevProviderTestItemResult } from '@/services/devApiTester';
import AirlineBadge from '@/components/common/AirlineBadge';
import { formatCurrency } from '@/utils/format';

interface ProviderResultCardsProps {
  results: DevProviderTestItemResult[];
  currency: string;
}

const STATUS_BADGE_MAP: Record<
  CheckResultStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  Success: {
    label: 'Success',
    className: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/70',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  },
  SoldOut: {
    label: '0 Flights / SoldOut',
    className: 'bg-amber-950/60 text-amber-300 border-amber-700/70',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  },
  RateLimited: {
    label: 'Rate Limited (429)',
    className: 'bg-orange-950/60 text-orange-300 border-orange-700/70',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
  },
  Paused: {
    label: 'Paused (503)',
    className: 'bg-slate-800 text-slate-300 border-slate-600',
    icon: <Ban className="w-3.5 h-3.5 text-slate-400" />,
  },
  Error: {
    label: 'Error',
    className: 'bg-red-950/60 text-red-300 border-red-700/70',
    icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  },
};

function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s (${ms}ms)`;
  }
  return `${ms}ms`;
}

export default function ProviderResultCards({
  results,
  currency,
}: ProviderResultCardsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
          3. Provider Execution Telemetry
        </h2>
        <span className="text-xs font-mono text-gunmetal-muted">
          {results.length} {results.length === 1 ? 'provider' : 'providers'} queried in parallel
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {results.map((item) => {
          const statusMeta = STATUS_BADGE_MAP[item.status] || STATUS_BADGE_MAP.Error;

          return (
            <div
              key={item.provider}
              className="bg-gunmetal-card border border-gunmetal-border rounded-lg p-4 flex flex-col justify-between space-y-3.5 shadow-sm"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{item.label}</h3>
                    <span className="text-[11px] font-mono text-gunmetal-muted">
                      {item.provider}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${statusMeta.className}`}
                  >
                    {statusMeta.icon}
                    <span>{statusMeta.label}</span>
                  </span>
                </div>

                {/* Primary Metric: Lowest Price & Leading Carrier */}
                <div className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border/90 flex items-center justify-between gap-2">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-gunmetal-muted font-semibold">
                      Lowest Fare
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-100">
                      {item.lowestPrice !== null
                        ? formatCurrency(item.lowestPrice, currency)
                        : '—'}
                    </span>
                  </div>

                  {item.leadingAirline && (
                    <AirlineBadge
                      code={item.leadingAirline}
                      flightNumber={item.leadingFlightNumber}
                      size="sm"
                      align="right"
                    />
                  )}
                </div>

                {/* Latency & Parsed Flight Count */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-gunmetal-canvas/70 border border-gunmetal-border/70">
                    <span className="flex items-center gap-1 text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted mb-0.5">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>Latency</span>
                    </span>
                    <span className="font-semibold text-slate-200">
                      {formatLatency(item.durationMs)}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-gunmetal-canvas/70 border border-gunmetal-border/70">
                    <span className="flex items-center gap-1 text-[10px] font-sans uppercase tracking-wider text-gunmetal-muted mb-0.5">
                      <Plane className="w-3 h-3 text-emerald-400" />
                      <span>Parsed Flights</span>
                    </span>
                    <span className="font-semibold text-slate-200">
                      {item.parsedFlightCount}
                    </span>
                  </div>
                </div>

                {/* Error or Diagnostic Details */}
                {item.errorMessage && (
                  <div className="p-2.5 rounded-md bg-red-950/30 border border-red-800/60 text-xs text-red-200 break-words leading-relaxed">
                    {item.errorMessage}
                  </div>
                )}
              </div>

              {/* Credential & Quota Footer */}
              <div className="pt-2.5 border-t border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono">
                {item.credentialSource === 'temporary' ? (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <KeyRound className="w-3 h-3" />
                    <span>Temp Key</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Saved Key</span>
                  </span>
                )}

                <span
                  className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                    item.quotaIncremented
                      ? 'bg-sky-950/50 text-sky-300 border-sky-800/60'
                      : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border'
                  }`}
                >
                  {item.quotaIncremented ? '+1 Quota Counted' : 'Quota Unchanged'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}