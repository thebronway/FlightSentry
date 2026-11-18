'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchTelemetryItem } from '@/types';
import {
  SEARCH_STARTED_EVENT,
  SEARCH_FINISHED_EVENT,
  ClientSearchStartPayload,
  ClientSearchFinishPayload,
} from '@/utils/searchEvents';

const AUTO_DISMISS_DELAY_MS = 1000;
const FAST_POLL_INTERVAL_MS = 350;
const BACKGROUND_POLL_INTERVAL_MS = 4000;

interface OptimisticSearchEntry extends ClientSearchStartPayload {
  completedAtMs: number | null;
  failedMessage: string | null;
}

type OptimisticEntryMap = Map<string, OptimisticSearchEntry>;
type CompletionTimestampMap = Map<string, number>;
type DismissedIdSet = Set<string>;

export interface LiveSearchDisplayItem {
  id: string;
  searchKind: SearchTelemetryItem['searchKind'];
  context: string;
  route: string | null;
  flightNumber: string | null;
  providerLabel: string;
  status: SearchTelemetryItem['status'];
  failoverReason: string | null;
  previousProviderLabel: string | null;
  attemptNumber: number;
  totalProviders: number;
}

export function useSearchProgress(disabled: boolean = false) {
  const [visibleSearches, setVisibleSearches] = useState<LiveSearchDisplayItem[]>([]);

  const backendSearchesRef = useRef<SearchTelemetryItem[]>([]);
  const optimisticEntriesRef = useRef<OptimisticEntryMap>(new Map());
  const dismissedIdsRef = useRef<DismissedIdSet>(new Set());
  const completionSeenAtRef = useRef<CompletionTimestampMap>(new Map());
  const isFetchingRef = useRef<boolean>(false);
  const fastPollUntilRef = useRef<number>(0);

  const recomputeVisible = useCallback(() => {
    const nowMs = Date.now();
    const backendItems = backendSearchesRef.current;
    const optimisticMap = optimisticEntriesRef.current;
    const dismissed = dismissedIdsRef.current;
    const completionSeen = completionSeenAtRef.current;

    const matchedOptimisticTokens = new Set<string>();
    const nextList: LiveSearchDisplayItem[] = [];

    for (const item of backendItems) {
      const itemStartMs = Date.parse(item.startedAt);

      // Pair any matching optimistic client placeholder with this backend telemetry record
      optimisticMap.forEach((opt, token) => {
        if (matchedOptimisticTokens.has(token)) return;
        const timeDelta = Number.isNaN(itemStartMs) ? 0 : itemStartMs - opt.startedAtMs;
        const kindMatches = item.searchKind === opt.searchKind;
        const flightMatches =
          opt.flightId && item.flightId ? opt.flightId === item.flightId : true;
        if (kindMatches && flightMatches && timeDelta >= -3000 && timeDelta <= 20000) {
          matchedOptimisticTokens.add(token);
          if (dismissed.has(token)) {
            dismissed.add(item.id);
          }
        }
      });

      if (dismissed.has(item.id)) {
        continue;
      }

      const isTerminal = item.status === 'completed' || item.status === 'failed';
      if (isTerminal) {
        let seenAt = completionSeen.get(item.id);
        if (!seenAt) {
          seenAt = nowMs;
          completionSeen.set(item.id, seenAt);
        }
        if (nowMs - seenAt >= AUTO_DISMISS_DELAY_MS) {
          dismissed.add(item.id);
          continue;
        }
      }

      nextList.push({
        id: item.id,
        searchKind: item.searchKind,
        context: item.context,
        route: item.route ?? null,
        flightNumber: item.flightNumber ?? null,
        providerLabel: item.providerLabel,
        status: item.status,
        failoverReason: item.failoverReason ?? null,
        previousProviderLabel: item.previousProviderLabel ?? null,
        attemptNumber: item.attemptNumber,
        totalProviders: item.totalProviders,
      });
    }

    // Render any optimistic client entries that haven't yet been superseded by a backend record
    const tokensToDelete: string[] = [];
    optimisticMap.forEach((opt, token) => {
      if (matchedOptimisticTokens.has(token)) {
        tokensToDelete.push(token);
        return;
      }
      if (dismissed.has(token)) {
        tokensToDelete.push(token);
        return;
      }
      if (opt.completedAtMs !== null) {
        if (nowMs - opt.completedAtMs >= AUTO_DISMISS_DELAY_MS) {
          dismissed.add(token);
          tokensToDelete.push(token);
          return;
        }
      } else if (nowMs - opt.startedAtMs > 60_000) {
        tokensToDelete.push(token);
        return;
      }

      nextList.push({
        id: token,
        searchKind: opt.searchKind,
        context: opt.context,
        route: opt.route ?? null,
        flightNumber: opt.flightNumber ?? null,
        providerLabel:
          opt.providerLabel ||
          (opt.searchKind === 'route_lookup' ? 'Aviation Route DBs' : 'Data Source Router'),
        status:
          opt.completedAtMs === null
            ? 'searching'
            : opt.failedMessage
            ? 'failed'
            : 'completed',
        failoverReason: opt.failedMessage,
        previousProviderLabel: null,
        attemptNumber: 1,
        totalProviders: 1,
      });
    });

    for (const token of tokensToDelete) {
      optimisticMap.delete(token);
    }

    setVisibleSearches(prev =>
      JSON.stringify(prev) === JSON.stringify(nextList) ? prev : nextList
    );
  }, []);

  const pollTelemetry = useCallback(async () => {
    if (disabled || isFetchingRef.current) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    isFetchingRef.current = true;
    try {
      const res = await fetch('/api/flights/search-telemetry', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const searches: SearchTelemetryItem[] = Array.isArray(data?.searches)
          ? data.searches
          : [];
        backendSearchesRef.current = searches;
        if (searches.some(s => s.status === 'searching' || s.status === 'failover')) {
          fastPollUntilRef.current = Math.max(fastPollUntilRef.current, Date.now() + 2500);
        }
        recomputeVisible();
      }
    } catch {
      // Ignore transient network errors during container reload
    } finally {
      isFetchingRef.current = false;
    }
  }, [disabled, recomputeVisible]);

  useEffect(() => {
    if (disabled) {
      setVisibleSearches([]);
      return;
    }

    const handleSearchStarted = (event: Event) => {
      const detail = (event as CustomEvent<ClientSearchStartPayload>).detail;
      if (!detail?.token) return;
      optimisticEntriesRef.current.set(detail.token, {
        ...detail,
        completedAtMs: null,
        failedMessage: null,
      });
      fastPollUntilRef.current = Date.now() + 15_000;
      recomputeVisible();
      void pollTelemetry();
    };

    const handleSearchFinished = (event: Event) => {
      const detail = (event as CustomEvent<ClientSearchFinishPayload>).detail;
      if (!detail?.token) return;
      const existing = optimisticEntriesRef.current.get(detail.token);
      if (existing) {
        existing.completedAtMs = Date.now();
        existing.failedMessage = detail.ok ? null : detail.errorMessage || null;
      }
      fastPollUntilRef.current = Math.max(fastPollUntilRef.current, Date.now() + 1500);
      void pollTelemetry();
      recomputeVisible();
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void pollTelemetry();
      }
    };

    window.addEventListener(SEARCH_STARTED_EVENT, handleSearchStarted);
    window.addEventListener(SEARCH_FINISHED_EVENT, handleSearchFinished);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    void pollTelemetry();

    let lastPollMs = Date.now();
    const tickInterval = setInterval(() => {
      const nowMs = Date.now();
      recomputeVisible();

      const hasInFlight =
        optimisticEntriesRef.current.size > 0 ||
        backendSearchesRef.current.some(s => s.status === 'searching' || s.status === 'failover') ||
        nowMs < fastPollUntilRef.current;

      const targetGap = hasInFlight ? FAST_POLL_INTERVAL_MS : BACKGROUND_POLL_INTERVAL_MS;
      if (nowMs - lastPollMs >= targetGap) {
        lastPollMs = nowMs;
        void pollTelemetry();
      }
    }, 200);

    return () => {
      window.removeEventListener(SEARCH_STARTED_EVENT, handleSearchStarted);
      window.removeEventListener(SEARCH_FINISHED_EVENT, handleSearchFinished);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      clearInterval(tickInterval);
    };
  }, [disabled, pollTelemetry, recomputeVisible]);

  const dismissSearch = useCallback(
    (id: string) => {
      dismissedIdsRef.current.add(id);
      optimisticEntriesRef.current.delete(id);
      recomputeVisible();
    },
    [recomputeVisible]
  );

  return {
    searches: visibleSearches,
    dismissSearch,
  };
}