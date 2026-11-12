'use client';

import { FileText } from 'lucide-react';

interface Props {
  onOpenLogs: () => void;
}

export default function RouteAutoDetectionCard({ onOpenLogs }: Props) {
  return (
    <div className="pt-6 border-t border-gunmetal-border/80 space-y-4">
      <div className="border border-gunmetal-border rounded-lg bg-gunmetal-canvas/60 transition-all shadow-sm">
        <div className="p-3.5 sm:p-4 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-bold text-sm text-slate-100">
              Route Auto-Detection Activity
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-950/40 text-emerald-400 border-emerald-800/40">
              Zero Quota
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={onOpenLogs}
              title="View recent query logs for Flight Route Lookup"
              className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Logs</span>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-gunmetal-muted leading-relaxed">
            When entering carrier and flight numbers on flights, FlightSentry queries zero-quota aviation databases to confirm the scheduled origin and destination.
          </p>
        </div>
      </div>
    </div>
  );
}