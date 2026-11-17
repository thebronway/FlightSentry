'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FareTier,
  CabinClass,
  SearchMode,
  PriceTrackingDirection,
  Flight,
  Settings,
  TrackedFlightLeg,
} from '@/types';
import { useRouteLookup } from '@/hooks/useRouteLookup';
import { getDataSourceStatus, isValidAirlineCode } from '@/utils/airline';
import { isMetroCode } from '@/utils/coLocations';
import { getTodayDateString } from '@/utils/date';
import { isPointsCurrency } from '@/utils/format';
import { parseFlightLegs, serializeFlightLegs } from '@/utils/flightLegs';

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
  bookingAirline: string;
  flightNumber: string;
  legs: TrackedFlightLeg[];
  includedAirlines: string;
  excludedAirlines: string;
  pnr: string;
  fareTier: FareTier;
  cabinClass: CabinClass;
  baselinePrice: string;
  purchasePrice: string;
  currency: string;
  taxesAmount: string;
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
  bookingAirline: '',
  flightNumber: '',
  legs: [],
  includedAirlines: '',
  excludedAirlines: '',
  pnr: '',
  fareTier: 'Standard',
  cabinClass: 'economy',
  baselinePrice: '',
  purchasePrice: '',
  currency: '',
  taxesAmount: '',
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
    return (
      formData.paymentType === 'points' ||
      isPointsCurrency(formData.currency) ||
      Boolean(formData.currency && pointsList.includes(formData.currency))
    );
  }, [formData.paymentType, formData.currency, pointsList]);

  // Route lookup for flight watching & booked flights
  const isFlightMode = formData.trackingType === 'flight_watch' || formData.trackingType === 'flight_booked';
  const effectiveSearchMode: SearchMode = isFlightMode ? 'FlightNumber' : 'Route';

  const {
    detectedRoute,
    detectedRoutes,
    routeLookupLoading,
    routeAlert,
    selectRouteCandidate,
    adoptDetectedRoute,
    triggerBlurLookup,
    triggerManualLookup,
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

        const isPoints = Boolean(
          initialFlight.currency &&
            (isPointsCurrency(initialFlight.currency) || pointsList.includes(initialFlight.currency))
        );
        const paymentType: PaymentType = isPoints ? 'points' : 'cash';
        const isManual = initialFlight.isManual === 1;
        const parsedInitialLegs = parseFlightLegs(initialFlight.legs);

        const nextState: FlightFormState = {
          trackingType,
          paymentType,
          isManual,
          showRouteDetails: parsedInitialLegs.length >= 2 || Boolean(initialFlight.origin && initialFlight.destination),
          origin: parsedInitialLegs[0]?.origin || initialFlight.origin || '',
          destination: parsedInitialLegs[parsedInitialLegs.length - 1]?.destination || initialFlight.destination || '',
          departureDate: initialFlight.departureDate || '',
          bookingDate: initialFlight.bookingDate || todayStr,
          airline: parsedInitialLegs[0]?.airline || initialFlight.airline || '',
          bookingAirline:
            initialFlight.bookingAirline && initialFlight.bookingAirline !== (parsedInitialLegs[0]?.airline || initialFlight.airline)
              ? initialFlight.bookingAirline
              : '',
          flightNumber: parsedInitialLegs[0]?.flightNumber || initialFlight.flightNumber || '',
          legs: parsedInitialLegs,
          includedAirlines: initialFlight.includedAirlines || '',
          excludedAirlines: initialFlight.excludedAirlines || '',
          pnr: initialFlight.pnr || '',
          fareTier: initialFlight.fareTier || 'Standard',
          cabinClass: initialFlight.cabinClass || 'economy',
          baselinePrice: initialFlight.baselinePrice ? String(initialFlight.baselinePrice) : '',
          purchasePrice: initialFlight.purchasePrice ? String(initialFlight.purchasePrice) : '',
          currency: initialFlight.currency || defaultSettings?.currency || 'USD',
          taxesAmount:
            initialFlight.taxesAmount !== null &&
            initialFlight.taxesAmount !== undefined &&
            initialFlight.taxesAmount > 0
              ? String(initialFlight.taxesAmount)
              : '',
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

  const sanitizeSingleAirport = (code: string): string => {
    const firstToken = code.split(',')[0]?.trim().toUpperCase() || '';
    if (/^[A-Z]{3}$/.test(firstToken) && !isMetroCode(firstToken)) {
      return firstToken;
    }
    return '';
  };

  const syncTopLevelFromLegs = (legs: TrackedFlightLeg[], prev: FlightFormState): Partial<FlightFormState> => {
    if (legs.length < 2) {
      return { legs: [] };
    }
    const normalized: TrackedFlightLeg[] = legs.map((leg, idx) => ({
      airline: (leg.airline || '').trim().toUpperCase(),
      bookingAirline: leg.bookingAirline ? leg.bookingAirline.trim().toUpperCase() : null,
      flightNumber: (leg.flightNumber || '').trim().replace(/\D/g, ''),
      origin: idx === 0
        ? (leg.origin || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase()
        : (legs[idx - 1]?.destination || leg.origin || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase(),
      destination: (leg.destination || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase(),
    }));
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    return {
      legs: normalized,
      airline: first.airline || prev.airline,
      flightNumber: first.flightNumber || prev.flightNumber,
      origin: first.origin,
      destination: last.destination,
      showRouteDetails: true,
    };
  };

  const handleEnableLayover = useCallback(() => {
    setFormData(prev => {
      if (prev.legs.length >= 2) return prev;
      const firstOrigin = sanitizeSingleAirport(prev.origin) || detectedRoute?.origin || '';
      const finalDest = sanitizeSingleAirport(prev.destination) || detectedRoute?.destination || '';
      const initialLegs: TrackedFlightLeg[] = [
        {
          airline: prev.airline.trim().toUpperCase(),
          bookingAirline: prev.bookingAirline ? prev.bookingAirline.trim().toUpperCase() : null,
          flightNumber: prev.flightNumber.trim().replace(/\D/g, ''),
          origin: firstOrigin,
          destination: '',
        },
        {
          airline: prev.airline.trim().toUpperCase(),
          bookingAirline: null,
          flightNumber: '',
          origin: '',
          destination: finalDest,
        },
      ];
      return {
        ...prev,
        ...syncTopLevelFromLegs(initialLegs, prev),
      };
    });
    if (error) setError(null);
  }, [detectedRoute, error]);

  const handleAddLayoverLeg = useCallback(() => {
    setFormData(prev => {
      if (prev.legs.length < 2 || prev.legs.length >= 4) return prev;
      const lastIdx = prev.legs.length - 1;
      const priorLast = prev.legs[lastIdx];
      const nextLegs: TrackedFlightLeg[] = [
        ...prev.legs.slice(0, lastIdx),
        {
          ...priorLast,
          destination: '',
        },
        {
          airline: priorLast.airline || prev.airline.trim().toUpperCase(),
          bookingAirline: null,
          flightNumber: '',
          origin: '',
          destination: priorLast.destination || '',
        },
      ];
      return {
        ...prev,
        ...syncTopLevelFromLegs(nextLegs, prev),
      };
    });
    if (error) setError(null);
  }, [error]);

  const handleUpdateLayoverLeg = useCallback(
    (index: number, patch: Partial<TrackedFlightLeg>) => {
      setFormData(prev => {
        if (index < 0 || index >= prev.legs.length) return prev;
        const nextLegs = prev.legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg));
        if (patch.destination !== undefined && index + 1 < nextLegs.length) {
          nextLegs[index + 1] = {
            ...nextLegs[index + 1],
            origin: patch.destination,
          };
        }
        return {
          ...prev,
          ...syncTopLevelFromLegs(nextLegs, prev),
        };
      });
      if (lookupFailed) setLookupFailed(false);
      if (error) setError(null);
    },
    [lookupFailed, error]
  );

  const handleRemoveLayoverLeg = useCallback(
    (index: number) => {
      setFormData(prev => {
        if (prev.legs.length <= 2) {
          const first = prev.legs[0];
          const last = prev.legs[prev.legs.length - 1];
          return {
            ...prev,
            legs: [],
            airline: first?.airline || prev.airline,
            flightNumber: first?.flightNumber || prev.flightNumber,
            origin: first?.origin || prev.origin,
            destination: last?.destination || prev.destination,
          };
        }
        const filtered = prev.legs.filter((_, i) => i !== index);
        for (let i = 0; i < filtered.length - 1; i++) {
          filtered[i + 1] = { ...filtered[i + 1], origin: filtered[i].destination };
        }
        return {
          ...prev,
          ...syncTopLevelFromLegs(filtered, prev),
        };
      });
      if (error) setError(null);
    },
    [error]
  );

  const handleClearLayovers = useCallback(() => {
    setFormData(prev => {
      if (prev.legs.length === 0) return prev;
      const first = prev.legs[0];
      const last = prev.legs[prev.legs.length - 1];
      return {
        ...prev,
        legs: [],
        airline: first?.airline || prev.airline,
        flightNumber: first?.flightNumber || prev.flightNumber,
        origin: first?.origin || prev.origin,
        destination: last?.destination || prev.destination,
      };
    });
    if (error) setError(null);
  }, [error]);

  const handleTrackingTypeChange = useCallback((newType: TrackingOption) => {
    setFormData(prev => {
      if (newType === 'route_watch' && (prev.isManual || prev.paymentType === 'points')) {
        return prev;
      }
      const restrictSingle = newType !== 'route_watch' && !prev.monitorRouteAlternatives;
      return {
        ...prev,
        trackingType: newType,
        legs: newType === 'route_watch' ? [] : prev.legs,
        showRouteDetails: newType === 'route_watch' ? true : prev.showRouteDetails,
        origin: restrictSingle ? sanitizeSingleAirport(prev.origin) : prev.origin,
        destination: restrictSingle ? sanitizeSingleAirport(prev.destination) : prev.destination,
      };
    });
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
      const preserveManual = !isPoints && Boolean(initialFlight?.isManual === 1 && !isPointsCurrency(initialFlight?.currency));
      const nextManual = isPoints ? true : preserveManual;
      const nextTrackingType: TrackingOption =
        (isPoints || nextManual) && prev.trackingType === 'route_watch'
          ? 'flight_watch'
          : prev.trackingType;
      const restrictSingle = nextTrackingType !== 'route_watch' && !prev.monitorRouteAlternatives;
      return {
        ...prev,
        trackingType: nextTrackingType,
        paymentType: newPaymentType,
        currency: nextCurrency,
        taxesAmount: isPoints ? prev.taxesAmount : '',
        isManual: nextManual,
        pauseTracking: isPoints ? true : preserveManual,
        monitorRouteAlternatives: isPoints ? false : prev.monitorRouteAlternatives,
        showRouteDetails: isPoints ? true : prev.showRouteDetails,
        origin: restrictSingle ? sanitizeSingleAirport(prev.origin) : prev.origin,
        destination: restrictSingle ? sanitizeSingleAirport(prev.destination) : prev.destination,
      };
    });
  }, [pointsList, defaultSettings, initialFlight]);

  const handleCurrencyChange = useCallback((newCurrency: string) => {
    const isPoints = isPointsCurrency(newCurrency) || pointsList.includes(newCurrency);
    setFormData(prev => {
      const wasPoints = prev.paymentType === 'points';
      const preserveManual = !isPoints && Boolean(initialFlight?.isManual === 1 && !isPointsCurrency(initialFlight?.currency));
      const nextManual = isPoints ? true : wasPoints ? preserveManual : prev.isManual;
      const nextPause = isPoints ? true : wasPoints ? preserveManual : prev.pauseTracking;
      const nextTrackingType: TrackingOption =
        (isPoints || nextManual) && prev.trackingType === 'route_watch'
          ? 'flight_watch'
          : prev.trackingType;
      const restrictSingle = nextTrackingType !== 'route_watch' && !prev.monitorRouteAlternatives;
      return {
        ...prev,
        trackingType: nextTrackingType,
        currency: newCurrency,
        taxesAmount: isPoints ? prev.taxesAmount : '',
        paymentType: isPoints ? 'points' : 'cash',
        isManual: nextManual,
        pauseTracking: nextPause,
        monitorRouteAlternatives: isPoints || nextManual || nextPause ? false : prev.monitorRouteAlternatives,
        showRouteDetails: isPoints ? true : prev.showRouteDetails,
        origin: restrictSingle ? sanitizeSingleAirport(prev.origin) : prev.origin,
        destination: restrictSingle ? sanitizeSingleAirport(prev.destination) : prev.destination,
      };
    });
  }, [pointsList, initialFlight]);

  const handleToggleRouteAlternatives = useCallback((enabled: boolean) => {
    setFormData(prev => {
      const updates: Partial<FlightFormState> = { monitorRouteAlternatives: enabled };
      if (!enabled && prev.trackingType !== 'route_watch') {
        const cleanOrigin = sanitizeSingleAirport(prev.origin);
        const cleanDest = sanitizeSingleAirport(prev.destination);
        updates.origin = cleanOrigin || detectedRoute?.origin || '';
        updates.destination = cleanDest || detectedRoute?.destination || '';
      }
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
  }, [defaultSettings, detectedRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLookupFailed(false);

    const todayStr = getTodayDateString(defaultSettings?.timezone);

    if (formData.departureDate < todayStr) {
      setError('Departure date cannot be in the past. Please select today or a future date.');
      return;
    }

    // Multi-leg layover validation when 2+ legs are configured
    const hasLayoverLegs = formData.trackingType !== 'route_watch' && formData.legs.length >= 2;
    if (hasLayoverLegs) {
      for (let i = 0; i < formData.legs.length; i++) {
        const leg = formData.legs[i];
        const legLabel = `Leg ${i + 1}`;
        if (!isValidAirlineCode(leg.airline)) {
          setError(`${legLabel}: Carrier must be a valid 2-character IATA airline code (e.g. DL, B6).`);
          return;
        }
        if (!leg.flightNumber || !/^\d+$/.test(leg.flightNumber.trim())) {
          setError(`${legLabel}: Numeric flight number is required.`);
          return;
        }
        if (!/^[A-Z]{3}$/.test(leg.origin) || isMetroCode(leg.origin)) {
          setError(`${legLabel}: Origin must be a single 3-letter IATA airport code.`);
          return;
        }
        if (!/^[A-Z]{3}$/.test(leg.destination) || isMetroCode(leg.destination)) {
          setError(`${legLabel}: Destination must be a single 3-letter IATA airport code.`);
          return;
        }
        if (leg.origin === leg.destination) {
          setError(`${legLabel}: Origin and destination airports must be different.`);
          return;
        }
      }
      if (formData.legs[0].origin === formData.legs[formData.legs.length - 1].destination) {
        setError('Initial origin and final destination airports must be different.');
        return;
      }
    }

    // Validation by tracking type
    if (formData.trackingType === 'route_watch') {
      if (!formData.origin.trim() || !formData.destination.trim()) {
        setError('Origin and destination airport codes are required for route watching.');
        return;
      }
    } else if (formData.trackingType === 'flight_watch') {
      if (!formData.airline.trim() || !formData.flightNumber.trim()) {
        setError('Carrier and flight number are required to watch a specific flight.');
        return;
      }
      if (!isValidAirlineCode(formData.airline)) {
        setError("Carrier must be a valid 2-character IATA airline code (e.g. DL, B6, 9W) and cannot be 'XX' or 'UN'.");
        return;
      }
      if (formData.bookingAirline.trim() && !isValidAirlineCode(formData.bookingAirline)) {
        setError("Booking Carrier must be a valid 2-character IATA airline code (e.g. DL, B6, 9W) and cannot be 'XX' or 'UN'.");
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
        setError('Carrier and flight number are required for booked flights.');
        return;
      }
      if (!isValidAirlineCode(formData.airline)) {
        setError("Carrier must be a valid 2-character IATA airline code (e.g. DL, B6, 9W) and cannot be 'XX' or 'UN'.");
        return;
      }
      if (formData.bookingAirline.trim() && !isValidAirlineCode(formData.bookingAirline)) {
        setError("Booking Carrier must be a valid 2-character IATA airline code (e.g. DL, B6, 9W) and cannot be 'XX' or 'UN'.");
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

    if (formData.trackingType !== 'route_watch' && !formData.monitorRouteAlternatives) {
      const trimmedOrigin = formData.origin.trim().toUpperCase();
      const trimmedDest = formData.destination.trim().toUpperCase();
      if (trimmedOrigin && (!/^[A-Z]{3}$/.test(trimmedOrigin) || isMetroCode(trimmedOrigin))) {
        setError('Origin must be a single 3-letter IATA airport code in Flight mode (enable "Also Monitor Route Alternatives" for co-location clusters).');
        return;
      }
      if (trimmedDest && (!/^[A-Z]{3}$/.test(trimmedDest) || isMetroCode(trimmedDest))) {
        setError('Destination must be a single 3-letter IATA airport code in Flight mode (enable "Also Monitor Route Alternatives" for co-location clusters).');
        return;
      }
    }

    if (!initialFlight && !dsStatus.available && !isPointsFlight && !formData.isManual) {
      setError(`${dsStatus.reason || 'No active data sources available.'} Enable Manual Tracking Mode, switch to Points / Miles, or activate a data source in Settings.`);
      return;
    }

    setLoading(true);

    const isAutomatedDisabled = isPointsFlight || formData.isManual || formData.pauseTracking;

    const scheduleOverride = !isAutomatedDisabled && (formData.overrideFarOut !== '' || formData.overrideStandard !== '' || formData.overrideFinalStretch !== '')
      ? JSON.stringify({
          farOut: formData.overrideFarOut !== '' ? parseInt(formData.overrideFarOut, 10) : undefined,
          standard: formData.overrideStandard !== '' ? parseInt(formData.overrideStandard, 10) : undefined,
          finalStretch: formData.overrideFinalStretch !== '' ? parseInt(formData.overrideFinalStretch, 10) : undefined,
        })
      : null;

    const parsedPurchase = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
    const rawTaxes =
      isPointsFlight && formData.trackingType === 'flight_booked' && formData.taxesAmount.trim() !== ''
        ? parseFloat(formData.taxesAmount)
        : null;
    if (rawTaxes !== null && (Number.isNaN(rawTaxes) || rawTaxes < 0)) {
      setLoading(false);
      setError('Taxes & fees must be zero or a positive amount.');
      return;
    }
    const normalizedTaxesAmount = rawTaxes !== null && rawTaxes > 0 ? rawTaxes : null;
    const normalizedTaxesCurrency = normalizedTaxesAmount
      ? (defaultSettings?.currency || 'USD').trim().toUpperCase()
      : null;
    let parsedBaseline = formData.baselinePrice ? parseFloat(formData.baselinePrice) : null;

    if (!parsedBaseline && parsedPurchase) {
      parsedBaseline = parsedPurchase;
    }

    const effectiveSearchModeVal: SearchMode = formData.trackingType === 'route_watch' ? 'Route' : 'FlightNumber';
    const serializedLegs =
      effectiveSearchModeVal === 'FlightNumber' && formData.legs.length >= 2
        ? serializeFlightLegs(formData.legs)
        : null;

    const effectiveOrigin = serializedLegs
      ? formData.legs[0].origin.toUpperCase()
      : (formData.origin.trim() || detectedRoute?.origin || '').toUpperCase();
    const effectiveDest = serializedLegs
      ? formData.legs[formData.legs.length - 1].destination.toUpperCase()
      : (formData.destination.trim() || detectedRoute?.destination || '').toUpperCase();

    const cleanAirline = serializedLegs
      ? formData.legs[0].airline.trim().toUpperCase()
      : formData.airline
      ? formData.airline.trim().toUpperCase()
      : '';
    const cleanBookingAirline = formData.bookingAirline ? formData.bookingAirline.trim().toUpperCase() : '';
    const cleanFlightNum = serializedLegs
      ? formData.legs[0].flightNumber.trim()
      : effectiveSearchModeVal === 'FlightNumber' && formData.flightNumber.trim()
      ? formData.flightNumber.trim()
      : null;

    const payload = {
      searchMode: effectiveSearchModeVal,
      origin: effectiveOrigin,
      destination: effectiveDest,
      airline: cleanAirline,
      bookingAirline: cleanBookingAirline || cleanAirline || null,
      flightNumber: cleanFlightNum,
      legs: serializedLegs,
      includedAirlines: formData.includedAirlines ? formData.includedAirlines.trim().toUpperCase() : null,
      excludedAirlines: formData.excludedAirlines ? formData.excludedAirlines.trim().toUpperCase() : null,
      departureDate: formData.departureDate,
      bookingDate: formData.trackingType === 'flight_booked' ? formData.bookingDate : null,
      isManual: isPointsFlight || formData.isManual ? 1 : 0,
      fareTier: formData.fareTier,
      cabinClass: formData.cabinClass,
      baselinePrice: parsedBaseline,
      purchasePrice: parsedPurchase,
      currency: formData.currency || defaultSettings?.currency || 'USD',
      taxesAmount: normalizedTaxesAmount,
      taxesCurrency: normalizedTaxesCurrency,
      minDropDollar: formData.minDropDollar ? parseFloat(formData.minDropDollar) : null,
      minDropPercent: formData.minDropPercent ? parseFloat(formData.minDropPercent) : null,
      pnr: formData.pnr ? formData.pnr.trim().toUpperCase() : null,
      notes: formData.notes ? formData.notes.trim() : null,
      status: isAutomatedDisabled ? 'Paused' : (formData.trackingType === 'flight_booked' ? 'Booked' : 'Watching'),
      disableNotifications: isPointsFlight || formData.isManual || formData.disableNotifications ? 1 : 0,
      scheduleOverride,
      earliestDeparture: formData.earliestDeparture ? formData.earliestDeparture.trim() : null,
      latestDeparture: formData.latestDeparture ? formData.latestDeparture.trim() : null,
      noRedeye: formData.noRedeye ? 1 : 0,
      maxStops: formData.maxStops !== null && formData.maxStops !== undefined ? formData.maxStops : null,
      priceTrackingDirection: formData.trackingType === 'flight_booked' ? 'drop' : formData.priceTrackingDirection,
      minIncreaseDollar: formData.minIncreaseDollar ? parseFloat(formData.minIncreaseDollar) : null,
      minIncreasePercent: formData.minIncreasePercent ? parseFloat(formData.minIncreasePercent) : null,
      monitorRouteAlternatives: effectiveSearchModeVal === 'FlightNumber' && !isAutomatedDisabled ? (formData.monitorRouteAlternatives ? 1 : 0) : 0,
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
    detectedRoutes,
    routeLookupLoading,
    routeAlert,
    selectRouteCandidate,
    adoptDetectedRoute,
    triggerBlurLookup,
    triggerManualLookup,
    handleFieldChange,
    handleEnableLayover,
    handleAddLayoverLeg,
    handleUpdateLayoverLeg,
    handleRemoveLayoverLeg,
    handleClearLayovers,
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