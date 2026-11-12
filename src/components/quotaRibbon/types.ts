export type QuotaPauseKey =
  | 'serpApiPaused'
  | 'searchApiPaused'
  | 'hasdataPaused'
  | 'fastFlightsPaused';

export type QuotaThresholdLevel = 'normal' | 'warning' | 'critical';

export interface QuotaSourceItem {
  key: string;
  name: string;
  enabled: number;
  paused: number;
  pauseKey: QuotaPauseKey;
  used: number;
  quota: number;
  resetDate: string | null;
  isScraper: boolean;
}

export interface QuotaCategorySummary {
  sources: QuotaSourceItem[];
  activeSources: QuotaSourceItem[];
  pausedSources: QuotaSourceItem[];
  activeUsed: number;
  activeQuota: number;
  allPaused: boolean;
  hasPartialPause: boolean;
}

export function getQuotaThresholdLevel(used: number, quota: number): QuotaThresholdLevel {
  if (quota <= 0) return 'normal';
  const percent = (used / quota) * 100;
  if (percent >= 95) return 'critical';
  if (percent >= 75) return 'warning';
  return 'normal';
}

export function summarizeQuotaCategory(
  sources: QuotaSourceItem[],
  isGloballyPaused: boolean
): QuotaCategorySummary {
  const isSourcePaused = (s: QuotaSourceItem) => isGloballyPaused || s.paused === 1;
  const activeSources = sources.filter(s => !isSourcePaused(s));
  const pausedSources = sources.filter(s => isSourcePaused(s));
  const activeUsed = activeSources.reduce((sum, s) => sum + s.used, 0);
  const activeQuota = activeSources.reduce((sum, s) => sum + s.quota, 0);
  const allPaused = sources.length > 0 && activeSources.length === 0;
  const hasPartialPause = activeSources.length > 0 && pausedSources.length > 0;

  return {
    sources,
    activeSources,
    pausedSources,
    activeUsed,
    activeQuota,
    allPaused,
    hasPartialPause,
  };
}