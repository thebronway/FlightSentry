'use client';

import { usePathname } from 'next/navigation';
import { Loader2, AlertTriangle, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useSearchProgress } from '@/hooks/useSearchProgress';

export default function SearchProgressPopup() {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const { searches, dismissSearch } = useSearchProgress(isLoginPage);

  if (isLoginPage || searches.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Live flight search progress"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-5 sm:right-5 z-50 sm:w-[26rem] max-w-full sm:max-w-md flex flex-col gap-2.5 pointer-events-none"
    >
      {searches.map((item) => {
        const isCompleted = item.status === 'completed';
        const isFailed = item.status === 'failed';
        const isInFlight = item.status === 'searching' || item.status === 'failover';
        const hasFailoverNotice =
          Boolean(item.failoverReason) &&
          (item.status === 'failover' || Boolean(item.previousProviderLabel) || isFailed);

        const borderClass = isFailed
          ? 'border-rose-700/70'
          : isCompleted
          ? 'border-emerald-700/70'
          : hasFailoverNotice
          ? 'border-amber-700/70'
          : 'border-gunmetal-border';

        const statusHeadline = isCompleted
          ? 'Search Complete'
          : isFailed
          ? 'Search Unavailable'
          : item.status === 'failover'
          ? 'Provider Failover'
          : item.searchKind === 'route_lookup'
          ? 'Detecting Route'
          : 'Searching Fares';

        return (
          <div
            key={item.id}
            className={`pointer-events-auto bg-gunmetal-card/95 backdrop-blur-md border ${borderClass} rounded-xl shadow-2xl shadow-black/80 p-4 transition-all`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5 flex-shrink-0">
                  {isInFlight ? (
                    <Loader2
                      className={`w-5 h-5 animate-spin ${
                        hasFailoverNotice ? 'text-amber-400' : 'text-sky-400'
                      }`}
                    />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider flex-shrink-0 ${
                        isFailed
                          ? 'text-rose-400'
                          : isCompleted
                          ? 'text-emerald-400'
                          : hasFailoverNotice
                          ? 'text-amber-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {statusHeadline}
                    </span>
                    {item.totalProviders > 1 && isInFlight && (
                      <span className="text-xs font-mono text-gunmetal-muted flex-shrink-0">
                        ({Math.min(item.attemptNumber, item.totalProviders)}/{item.totalProviders})
                      </span>
                    )}
                  </div>

                  <div className="text-sm font-bold text-slate-100 truncate" title={item.context}>
                    {item.context}
                  </div>

                  <div className="text-xs sm:text-sm text-gunmetal-muted truncate">
                    {isCompleted ? (
                      <span>
                        Completed via{' '}
                        <span className="text-slate-200 font-semibold">{item.providerLabel}</span>
                      </span>
                    ) : isFailed ? (
                      <span>
                        Last source:{' '}
                        <span className="text-slate-200 font-semibold">{item.providerLabel}</span>
                      </span>
                    ) : (
                      <span>
                        Querying{' '}
                        <span className="text-slate-100 font-semibold">{item.providerLabel}</span>
                        ...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => dismissSearch(item.id)}
                title="Dismiss search status"
                aria-label="Dismiss search status"
                className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] -mr-1.5 -mt-1.5 inline-flex items-center justify-center rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-canvas transition-colors flex-shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hasFailoverNotice && item.failoverReason && (
              <div
                className={`mt-2.5 p-2.5 rounded-lg border text-xs leading-snug flex items-start gap-2 ${
                  isFailed
                    ? 'bg-rose-950/45 border-rose-700/70 text-rose-200'
                    : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                }`}
              >
                <AlertTriangle
                  className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                    isFailed ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <div className="min-w-0 flex-1 break-words">
                  {item.previousProviderLabel && !isFailed && (
                    <span className="font-bold text-amber-100 block mb-0.5">
                      Switched from {item.previousProviderLabel} &rarr; {item.providerLabel}
                    </span>
                  )}
                  <span>{item.failoverReason}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}