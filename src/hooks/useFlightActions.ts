'use client';

import { useState, useCallback } from 'react';
import { Flight } from '@/types';
import {
  buildFlightContextLabel,
  notifySearchFinished,
  notifySearchStarted,
} from '@/utils/searchEvents';

export const CABIN_LABEL_MAP: Record<string, string> = {
  economy: 'Economy',
  premium_economy: 'Prem Econ',
  business: 'Business',
  first: 'First Class',
};

export const CONDENSED_CABIN_LABEL_MAP: Record<string, string> = {
  economy: 'E',
  premium_economy: 'E+',
  business: 'B',
  first: 'F',
};

export function useFlightActions(onRefresh: () => void) {
  const [loadingFlightId, setLoadingFlightId] = useState<number | null>(null);

  const toggleStatus = useCallback(
    async (flight: Flight) => {
      if (flight.status === 'Past') return;
      const isBooked = (flight.purchasePrice !== null && flight.purchasePrice !== undefined && flight.purchasePrice > 0) || Boolean(flight.pnr);
      const newStatus = flight.status === 'Paused' ? (isBooked ? 'Booked' : 'Watching') : 'Paused';
      try {
        setLoadingFlightId(flight.id);
        const res = await fetch(`/api/flights/${flight.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          onRefresh();
        } else {
          console.error(`Failed to update flight status: ${res.statusText}`);
        }
      } catch (err) {
        console.error('Failed to toggle flight status:', err);
      } finally {
        setLoadingFlightId(null);
      }
    },
    [onRefresh]
  );

  const deleteFlight = useCallback(
    async (flightId: number) => {
      try {
        setLoadingFlightId(flightId);
        const res = await fetch(`/api/flights/${flightId}`, { method: 'DELETE' });
        if (res.ok) {
          onRefresh();
        } else {
          console.error(`Failed to delete flight: ${res.statusText}`);
        }
      } catch (err) {
        console.error('Failed to delete flight:', err);
      } finally {
        setLoadingFlightId(null);
      }
    },
    [onRefresh]
  );

  const checkNow = useCallback(
    async (flightOrId: number | Flight) => {
      const flightObj = typeof flightOrId === 'number' ? null : flightOrId;
      const flightId = typeof flightOrId === 'number' ? flightOrId : flightOrId.id;
      const ctx = flightObj
        ? buildFlightContextLabel(flightObj)
        : { context: `Flight #${flightId}`, route: null, flightNumber: null };

      const searchToken = notifySearchStarted({
        flightId,
        searchKind: 'fare_search',
        context: ctx.context,
        route: ctx.route,
        flightNumber: ctx.flightNumber,
      });

      let checkOk = false;
      let checkError: string | null = null;

      try {
        setLoadingFlightId(flightId);
        const res = await fetch(`/api/flights/${flightId}/check`, { method: 'POST' });
        if (res.ok) {
          checkOk = true;
          onRefresh();
        } else {
          const data = await res.json().catch(() => ({}));
          checkError = data.error || 'Check failed. Ensure API quota is not exceeded.';
          alert(checkError);
        }
      } catch (err) {
        console.error('Failed to trigger manual flight check:', err);
        checkError = 'Check request encountered an unexpected error.';
        alert(checkError);
      } finally {
        notifySearchFinished(searchToken, { ok: checkOk, errorMessage: checkError });
        setLoadingFlightId(null);
      }
    },
    [onRefresh]
  );

  return {
    toggleStatus,
    deleteFlight,
    checkNow,
    loadingFlightId,
  };
}