'use client';

import { useState, useEffect, useRef } from 'react';
import { SearchMode } from '@/types';

interface DetectedRoute {
  origin: string;
  destination: string;
  airlineName?: string;
}

interface UseRouteLookupParams {
  isOpen: boolean;
  searchMode: SearchMode;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  onAutoPopulate: (origin: string, destination: string) => void;
}

export function useRouteLookup({
  isOpen,
  searchMode,
  airline,
  flightNumber,
  origin,
  destination,
  onAutoPopulate,
}: UseRouteLookupParams) {
  const [detectedRoute, setDetectedRoute] = useState<DetectedRoute | null>(null);
  const [routeLookupLoading, setRouteLookupLoading] = useState(false);
  const [routeAlert, setRouteAlert] = useState<'confirmed' | 'mismatch' | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen || searchMode !== 'FlightNumber') {
      setDetectedRoute(null);
      setRouteAlert(null);
      return;
    }

    const cleanAirline = airline.trim().toUpperCase();
    const cleanFlightNum = flightNumber.trim();

    if (cleanAirline.length < 2 || cleanFlightNum.length < 1) {
      setDetectedRoute(null);
      setRouteAlert(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setRouteLookupLoading(true);
      try {
        const res = await fetch('/api/flights/lookup-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ airline: cleanAirline, flightNumber: cleanFlightNum }),
        });

        const data = await res.json();
        if (data.success && data.origin && data.destination) {
          const detected: DetectedRoute = {
            origin: data.origin.toUpperCase(),
            destination: data.destination.toUpperCase(),
            airlineName: data.airlineName,
          };
          setDetectedRoute(detected);

          if (!origin && !destination) {
            onAutoPopulate(detected.origin, detected.destination);
            setRouteAlert('confirmed');
          } else if (
            origin.toUpperCase() !== detected.origin ||
            destination.toUpperCase() !== detected.destination
          ) {
            setRouteAlert('mismatch');
          } else {
            setRouteAlert('confirmed');
          }
        } else {
          setDetectedRoute(null);
          setRouteAlert(null);
        }
      } catch (err) {
        console.error('[useRouteLookup] Error querying route lookup:', err);
      } finally {
        setRouteLookupLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [airline, flightNumber, searchMode, isOpen]);

  useEffect(() => {
    if (searchMode === 'FlightNumber' && detectedRoute) {
      const currentOrigin = origin.trim().toUpperCase();
      const currentDest = destination.trim().toUpperCase();
      if (currentOrigin && currentDest) {
        if (currentOrigin !== detectedRoute.origin || currentDest !== detectedRoute.destination) {
          setRouteAlert('mismatch');
        } else {
          setRouteAlert('confirmed');
        }
      }
    }
  }, [origin, destination, detectedRoute, searchMode]);

  const adoptDetectedRoute = () => {
    if (detectedRoute) {
      onAutoPopulate(detectedRoute.origin, detectedRoute.destination);
      setRouteAlert('confirmed');
    }
  };

  const resetLookupState = () => {
    setDetectedRoute(null);
    setRouteAlert(null);
  };

  return {
    detectedRoute,
    routeLookupLoading,
    routeAlert,
    adoptDetectedRoute,
    resetLookupState,
  };
}