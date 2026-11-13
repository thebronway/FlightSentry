'use client';

import { PauseCircle, PlayCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { QuotaSourceItem, summarizeQuotaCategory } from './types';
import QuotaCategorySummaryPill from './QuotaCategorySummaryPill';

interface QuotaRibbonHeaderProps {
  isCollapsed: boolean;
  hasSources: boolean;
  isAllPaused: boolean;
  meteredSources: QuotaSourceItem[];
  selfHostedSources: QuotaSourceItem[];
  onToggleGlobalPause: () => void;
  onToggleCollapse: () => void;
}

export default function QuotaRibbonHeader({
  isCollapsed,
  hasSources,
  isAllPaused,
  meteredSources,
  selfHostedSources,
  onToggleGlobalPause,
  onToggleCollapse,
}: QuotaRibbonHeaderProps) {
  const meteredSummary = summarizeQuotaCategory(meteredSources, isAllPaused);
  const selfHostedSummary = summarizeQuotaCategory(selfHostedSources, isAllPaused);

  return (
    <div
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
        !isCollapsed && hasSources ? 'border-b border-gunmetal-border pb-3.5 mb-4' : ''
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <h3 className="text-sm font-bold text-slate-200">
          Active Data Sources &amp; Quotas
        </h3>
        {isCollapsed && hasSources && (
          <div className="flex flex-wrap items-center gap-2">
            <QuotaCategorySummaryPill
              label="Metered"
              kind="metered"
              summary={meteredSummary}
              isGloballyPaused={isAllPaused}
            />
            <QuotaCategorySummaryPill
              label="Self-Hosted"
              kind="self-hosted"
              summary={selfHostedSummary}
              isGloballyPaused={isAllPaused}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onToggleGlobalPause}
          className={`flex-1 sm:flex-initial min-h-[44px] min-w-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors shadow-sm cursor-pointer ${
            isAllPaused
              ? 'bg-amber-950/50 border border-amber-500 text-amber-300 hover:bg-amber-900/60'
              : 'bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700'
          }`}
        >
          {isAllPaused ? (
            <PlayCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <PauseCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate">
            {isAllPaused ? 'Resume All Data Sources' : 'Pause All Data Sources'}
          </span>
        </button>

        {hasSources && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Expand ribbon' : 'Collapse ribbon'}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-gunmetal-card border border-gunmetal-border text-gunmetal-muted hover:text-slate-200 hover:border-slate-500 transition-colors shadow-sm flex-shrink-0 cursor-pointer"
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronUp className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        )}
      </div>
    </div>
  );
}