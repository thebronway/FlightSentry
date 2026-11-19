'use client';

import SettingsCard from '../shared/SettingsCard';
import SettingsSelect from '../shared/SettingsSelect';

interface Props {
  fallbackStrategyMode: string;
  status?: { type: 'success' | 'error'; message: string } | null;
  onSelectStrategy: (newMode: string) => Promise<void>;
}

export default function QueryRoutingStrategyCard({
  fallbackStrategyMode,
  status,
  onSelectStrategy,
}: Props) {
  return (
    <SettingsCard className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-sm font-semibold text-slate-200">Query Routing Strategy</label>
        {status && (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
              status.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
            }`}
          >
            {status.message}
          </span>
        )}
      </div>
      <SettingsSelect
        value={fallbackStrategyMode}
        onChange={e => onSelectStrategy(e.target.value)}
      >
        <option value="sequential-query">Round-Robin (Atomic Rotation)</option>
        <option value="balanced-usage">Balanced Usage (% Quota Consumed)</option>
        <option value="exhaust-quota">Exhaust Quota (Priority Failover)</option>
      </SettingsSelect>
      <div className="space-y-1 text-xs text-gunmetal-muted pt-1">
        <p>
          <strong className="text-slate-300">Round-Robin:</strong> Evenly alternates checks across active data sources to balance quota consumption using an atomic database pointer.
        </p>
        <p>
          <strong className="text-slate-300">Balanced Usage:</strong> Dynamically directs queries to the active provider with the lowest percentage of monthly quota consumed.
        </p>
        <p>
          <strong className="text-slate-300">Exhaust Quota:</strong> Exclusively queries the top-priority active provider until its monthly allowance is exhausted, then falls back to the next provider.
        </p>
      </div>
      <p className="text-[11px] text-amber-400 font-medium pt-1">
        Priority Rule: When &ldquo;Always run scraper first&rdquo; is enabled on OpenFareScraper, it is queried before metered APIs; otherwise all active providers follow their rank order and Query Routing Strategy.
      </p>
    </SettingsCard>
  );
}