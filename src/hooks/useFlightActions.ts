'use client';

import { useState, useCallback } from 'react';
import { Flight } from '@/types';

export const CABIN_LABEL_MAP: Record<string, string> = {
  economy: 'Economy',
  premium_economy: 'Prem Econ',
  business: 'Business',
  first: 'First Class',
};

export const CONDENSED_CABIN_LABEL_MAP: Record<string, string> = {
  economy: 'Economy',
  premium_economy: 'Prem Econ',
  business: 'Business',
  first: 'First',
};

export function useFlightActions(onRefresh: () => void) {
  const [loadingFlightId, setLoadingFlightId] = useState<number | null>(null);

  const toggleStatus = useCallback(
    async (flight: Flight) => {
      const newStatus = flight.status === 'Active' ? 'Paused' : 'Active';
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
      if (!confirm('Are you sure you want to delete this tracked flight?')) return;
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
    async (flightId: number) => {
      try {
        setLoadingFlightId(flightId);
        const res = await fetch(`/api/flights/${flightId}/check`, { method: 'POST' });
        if (res.ok) {
          onRefresh();
        } else {
          alert('Check failed. Ensure API quota is not exceeded.');
        }
      } catch (err) {
        console.error('Failed to trigger manual flight check:', err);
        alert('Check request encountered an unexpected error.');
      } finally {
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