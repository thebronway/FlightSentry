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
        Priority Rule: Any active unmetered data source will automatically be queried first before any metered datasource, regardless of Query Routing Strategy.
      </p>
    </SettingsCard>
  );
}