'use client';

import { FileText } from 'lucide-react';

interface Props {
  providerName: string;
  isEnabled: boolean;
  status?: { type: 'success' | 'error'; message: string } | null;
  onToggleEnabled: (checked: boolean) => void;
  onOpenLogs: () => void;
}

export default function UnmeteredScraperCard({
  providerName,
  isEnabled,
  status,
  onToggleEnabled,
  onOpenLogs,
}: Props) {
  return (
    <div className="pt-6 border-t border-gunmetal-border/80 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-200">Unmetered Web Scraper</h3>
        <p className="text-xs text-gunmetal-muted">
          Fast-Flights operates without an API key.
        </p>
      </div>

      <div
        className={`border rounded-lg transition-all ${
          isEnabled
            ? 'bg-gunmetal-canvas/60 border-gunmetal-border shadow-sm'
            : 'bg-gunmetal-canvas/30 border-gunmetal-border/50 opacity-60'
        }`}
      >
        <div className="p-3.5 sm:p-4 border-b border-gunmetal-border/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            <label className="min-h-[44px] sm:min-h-0 flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={e => onToggleEnabled(e.target.checked)}
                className="w-4 h-4 accent-slate-500 rounded"
              />
              <span className={`font-bold text-sm ${isEnabled ? 'text-slate-100' : 'text-gunmetal-muted'}`}>
                {providerName}
              </span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-950/40 text-amber-400 border-amber-800/40">
              Unlimited Scraper
            </span>
            {!isEnabled && (
              <span className="text-[10px] uppercase font-bold text-gunmetal-muted bg-gunmetal-canvas px-1.5 py-0.5 rounded border border-gunmetal-border">
                Disabled
              </span>
            )}
            {status && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  status.type === 'success'
                    ? 'bg-green-950/60 text-green-400 border-green-800/60'
                    : 'bg-red-950/60 text-red-400 border-red-800/60'
                }`}
              >
                {status.message}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={onOpenLogs}
              title={`View recent query logs for ${providerName}`}
              className="min-h-[44px] sm:min-h-[34px] flex items-center gap-1.5 px-3 sm:px-2.5 py-2 sm:py-1 text-xs font-semibold bg-gunmetal-canvas border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border rounded-md shadow-sm transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Logs</span>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-md p-3.5 space-y-1.5 text-xs text-amber-300">
            <p className="font-semibold text-amber-200 flex items-center gap-1.5">
              Unlimited Datasource Notice & Disclaimer
            </p>
            <p>
              <strong>Priority:</strong> When enabled, this data source bypasses metered quotas and is executed first before any API-key data sources regardless of the configured Query Routing Strategy.
            </p>
            <p>
              <strong>Volatility:</strong> This scraper reverse-engineers public RPC endpoints without an API key. It is volatile and may encounter CAPTCHAs or bot blocks. Automatic jitter delays (2.0s – 4.5s) are applied to each query. Pairing with at least one official API provider is highly recommended, as it will most likely fail frequently.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}