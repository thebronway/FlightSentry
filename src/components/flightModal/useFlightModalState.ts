'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FareTier,
  CabinClass,
  SearchMode,
  PriceTrackingDirection,
  Flight,
  Settings,
} from '@/types';
import { useRouteLookup } from '@/hooks/useRouteLookup';
import { getDataSourceStatus } from '@/utils/airline';
import { getTodayDateString } from '@/utils/date';

export type TrackingOption = 'route_watch' | 'flight_watch' | 'flight_booked';
export type PaymentType = 'cash' | 'points';

export interface FlightFormState {
  trackingType: TrackingOption;
  paymentType: PaymentType;
  isManual: boolean;
  showRouteDetails: boolean;
  origin: string;
  destination: string;
  departureDate: string;
  bookingDate: string;
  airline: string;
  flightNumber: string;
  includedAirlines: string;
  excludedAirlines: string;
  pnr: string;
  fareTier: FareTier;
  cabinClass: CabinClass;
  baselinePrice: string;
  purchasePrice: string;
  currency: string;
  minDropDollar: string;
  minDropPercent: string;
  notes: string;
  overrideFarOut: string;
  overrideStandard: string;
  overrideFinalStretch: string;
  pauseTracking: boolean;
  disableNotifications: boolean;
  earliestDeparture: string;
  latestDeparture: string;
  noRedeye: boolean;
  maxStops: number | null;
  priceTrackingDirection: PriceTrackingDirection;
  minIncreaseDollar: string;
  minIncreasePercent: string;
  monitorRouteAlternatives: boolean;
  maxLayoverMinutes: number | null;
  excludedConnectingAirports: string;
  maxTotalDurationMinutes: number | null;
  includedAlliances: string;
  excludedAlliances: string;
}

const DEFAULT_FORM_STATE: FlightFormState = {
  trackingType: 'route_watch',
  paymentType: 'cash',
  isManual: false,
  showRouteDetails: false,
  origin: '',
  destination: '',
  departureDate: '',
  bookingDate: '',
  airline: '',
  flightNumber: '',
  includedAirlines: '',
  excludedAirlines: '',
  pnr: '',
  fareTier: 'Standard',
  cabinClass: 'economy',
  baselinePrice: '',
  purchasePrice: '',
  currency: '',
  minDropDollar: '',
  minDropPercent: '',
  notes: '',
  overrideFarOut: '',
  overrideStandard: '',
  overrideFinalStretch: '',
  pauseTracking: false,
  disableNotifications: false,
  earliestDeparture: '',
  latestDeparture: '',
  noRedeye: false,
  maxStops: null,
  priceTrackingDirection: 'drop',
  minIncreaseDollar: '',
  minIncreasePercent: '',
  monitorRouteAlternatives: false,
  maxLayoverMinutes: null,
  excludedConnectingAirports: '',
  maxTotalDurationMinutes: null,
  includedAlliances: '',
  excludedAlliances: '',
};

interface UseFlightModalStateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFlight?: Flight | null;
  settings?: Settings | null;
}

export function useFlightModalState({
  isOpen,
  onClose,
  onSuccess,
  initialFlight,
  settings,
}: UseFlightModalStateProps) {
  const [formData, setFormData] = useState<FlightFormState>(DEFAULT_FORM_STATE);
  const [defaultSettings, setDefaultSettings] = useState<Settings | null>(settings || null);
  const [loading, setLoading] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  const prevIsOpenRef = useRef(false);
  const prevInitialFlightIdRef = useRef<number | undefined>(undefined);
  const initialSnapshotRef = useRef<string>('');

  const dsStatus = useMemo(() => getDataSourceStatus(defaultSettings), [defaultSettings]);

  const pointsList: string[] = useMemo(() => {
    if (!defaultSettings?.pointsCurrencies) return [];
    try {
      const parsed = typeof defaultSettings.pointsCurrencies === 'string'
        ? JSON.parse(defaultSettings.pointsCurrencies)
        : defaultSettings.pointsCurrencies;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [defaultSettings?.pointsCurrencies]);

  const isPointsFlight = useMemo(() => {
    return formData.paymentType === 'points' || Boolean(formData.currency && pointsList.includes(formData.currency));
  }, [formData.paymentType, formData.currency, pointsList]);

  // Route lookup for flight watching & booked flights
  const isFlightMode = formData.trackingType === 'flight_watch' || formData.trackingType === 'flight_booked';
  const effectiveSearchMode: SearchMode = isFlightMode ? 'FlightNumber' : 'Route';

  const {
    detectedRoute,
    routeLookupLoading,
    routeAlert,
    adoptDetectedRoute,
    resetLookupState,
  } = useRouteLookup({
    isOpen,
    searchMode: effectiveSearchMode,
    airline: formData.airline,
    flightNumber: formData.flightNumber,
    departureDate: formData.departureDate,
    origin: formData.origin,
    destination: formData.destination,
    onAutoPopulate: (origin, destination) => {
      setFormData(prev => ({ ...prev, origin, destination }));
    },
  });

  // Load settings if not passed
  useEffect(() => {
    if (settings) {
      setDefaultSettings(settings);
    } else {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => setDefaultSettings(data))
        .catch(err => console.error('Failed to load global settings in modal:', err));
    }
  }, [settings]);

  // Reset or initialize state when opening or switching flight
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isFlightChanged = isOpen && initialFlight?.id !== prevInitialFlightIdRef.current;

    if (isOpening || isFlightChanged) {
      const todayStr = getTodayDateString(defaultSettings?.timezone);

      if (initialFlight) {
        let farOut = '';
        let standard = '';
        let finalStretch = '';
        if (initialFlight.scheduleOverride) {
          try {
            const override = JSON.parse(initialFlight.scheduleOverride);
            farOut = override.farOut !== undefined && override.farOut !== null ? String(override.farOut) : '';
            standard = override.standard !== undefined && override.standard !== null ? String(override.standard) : '';
            finalStretch = override.finalStretch !== undefined && override.finalStretch !== null ? String(override.finalStretch) : '';
          } catch (e) {
            console.error('Failed to parse scheduleOverride', e);
          }
        }

        const isBooked = (initialFlight.purchasePrice !== null && initialFlight.purchasePrice !== undefined && initialFlight.purchasePrice > 0) || Boolean(initialFlight.pnr);
        const trackingType: TrackingOption = isBooked
          ? 'flight_booked'
          : (initialFlight.searchMode === 'FlightNumber' && Boolean(initialFlight.flightNumber))
          ? 'flight_watch'
          : 'route_watch';

        const isPoints = Boolean(initialFlight.currency && pointsList.includes(initialFlight.currency));
        const paymentType: PaymentType = isPoints ? 'points' : 'cash';
        const isManual = initialFlight.isManual === 1;

        const nextState: FlightFormState = {
          trackingType,
          paymentType,
          isManual,
          showRouteDetails: Boolean(initialFlight.origin && initialFlight.destination),
          origin: initialFlight.origin || '',
          destination: initialFlight.destination || '',
          departureDate: initialFlight.departureDate || '',
          bookingDate: initialFlight.bookingDate || todayStr,
          airline: initialFlight.airline || '',
          flightNumber: initialFlight.flightNumber || '',
          includedAirlines: initialFlight.includedAirlines || '',
          excludedAirlines: initialFlight.excludedAirlines || '',
          pnr: initialFlight.pnr || '',
          fareTier: initialFlight.fareTier || 'Standard',
          cabinClass: initialFlight.cabinClass || 'economy',
          baselinePrice: initialFlight.baselinePrice ? String(initialFlight.baselinePrice) : '',
          purchasePrice: initialFlight.purchasePrice ? String(initialFlight.purchasePrice) : '',
          currency: initialFlight.currency || defaultSettings?.currency || 'USD',
          minDropDollar: (initialFlight.minDropDollar !== null && initialFlight.minDropDollar !== undefined) ? String(initialFlight.minDropDollar) : '',
          minDropPercent: (initialFlight.minDropPercent !== null && initialFlight.minDropPercent !== undefined) ? String(initialFlight.minDropPercent) : '',
          notes: initialFlight.notes || '',
          overrideFarOut: farOut,
          overrideStandard: standard,
          overrideFinalStretch: finalStretch,
          pauseTracking: isPoints || isManual || initialFlight.status === 'Paused',
          disableNotifications: initialFlight.disableNotifications === 1,
          earliestDeparture: initialFlight.earliestDeparture || '',
          latestDeparture: initialFlight.latestDeparture || '',
          noRedeye: initialFlight.noRedeye === 1,
          maxStops: (initialFlight.maxStops !== null && initialFlight.maxStops !== undefined) ? initialFlight.maxStops : null,
          priceTrackingDirection: initialFlight.priceTrackingDirection || 'drop',
          minIncreaseDollar: (initialFlight.minIncreaseDollar !== null && initialFlight.minIncreaseDollar !== undefined) ? String(initialFlight.minIncreaseDollar) : '',
          minIncreasePercent: (initialFlight.minIncreasePercent !== null && initialFlight.minIncreasePercent !== undefined) ? String(initialFlight.minIncreasePercent) : '',
          monitorRouteAlternatives: initialFlight.monitorRouteAlternatives === 1,
          maxLayoverMinutes: (initialFlight.maxLayoverMinutes !== null && initialFlight.maxLayoverMinutes !== undefined) ? initialFlight.maxLayoverMinutes : null,
          excludedConnectingAirports: initialFlight.excludedConnectingAirports || '',
          maxTotalDurationMinutes: (initialFlight.maxTotalDurationMinutes !== null && initialFlight.maxTotalDurationMinutes !== undefined) ? initialFlight.maxTotalDurationMinutes : null,
          includedAlliances: initialFlight.includedAlliances || '',
          excludedAlliances: initialFlight.excludedAlliances || '',
        };

        setFormData(nextState);
        initialSnapshotRef.current = JSON.stringify(nextState);
      } else {
        const nextState: FlightFormState = {
          ...DEFAULT_FORM_STATE,
          bookingDate: todayStr,
          currency: defaultSettings?.currency || 'USD',
          fareTier: defaultSettings?.defaultFareTier || 'Standard',
          cabinClass: defaultSettings?.defaultCabinClass || 'economy',
          noRedeye: defaultSettings?.defaultNoRedeye === 1,
          maxStops: (defaultSettings?.defaultMaxStops !== undefined && defaultSettings?.defaultMaxStops !== null) ? defaultSettings.defaultMaxStops : null,
          includedAirlines: defaultSettings?.defaultIncludedAirlines || '',
          excludedAirlines: defaultSettings?.defaultExcludedAirlines || '',
          maxLayoverMinutes: (defaultSettings?.defaultMaxLayoverMinutes !== undefined && defaultSettings?.defaultMaxLayoverMinutes !== null) ? defaultSettings.defaultMaxLayoverMinutes : null,
          excludedConnectingAirports: defaultSettings?.defaultExcludedConnectingAirports || '',
          maxTotalDurationMinutes: (defaultSettings?.defaultMaxTotalDurationMinutes !== undefined && defaultSettings?.defaultMaxTotalDurationMinutes !== null) ? defaultSettings.defaultMaxTotalDurationMinutes : null,
        };
        setFormData(nextState);
        initialSnapshotRef.current = JSON.stringify(nextState);
      }
      setError(null);
      setLookupFailed(false);
      setShowUnsavedPrompt(false);
    }

    prevIsOpenRef.current = isOpen;
    prevInitialFlightIdRef.current = initialFlight?.id;
  }, [isOpen, initialFlight, defaultSettings, pointsList]);

  // Dirty state calculation
  const isDirty = useMemo(() => {
    if (!isOpen) return false;
    return JSON.stringify(formData) !== initialSnapshotRef.current;
  }, [formData, isOpen]);

  // Intercept browser window tab/close when dirty
  useEffect(() => {
    if (!isOpen || !isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isDirty]);

  // In-app exit handling
  const handleCloseRequest = useCallback(() => {
    if (isDirty) {
      setShowUnsavedPrompt(true);
    } else {
      setFormData(DEFAULT_FORM_STATE);
      resetLookupState();
      setError(null);
      setLookupFailed(false);
      onClose();
    }
  }, [isDirty, onClose, resetLookupState]);

  const confirmDiscard = useCallback(() => {
    setShowUnsavedPrompt(false);
    setFormData(DEFAULT_FORM_STATE);
    resetLookupState();
    setError(null);
    setLookupFailed(false);
    onClose();
  }, [onClose, resetLookupState]);

  const cancelDiscard = useCallback(() => {
    setShowUnsavedPrompt(false);
  }, []);

  const handleFieldChange = useCallback((updates: Partial<FlightFormState>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    if (lookupFailed) setLookupFailed(false);
    if (error) setError(null);
  }, [lookupFailed, error]);

  const handleTrackingTypeChange = useCallback((newType: TrackingOption) => {
    setFormData(prev => ({
      ...prev,
      trackingType: newType,
      showRouteDetails: newType === 'route_watch' ? true : prev.showRouteDetails,
    }));
  }, []);

  const handlePaymentTypeChange = useCallback((newPaymentType: PaymentType) => {
    setFormData(prev => {
      const isPoints = newPaymentType === 'points';
      let nextCurrency = prev.currency;
      if (isPoints) {
        nextCurrency = pointsList.length > 0 ? pointsList[0] : 'PTS';
      } else {
        nextCurrency = defaultSettings?.currency || 'USD';
      }
      return {
        ...prev,
        paymentType: newPaymentType,
        currency: nextCurrency,
        isManual: isPoints ? true : prev.isManual,
        pauseTracking: isPoints ? true : prev.pauseTracking,
      };
    });
  }, [pointsList, defaultSettings]);

  const handleCurrencyChange = useCallback((newCurrency: string) => {
    const isPoints = pointsList.includes(newCurrency);
    setFormData(prev => ({
      ...prev,
      currency: newCurrency,
      paymentType: isPoints ? 'points' : 'cash',
      isManual: isPoints ? true : prev.isManual,
      pauseTracking: isPoints ? true : prev.pauseTracking,
    }));
  }, [pointsList]);

  const handleToggleRouteAlternatives = useCallback((enabled: boolean) => {
    setFormData(prev => {
      const updates: Partial<FlightFormState> = { monitorRouteAlternatives: enabled };
      if (enabled && defaultSettings) {
        if (!prev.includedAirlines && defaultSettings.defaultIncludedAirlines) {
          updates.includedAirlines = defaultSettings.defaultIncludedAirlines;
        }
        if (!prev.excludedAirlines && defaultSettings.defaultExcludedAirlines) {
          updates.excludedAirlines = defaultSettings.defaultExcludedAirlines;
        }
        if (prev.maxStops === null && defaultSettings.defaultMaxStops !== null && defaultSettings.defaultMaxStops !== undefined) {
          updates.maxStops = defaultSettings.defaultMaxStops;
        }
        if (!prev.noRedeye && defaultSettings.defaultNoRedeye === 1) {
          updates.noRedeye = true;
        }
      }
      return { ...prev, ...updates };
    });
  }, [defaultSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLookupFailed(false);

    const todayStr = getTodayDateString(defaultSettings?.timezone);

    if (formData.departureDate < todayStr) {
      setError('Departure date cannot be in the past. Please select today or a future date.');
      return;
    }

    // Validation by tracking type
    if (formData.trackingType === 'route_watch') {
      if (!formData.origin.trim() || !formData.destination.trim()) {
        setError('Origin and destination airport codes are required for route watching.');
        return;
      }
    } else if (formData.trackingType === 'flight_watch') {
      if (!formData.airline.trim() || !formData.flightNumber.trim()) {
        setError('Carrier code and flight number are required to watch a specific flight.');
        return;
      }
      if (formData.showRouteDetails && (!formData.origin.trim() || !formData.destination.trim())) {
        setError('Please enter Origin and Destination airports, or uncheck route details to auto-detect.');
        return;
      }
      if (!formData.origin.trim() && !detectedRoute?.origin) {
        setError('Origin airport is required. Please check "Specify Route Details" or ensure carrier and flight number are valid.');
        return;
      }
    } else if (formData.trackingType === 'flight_booked') {
      if (!formData.airline.trim() || !formData.flightNumber.trim()) {
        setError('Carrier code and flight number are required for booked flights.');
        return;
      }
      if (!formData.purchasePrice.trim() || parseFloat(formData.purchasePrice) <= 0) {
        setError('Please enter the purchase price or points paid for this flight.');
        return;
      }
      if (!formData.bookingDate) {
        setError('Booking date is required.');
        return;
      }
      if (formData.bookingDate > todayStr) {
        setError('Booking date cannot be in the future.');
        return;
      }
      if (formData.showRouteDetails && (!formData.origin.trim() || !formData.destination.trim())) {
        setError('Please enter Origin and Destination airports, or uncheck route details to auto-detect.');
        return;
      }
      if (!formData.origin.trim() && !detectedRoute?.origin) {
        setError('Origin airport is required. Please check "Specify Route Details" or ensure carrier and flight number are valid.');
        return;
      }
    }

    if (!initialFlight && !dsStatus.available && formData.trackingType !== 'flight_booked' && !isPointsFlight && !formData.isManual) {
      setError(dsStatus.reason || 'No active data sources available. Please visit Settings.');
      return;
    }

    setLoading(true);

    const scheduleOverride = (formData.overrideFarOut !== '' || formData.overrideStandard !== '' || formData.overrideFinalStretch !== '')
      ? JSON.stringify({
          farOut: formData.overrideFarOut !== '' ? parseInt(formData.overrideFarOut, 10) : undefined,
          standard: formData.overrideStandard !== '' ? parseInt(formData.overrideStandard, 10) : undefined,
          finalStretch: formData.overrideFinalStretch !== '' ? parseInt(formData.overrideFinalStretch, 10) : undefined,
        })
      : null;

    const parsedPurchase = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
    let parsedBaseline = formData.baselinePrice ? parseFloat(formData.baselinePrice) : null;

    if (!parsedBaseline && parsedPurchase) {
      parsedBaseline = parsedPurchase;
    }

    const effectiveOrigin = (formData.origin.trim() || detectedRoute?.origin || '').toUpperCase();
    const effectiveDest = (formData.destination.trim() || detectedRoute?.destination || '').toUpperCase();
    const effectiveSearchModeVal: SearchMode = formData.trackingType === 'route_watch' ? 'Route' : 'FlightNumber';

    const payload = {
      searchMode: effectiveSearchModeVal,
      origin: effectiveOrigin,
      destination: effectiveDest,
      airline: formData.airline ? formData.airline.trim().toUpperCase() : '',
      flightNumber: effectiveSearchModeVal === 'FlightNumber' && formData.flightNumber.trim() ? formData.flightNumber.trim() : null,
      includedAirlines: formData.includedAirlines ? formData.includedAirlines.trim().toUpperCase() : null,
      excludedAirlines: formData.excludedAirlines ? formData.excludedAirlines.trim().toUpperCase() : null,
      departureDate: formData.departureDate,
      bookingDate: formData.trackingType === 'flight_booked' ? formData.bookingDate : null,
      isManual: formData.isManual ? 1 : 0,
      fareTier: formData.fareTier,
      cabinClass: formData.cabinClass,
      baselinePrice: parsedBaseline,
      purchasePrice: parsedPurchase,
      currency: formData.currency || defaultSettings?.currency || 'USD',
      minDropDollar: formData.minDropDollar ? parseFloat(formData.minDropDollar) : null,
      minDropPercent: formData.minDropPercent ? parseFloat(formData.minDropPercent) : null,
      pnr: formData.pnr ? formData.pnr.trim().toUpperCase() : null,
      notes: formData.notes ? formData.notes.trim() : null,
      status: formData.pauseTracking || isPointsFlight || formData.isManual ? 'Paused' : (formData.trackingType === 'flight_booked' ? 'Booked' : 'Watching'),
      disableNotifications: isPointsFlight || formData.disableNotifications ? 1 : 0,
      scheduleOverride,
      earliestDeparture: formData.earliestDeparture ? formData.earliestDeparture.trim() : null,
      latestDeparture: formData.latestDeparture ? formData.latestDeparture.trim() : null,
      noRedeye: formData.noRedeye ? 1 : 0,
      maxStops: formData.maxStops !== null && formData.maxStops !== undefined ? formData.maxStops : null,
      priceTrackingDirection: formData.trackingType === 'flight_booked' ? 'drop' : formData.priceTrackingDirection,
      minIncreaseDollar: formData.minIncreaseDollar ? parseFloat(formData.minIncreaseDollar) : null,
      minIncreasePercent: formData.minIncreasePercent ? parseFloat(formData.minIncreasePercent) : null,
      monitorRouteAlternatives: effectiveSearchModeVal === 'FlightNumber' ? (formData.monitorRouteAlternatives ? 1 : 0) : 0,
      maxLayoverMinutes: formData.maxLayoverMinutes !== null && formData.maxLayoverMinutes !== undefined ? formData.maxLayoverMinutes : null,
      excludedConnectingAirports: formData.excludedConnectingAirports ? formData.excludedConnectingAirports.trim().toUpperCase() : null,
      maxTotalDurationMinutes: formData.maxTotalDurationMinutes !== null && formData.maxTotalDurationMinutes !== undefined ? formData.maxTotalDurationMinutes : null,
      includedAlliances: formData.includedAlliances ? formData.includedAlliances.trim().toUpperCase() : null,
      excludedAlliances: formData.excludedAlliances ? formData.excludedAlliances.trim().toUpperCase() : null,
    };

    try {
      const endpoint = initialFlight ? `/api/flights/${initialFlight.id}` : '/api/flights';
      const method = initialFlight ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        const errMessage = data.error?.message || data.error || 'Failed to save flight';
        setLookupFailed(true);
        throw new Error(errMessage);
      }

      setFormData(DEFAULT_FORM_STATE);
      setLookupFailed(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    defaultSettings,
    pointsList,
    isPointsFlight,
    dsStatus,
    loading,
    lookupFailed,
    error,
    isDirty,
    showUnsavedPrompt,
    detectedRoute,
    routeLookupLoading,
    routeAlert,
    adoptDetectedRoute,
    handleFieldChange,
    handleTrackingTypeChange,
    handlePaymentTypeChange,
    handleCurrencyChange,
    handleToggleRouteAlternatives,
    handleCloseRequest,
    confirmDiscard,
    cancelDiscard,
    handleSubmit,
  };
}