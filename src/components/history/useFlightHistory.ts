'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Flight, PriceHistory } from '@/types';
import { DayGroup } from './types';

export function useFlightHistory(flight: Flight | null) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback((flightId: number, silent = false) => {
    if (!silent) setLoading(true);
    fetch(`/api/history/${flightId}`)
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Failed to load history:', err);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (flight?.id) {
      loadHistory(flight.id, false);

      const handleVisibilityOrFocus = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadHistory(flight.id, true);
        }
      };

      window.addEventListener('focus', handleVisibilityOrFocus);
      document.addEventListener('visibilitychange', handleVisibilityOrFocus);

      // Silent background polling every 30s while modal is open
      const pollInterval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadHistory(flight.id, true);
        }
      }, 30000);

      return () => {
        window.removeEventListener('focus', handleVisibilityOrFocus);
        document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
        clearInterval(pollInterval);
      };
    } else {
      setHistory([]);
    }
  }, [flight?.id, loadHistory]);

  // Silently reload history points whenever the parent flight price updates
  useEffect(() => {
    if (flight?.id) {
      loadHistory(flight.id, true);
    }
  }, [flight?.currentPrice, flight?.updatedAt, flight?.id, loadHistory]);

  const dayGroups: DayGroup[] = useMemo(() => {
    const groups: Record<string, PriceHistory[]> = {};

    history.forEach(item => {
      const dateKey = new Date(item.checkedAt).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });

    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(dateKey => {
        const records = groups[dateKey].sort(
          (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime()
        );
        const prices = records.map(r => r.price).filter(p => typeof p === 'number' && p > 0);

        const dayHigh = prices.length > 0 ? Math.max(...prices) : 0;
        const dayLow = prices.length > 0 ? Math.min(...prices) : 0;

        const chrono = [...records].sort(
          (a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
        );
        const firstPrice = chrono[0]?.price || 0;
        const lastPrice = chrono[chrono.length - 1]?.price || 0;
        const intradayDelta = lastPrice - firstPrice;

        const displayDate = new Date(`${dateKey}T12:00:00Z`).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return {
          dateKey,
          displayDate,
          records,
          dayHigh,
          dayLow,
          firstPrice,
          lastPrice,
          intradayDelta,
          hasMultipleChecks: records.length > 1,
        };
      });
  }, [history]);

  return {
    history,
    loading,
    dayGroups,
    loadHistory,
  };
}