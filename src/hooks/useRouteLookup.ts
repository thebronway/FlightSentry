'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SearchMode } from '@/types';
import { matchesAirportOrMetro } from '@/utils/coLocations';
import type { DetectedRouteCandidate } from '@/services/flightLookup';

export type { DetectedRouteCandidate };
export type RouteAlertState = 'confirmed' | 'mismatch' | 'multiple' | null;

interface UseRouteLookupParams {
  isOpen: boolean;
  searchMode: SearchMode;
  airline: string;
  flightNumber: string;
  departureDate?: string;
  origin: string;
  destination: string;
  onAutoPopulate: (origin: string, destination: string) => void;
}

export function useRouteLookup({
  isOpen,
  searchMode,
  airline,
  flightNumber,
  departureDate,
  origin,
  destination,
  onAutoPopulate,
}: UseRouteLookupParams) {
  const [detectedRoutes, setDetectedRoutes] = useState<DetectedRouteCandidate[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [routeLookupLoading, setRouteLookupLoading] = useState(false);
  const [routeAlert, setRouteAlert] = useState<RouteAlertState>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueriedKeyRef = useRef<string>('');
  const lastAutoPopulatedRef = useRef<{ origin: string; destination: string } | null>(null);

  const latestOriginRef = useRef(origin);
  const latestDestinationRef = useRef(destination);
  const onAutoPopulateRef = useRef(onAutoPopulate);

  latestOriginRef.current = origin;
  latestDestinationRef.current = destination;
  onAutoPopulateRef.current = onAutoPopulate;

  const detectedRoute = detectedRoutes[selectedRouteIndex] ?? detectedRoutes[0] ?? null;

  const clearPendingTimers = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const performLookup = useCallback(
    async (cleanAirline: string, cleanFlightNum: string, cleanDate: string, force: boolean) => {
      const queryKey = `${cleanAirline}:${cleanFlightNum}:${cleanDate}`;
      if (!force && lastQueriedKeyRef.current === queryKey) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastQueriedKeyRef.current = queryKey;

      setRouteLookupLoading(true);
      try {
        const res = await fetch('/api/flights/lookup-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            airline: cleanAirline,
            flightNumber: cleanFlightNum,
            departureDate: cleanDate || undefined,
          }),
        });

        const data = await res.json();
        if (controller.signal.aborted) return;

        const rawRoutes: DetectedRouteCandidate[] =
          Array.isArray(data.routes) && data.routes.length > 0
            ? data.routes
            : data.success && data.origin && data.destination
            ? [
                {
                  origin: String(data.origin).toUpperCase(),
                  destination: String(data.destination).toUpperCase(),
                  airlineName: data.airlineName,
                  source: data.source,
                },
              ]
            : [];

        const normalizedRoutes: DetectedRouteCandidate[] = [];
        for (const r of rawRoutes) {
          const orig = (r.origin || '').trim().toUpperCase();
          const dest = (r.destination || '').trim().toUpperCase();
          if (
            orig.length === 3 &&
            dest.length === 3 &&
            !normalizedRoutes.some(existing => existing.origin === orig && existing.destination === dest)
          ) {
            normalizedRoutes.push({
              origin: orig,
              destination: dest,
              airlineName: r.airlineName,
              source: r.source,
            });
          }
        }

        if (normalizedRoutes.length === 0) {
          setDetectedRoutes([]);
          setSelectedRouteIndex(0);
          setRouteAlert(null);
          return;
        }

        setDetectedRoutes(normalizedRoutes);

        const currOrig = latestOriginRef.current.trim().toUpperCase();
        const currDest = latestDestinationRef.current.trim().toUpperCase();
        const prevAuto = lastAutoPopulatedRef.current;
        const isUneditedOrEmpty =
          (!currOrig && !currDest) ||
          Boolean(prevAuto && currOrig === prevAuto.origin && currDest === prevAuto.destination);

        if (normalizedRoutes.length === 1) {
          const single = normalizedRoutes[0];
          setSelectedRouteIndex(0);

          if (isUneditedOrEmpty) {
            lastAutoPopulatedRef.current = { origin: single.origin, destination: single.destination };
            onAutoPopulateRef.current(single.origin, single.destination);
            setRouteAlert('confirmed');
          } else if (
            !matchesAirportOrMetro(currOrig, single.origin) ||
            !matchesAirportOrMetro(currDest, single.destination)
          ) {
            setRouteAlert('mismatch');
          } else {
            setRouteAlert('confirmed');
          }
        } else {
          // Multiple routes share this flight number: never auto-fill a guess
          if (!isUneditedOrEmpty && currOrig && currDest) {
            const matchedIdx = normalizedRoutes.findIndex(
              r => matchesAirportOrMetro(currOrig, r.origin) && matchesAirportOrMetro(currDest, r.destination)
            );
            if (matchedIdx !== -1) {
              setSelectedRouteIndex(matchedIdx);
              setRouteAlert('confirmed');
            } else {
              setSelectedRouteIndex(0);
              setRouteAlert('mismatch');
            }
          } else {
            if (prevAuto && currOrig === prevAuto.origin && currDest === prevAuto.destination) {
              lastAutoPopulatedRef.current = null;
              onAutoPopulateRef.current('', '');
            }
            setSelectedRouteIndex(0);
            setRouteAlert('multiple');
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('[useRouteLookup] Error querying route lookup:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setRouteLookupLoading(false);
        }
      }
    },
    []
  );

  // Hybrid idle debounce while typing:
  // Require >= 2 digits before auto-checking while typing (1,200ms for 2-3 digits; 600ms once 4+ digits reached)
  useEffect(() => {
    clearPendingTimers();

    if (!isOpen || searchMode !== 'FlightNumber') {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setDetectedRoutes([]);
      setSelectedRouteIndex(0);
      setRouteAlert(null);
      setRouteLookupLoading(false);
      lastQueriedKeyRef.current = '';
      lastAutoPopulatedRef.current = null;
      return;
    }

    const cleanAirline = airline.trim().toUpperCase();
    const cleanFlightNum = flightNumber.trim().replace(/\D/g, '');
    const cleanDate = departureDate?.trim() || '';

    if (cleanAirline.length < 2 || cleanFlightNum.length < 1) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setDetectedRoutes([]);
      setSelectedRouteIndex(0);
      setRouteAlert(null);
      setRouteLookupLoading(false);
      lastQueriedKeyRef.current = '';
      return;
    }

    if (cleanFlightNum.length < 2) {
      return;
    }

    const delayMs = cleanFlightNum.length >= 4 ? 600 : 1200;
    debounceTimerRef.current = setTimeout(() => {
      void performLookup(cleanAirline, cleanFlightNum, cleanDate, false);
    }, delayMs);

    return () => {
      clearPendingTimers();
    };
  }, [airline, flightNumber, departureDate, searchMode, isOpen, clearPendingTimers, performLookup]);

  // Immediate trigger when focus leaves Carrier Code or Flight Number input (supports 1-digit flight numbers too)
  const triggerBlurLookup = useCallback(() => {
    clearPendingTimers();
    if (!isOpen || searchMode !== 'FlightNumber') return;

    const cleanAirline = airline.trim().toUpperCase();
    const cleanFlightNum = flightNumber.trim().replace(/\D/g, '');
    const cleanDate = departureDate?.trim() || '';

    if (cleanAirline.length < 2 || cleanFlightNum.length < 1) return;
    void performLookup(cleanAirline, cleanFlightNum, cleanDate, false);
  }, [isOpen, searchMode, airline, flightNumber, departureDate, clearPendingTimers, performLookup]);

  // On-demand manual lookup trigger (e.g. inline Lookup button or Enter key in Flight Number field)
  const triggerManualLookup = useCallback(() => {
    clearPendingTimers();
    if (!isOpen || searchMode !== 'FlightNumber') return;

    const cleanAirline = airline.trim().toUpperCase();
    const cleanFlightNum = flightNumber.trim().replace(/\D/g, '');
    const cleanDate = departureDate?.trim() || '';

    if (cleanAirline.length < 2 || cleanFlightNum.length < 1) return;
    lastQueriedKeyRef.current = '';
    void performLookup(cleanAirline, cleanFlightNum, cleanDate, true);
  }, [isOpen, searchMode, airline, flightNumber, departureDate, clearPendingTimers, performLookup]);

  // Keep confirmation / mismatch / multi-route alert synchronized if Origin or Destination changes
  useEffect(() => {
    if (searchMode !== 'FlightNumber' || detectedRoutes.length === 0) return;

    const currentOrigin = origin.trim().toUpperCase();
    const currentDest = destination.trim().toUpperCase();

    if (currentOrigin && currentDest) {
      const matchedIdx = detectedRoutes.findIndex(
        r => matchesAirportOrMetro(currentOrigin, r.origin) && matchesAirportOrMetro(currentDest, r.destination)
      );
      if (matchedIdx !== -1) {
        if (matchedIdx !== selectedRouteIndex) {
          setSelectedRouteIndex(matchedIdx);
        }
        setRouteAlert('confirmed');
      } else {
        setRouteAlert('mismatch');
      }
    } else if (!currentOrigin && !currentDest && detectedRoutes.length > 1) {
      setRouteAlert('multiple');
    }
  }, [origin, destination, detectedRoutes, selectedRouteIndex, searchMode]);

  const selectRouteCandidate = useCallback(
    (index: number) => {
      const candidate = detectedRoutes[index];
      if (!candidate) return;
      setSelectedRouteIndex(index);
      lastAutoPopulatedRef.current = { origin: candidate.origin, destination: candidate.destination };
      onAutoPopulateRef.current(candidate.origin, candidate.destination);
      setRouteAlert('confirmed');
    },
    [detectedRoutes]
  );

  const adoptDetectedRoute = useCallback(
    (index?: number) => {
      const targetIndex = index !== undefined ? index : selectedRouteIndex;
      const target = detectedRoutes[targetIndex] ?? detectedRoutes[0];
      if (target) {
        setSelectedRouteIndex(targetIndex);
        lastAutoPopulatedRef.current = { origin: target.origin, destination: target.destination };
        onAutoPopulateRef.current(target.origin, target.destination);
        setRouteAlert('confirmed');
      }
    },
    [detectedRoutes, selectedRouteIndex]
  );

  const resetLookupState = useCallback(() => {
    clearPendingTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setDetectedRoutes([]);
    setSelectedRouteIndex(0);
    setRouteAlert(null);
    setRouteLookupLoading(false);
    lastQueriedKeyRef.current = '';
    lastAutoPopulatedRef.current = null;
  }, [clearPendingTimers]);

  return {
    detectedRoute,
    detectedRoutes,
    selectedRouteIndex,
    routeLookupLoading,
    routeAlert,
    selectRouteCandidate,
    adoptDetectedRoute,
    triggerBlurLookup,
    triggerManualLookup,
    resetLookupState,
  };
}