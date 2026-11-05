'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, PlaneTakeoff, Compass, Lock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { FareTier, CabinClass, SearchMode, PriceTrackingDirection, Flight, Settings } from '@/types';
import { useRouteLookup } from '@/hooks/useRouteLookup';
import { getDataSourceStatus, normalizeAirlineCode } from '@/utils/airline';
import { getTodayDateString } from '@/utils/date';
import { getCoLocationInfo } from '@/utils/coLocations';
import TrackingGoalSection, { TrackingGoal } from './flightModal/TrackingGoalSection';
import AlertThresholdsSection from './flightModal/AlertThresholdsSection';
import CadenceOverridesSection from './flightModal/CadenceOverridesSection';
import SearchPreferencesSection from './flightModal/SearchPreferencesSection';
import AirlineTagInput from './common/AirlineTagInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFlight?: Flight | null;
  settings?: Settings | null;
}

const DEFAULT_STATE = {
  searchMode: 'Route' as SearchMode,
  trackingGoal: 'watching' as TrackingGoal,
  origin: '',
  destination: '',
  departureDate: '',
  airline: '',
  flightNumber: '',
  includedAirlines: '',
  excludedAirlines: '',
  pnr: '',
  fareTier: 'Standard' as FareTier,
  cabinClass: 'economy' as CabinClass,
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
  maxStops: null as number | null,
  priceTrackingDirection: 'drop' as PriceTrackingDirection,
  minIncreaseDollar: '',
  minIncreasePercent: '',
};

export default function FlightModal({ isOpen, onClose, onSuccess, initialFlight, settings }: Props) {
  const [formData, setFormData] = useState(DEFAULT_STATE);
  const [defaultSettings, setDefaultSettings] = useState<Settings | null>(settings || null);
  const [loading, setLoading] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return Boolean(formData.currency && pointsList.includes(formData.currency));
  }, [formData.currency, pointsList]);

  const {
    detectedRoute,
    routeLookupLoading,
    routeAlert,
    adoptDetectedRoute,
    resetLookupState,
  } = useRouteLookup({
    isOpen,
    searchMode: formData.searchMode,
    airline: formData.airline,
    flightNumber: formData.flightNumber,
    departureDate: formData.departureDate,
    origin: formData.origin,
    destination: formData.destination,
    onAutoPopulate: (origin, destination) => {
      setFormData(prev => ({ ...prev, origin, destination }));
    },
  });

  useEffect(() => {
    if (settings) {
      setDefaultSettings(settings);
    } else {
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => setDefaultSettings(data))
        .catch(err => console.error('Failed to load global settings in modal:', err));
    }
  }, [settings, isOpen]);

  useEffect(() => {
    if (isOpen) {
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

        setFormData({
          searchMode: initialFlight.searchMode || 'Route',
          trackingGoal: isBooked ? 'booked' : 'watching',
          origin: initialFlight.origin || '',
          destination: initialFlight.destination || '',
          departureDate: initialFlight.departureDate || '',
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
          pauseTracking: initialFlight.status === 'Paused',
          disableNotifications: initialFlight.disableNotifications === 1,
          earliestDeparture: initialFlight.earliestDeparture || '',
          latestDeparture: initialFlight.latestDeparture || '',
          noRedeye: initialFlight.noRedeye === 1,
          maxStops: (initialFlight.maxStops !== null && initialFlight.maxStops !== undefined) ? initialFlight.maxStops : null,
          priceTrackingDirection: initialFlight.priceTrackingDirection || 'drop',
          minIncreaseDollar: (initialFlight.minIncreaseDollar !== null && initialFlight.minIncreaseDollar !== undefined) ? String(initialFlight.minIncreaseDollar) : '',
          minIncreasePercent: (initialFlight.minIncreasePercent !== null && initialFlight.minIncreasePercent !== undefined) ? String(initialFlight.minIncreasePercent) : '',
        });
      } else {
        setFormData({
          ...DEFAULT_STATE,
          currency: defaultSettings?.currency || 'USD',
        });
      }
      setError(null);
    }
  }, [isOpen, initialFlight, defaultSettings?.currency]);

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData(DEFAULT_STATE);
    resetLookupState();
    setError(null);
    setLookupFailed(false);
    onClose();
  };

  const handleCurrencyChange = (newCurrency: string) => {
    const isPoints = pointsList.includes(newCurrency);
    setFormData(prev => ({
      ...prev,
      currency: newCurrency,
      pauseTracking: isPoints ? true : prev.pauseTracking,
    }));
  };

  const handleFieldChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    if (lookupFailed) setLookupFailed(false);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLookupFailed(false);

    if (!initialFlight && !dsStatus.available && formData.trackingGoal === 'watching' && !isPointsFlight) {
      setError(dsStatus.reason || 'No active data sources available. Please visit Settings.');
      return;
    }

    const todayStr = getTodayDateString(defaultSettings?.timezone);
    if (formData.departureDate < todayStr) {
      setError('Departure date cannot be in the past. Please select today or a future date.');
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

    if (formData.trackingGoal === 'booked' && !formData.flightNumber.trim()) {
      setError('Flight number is required for already booked flights.');
      return;
    }

    const parsedPurchase = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
    let parsedBaseline = formData.baselinePrice ? parseFloat(formData.baselinePrice) : null;

    // If booked and baseline not explicitly typed, sync baseline with purchase price
    if (!parsedBaseline && parsedPurchase) {
      parsedBaseline = parsedPurchase;
    }

    const effectiveSearchMode: SearchMode =
      formData.flightNumber && formData.flightNumber.trim() ? 'FlightNumber' : formData.searchMode;

    const payload = {
      searchMode: effectiveSearchMode,
      origin: formData.origin.trim().toUpperCase(),
      destination: formData.destination.trim().toUpperCase(),
      airline: formData.airline ? formData.airline.trim().toUpperCase() : '',
      flightNumber: formData.flightNumber && formData.flightNumber.trim() ? formData.flightNumber.trim() : null,
      includedAirlines: formData.includedAirlines ? formData.includedAirlines.trim().toUpperCase() : null,
      excludedAirlines: formData.excludedAirlines ? formData.excludedAirlines.trim().toUpperCase() : null,
      departureDate: formData.departureDate,
      fareTier: formData.fareTier,
      cabinClass: formData.cabinClass,
      baselinePrice: parsedBaseline,
      purchasePrice: parsedPurchase,
      currency: formData.currency || defaultSettings?.currency || 'USD',
      minDropDollar: formData.minDropDollar ? parseFloat(formData.minDropDollar) : null,
      minDropPercent: formData.minDropPercent ? parseFloat(formData.minDropPercent) : null,
      pnr: formData.pnr ? formData.pnr.trim().toUpperCase() : null,
      notes: formData.notes ? formData.notes.trim() : null,
      status: formData.pauseTracking ? 'Paused' : 'Upcoming',
      disableNotifications: formData.disableNotifications ? 1 : 0,
      scheduleOverride,
      earliestDeparture: formData.earliestDeparture ? formData.earliestDeparture.trim() : null,
      latestDeparture: formData.latestDeparture ? formData.latestDeparture.trim() : null,
      noRedeye: formData.noRedeye ? 1 : 0,
      maxStops: formData.maxStops !== null && formData.maxStops !== undefined ? formData.maxStops : null,
      priceTrackingDirection: formData.trackingGoal === 'booked' ? 'drop' : formData.priceTrackingDirection,
      minIncreaseDollar: formData.minIncreaseDollar ? parseFloat(formData.minIncreaseDollar) : null,
      minIncreasePercent: formData.minIncreasePercent ? parseFloat(formData.minIncreasePercent) : null,
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

      setFormData(DEFAULT_STATE);
      setLookupFailed(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6 transition-colors">
      <div className="bg-gunmetal-card rounded-xl shadow-2xl w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[92vh] overflow-y-auto border border-gunmetal-border flex flex-col">
        <div className="px-6 py-4 border-b border-gunmetal-border flex justify-between items-center sticky top-0 bg-gunmetal-card z-10">
          <h2 className="text-xl font-bold text-slate-100">
            {initialFlight ? 'Edit Tracked Flight' : 'Track New Flight'}
          </h2>
          <button 
            type="button" 
            onClick={handleClose} 
            className="p-1.5 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 p-3 rounded-md text-sm font-medium space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Price Lookup Failed</span>
              </div>
              <p className="text-xs text-red-300/90 leading-relaxed">{error}</p>
            </div>
          )}

          {!initialFlight && !dsStatus.available && (
            <div className="bg-amber-950/30 border border-amber-800/60 p-3 rounded-md text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-100 block mb-0.5">Automated Search Unavailable</span>
                {dsStatus.reason}
              </div>
            </div>
          )}

          {/* Search Mode Selection (Hidden when booked or when editing existing flight) */}
          {initialFlight ? (
            <div className="flex items-center p-3 rounded-lg border border-gunmetal-border bg-gunmetal-canvas/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>
                  Tracking Mode: {formData.searchMode === 'FlightNumber' ? 'Specific Flight Number' : 'Route (Origin to Destination)'}
                </span>
              </div>
            </div>
          ) : formData.trackingGoal === 'booked' ? null : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, searchMode: 'Route' })}
                className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  formData.searchMode === 'Route'
                    ? 'border-slate-400 bg-slate-800/60 text-slate-100 shadow-sm'
                    : 'border-gunmetal-border bg-gunmetal-canvas/40 text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <PlaneTakeoff className="w-5 h-5 flex-shrink-0 text-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Route (To & From)</p>
                  <p className="text-xs text-gunmetal-muted">Monitor route for lowest fare</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, searchMode: 'FlightNumber' })}
                className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  formData.searchMode === 'FlightNumber'
                    ? 'border-slate-400 bg-slate-800/60 text-slate-100 shadow-sm'
                    : 'border-gunmetal-border bg-gunmetal-canvas/40 text-gunmetal-muted hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <Compass className="w-5 h-5 flex-shrink-0 text-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">Specific Flight</p>
                  <p className="text-xs text-gunmetal-muted">Track by flight number</p>
                </div>
              </button>
            </div>
          )}

          {/* Tracking Goal Differentiation */}
          <TrackingGoalSection
            trackingGoal={formData.trackingGoal}
            purchasePrice={formData.purchasePrice}
            baselinePrice={formData.baselinePrice}
            departureDate={formData.departureDate}
            currency={formData.currency || defaultSettings?.currency || 'USD'}
            pointsCurrencies={pointsList}
            fiatCurrency={defaultSettings?.currency || 'USD'}
            minDepartureDate={getTodayDateString(defaultSettings?.timezone)}
            onGoalChange={goal => setFormData(prev => ({ ...prev, trackingGoal: goal, searchMode: goal === 'booked' ? 'FlightNumber' : prev.searchMode }))}
            onPurchaseChange={val => setFormData({ ...formData, purchasePrice: val })}
            onBaselinePriceChange={val => setFormData({ ...formData, baselinePrice: val })}
            onCurrencyChange={handleCurrencyChange}
            onDepartureDateChange={val => {
              const today = getTodayDateString(defaultSettings?.timezone);
              if (val && val < today) {
                setError('Departure date cannot be in the past. Please select today or a future date.');
              } else if (error && error.includes('in the past')) {
                setError(null);
              }
              setFormData(prev => ({ ...prev, departureDate: val }));
            }}
          />

          {/* Flight Number Inputs (Presented in FlightNumber Mode or when Already Booked) */}
          {(formData.searchMode === 'FlightNumber' || formData.trackingGoal === 'booked') && (
            <div className="space-y-3">
              <div className={`grid ${formData.trackingGoal === 'watching' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'} gap-4`}>
                {formData.trackingGoal === 'watching' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Departure Date
                    </label>
                    <input
                      required
                      type="date"
                      min={getTodayDateString(defaultSettings?.timezone)}
                      value={formData.departureDate}
                      onChange={e => {
                        const selected = e.target.value;
                        const today = getTodayDateString(defaultSettings?.timezone);
                        if (selected && selected < today) {
                          setError('Departure date cannot be in the past. Please select today or a future date.');
                        } else if (error && error.includes('in the past')) {
                          setError(null);
                        }
                        setFormData(prev => ({ ...prev, departureDate: selected }));
                      }}
                      className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Carrier Code {formData.trackingGoal === 'booked' && '*'}
                  </label>
                  <input
                    required={formData.searchMode === 'FlightNumber' || formData.trackingGoal === 'booked'}
                    placeholder="e.g. AS, AA, or Delta"
                    maxLength={15}
                    value={formData.airline}
                    onChange={e => setFormData({ ...formData, airline: e.target.value.toUpperCase() })}
                    onBlur={e => {
                      const val = e.target.value.trim();
                      if (val) {
                        const normalized = normalizeAirlineCode(val);
                        if (normalized && normalized !== 'UN') {
                          setFormData(prev => ({ ...prev, airline: normalized }));
                        }
                      }
                    }}
                    className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Flight Number *
                    </label>
                    {routeLookupLoading && (
                      <span className="flex items-center gap-1 text-[11px] text-sky-400 font-normal">
                        <Loader2 className="w-3 h-3 animate-spin" /> Detecting route...
                      </span>
                    )}
                  </div>
                  <input
                    required
                    pattern="\d+"
                    placeholder="e.g. 6 or 523"
                    value={formData.flightNumber}
                    onChange={e => setFormData({ ...formData, flightNumber: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
              </div>

              {/* User Guidance Alerts */}
              {routeAlert === 'confirmed' && detectedRoute && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-950/30 border border-green-800/50 text-xs text-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-green-200">Route Auto-Detected: </span>
                    Confirmed <span className="font-bold underline text-white">{detectedRoute.origin} → {detectedRoute.destination}</span> for {formData.airline} {formData.flightNumber}
                    {detectedRoute.airlineName ? ` (${detectedRoute.airlineName})` : ''}.
                  </div>
                </div>
              )}

              {routeAlert === 'mismatch' && detectedRoute && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-200">Route Mismatch Warning: </span>
                      {formData.airline} {formData.flightNumber} schedule operates{' '}
                      <span className="font-bold underline text-white">{detectedRoute.origin} → {detectedRoute.destination}</span>, but you entered{' '}
                      <span className="font-bold text-slate-200">{formData.origin || '___'} → {formData.destination || '___'}</span>.
                      <span className="block text-[11px] text-amber-400/80 mt-0.5">
                        You may retain your entered airports if monitoring a seasonal, charter, or multi-leg flight.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={adoptDetectedRoute}
                    className="flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold bg-amber-900/50 hover:bg-amber-800/60 text-amber-100 border border-amber-700/60 rounded transition-colors whitespace-nowrap self-end sm:self-center"
                  >
                    Use {detectedRoute.origin} → {detectedRoute.destination}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Origin and Destination (Required and Editable for All Modes) */}
          <div className={`grid ${formData.searchMode === 'Route' && formData.trackingGoal !== 'booked' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'} gap-4`}>
            {formData.searchMode === 'Route' && formData.trackingGoal !== 'booked' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Departure Date
                </label>
                <input
                  required
                  type="date"
                  min={getTodayDateString(defaultSettings?.timezone)}
                  value={formData.departureDate}
                  onChange={e => {
                    const selected = e.target.value;
                    const today = getTodayDateString(defaultSettings?.timezone);
                    if (selected && selected < today) {
                      setError('Departure date cannot be in the past. Please select today or a future date.');
                    } else if (error && error.includes('in the past')) {
                      setError(null);
                    }
                    setFormData(prev => ({ ...prev, departureDate: selected }));
                  }}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Origin Airport (IATA)
              </label>
              <input
                required
                maxLength={30}
                placeholder="e.g. DCA, WAS, or DFW, DAL"
                value={formData.origin}
                onChange={e => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
              {(() => {
                const info = getCoLocationInfo(formData.origin);
                if (!info) return null;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1 text-[11px]">
                    <span className="text-gunmetal-muted font-sans">{info.description}</span>
                    {info.suggestedCode && info.suggestedActionLabel && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, origin: info.suggestedCode! }))}
                        className="text-sky-400 hover:text-sky-300 font-semibold underline transition-colors"
                      >
                        {info.suggestedActionLabel} &rarr;
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Destination Airport (IATA)
              </label>
              <input
                required
                maxLength={30}
                placeholder="e.g. LAS or DFW, DAL"
                value={formData.destination}
                onChange={e => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
              {(() => {
                const info = getCoLocationInfo(formData.destination);
                if (!info) return null;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mt-1 text-[11px]">
                    <span className="text-gunmetal-muted font-sans">{info.description}</span>
                    {info.suggestedCode && info.suggestedActionLabel && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, destination: info.suggestedCode! }))}
                        className="text-sky-400 hover:text-sky-300 font-semibold underline transition-colors"
                      >
                        {info.suggestedActionLabel} &rarr;
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Route Mode Airline Inclusions & Exclusions */}
          {formData.searchMode === 'Route' && formData.trackingGoal !== 'booked' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Airline Inclusions (Optional)
                </label>
                <AirlineTagInput
                  value={formData.includedAirlines}
                  onChange={val => handleFieldChange({ includedAirlines: val })}
                  placeholder="e.g. DL, AA (type & press space or comma)"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Airline Exclusions (Optional)
                </label>
                <AirlineTagInput
                  value={formData.excludedAirlines}
                  onChange={val => handleFieldChange({ excludedAirlines: val })}
                  placeholder="e.g. NK, F9 (type & press space or comma)"
                />
              </div>
            </div>
          )}

          {/* Flight Parameters Row: Fare Restrictions & Cabin Class (Plus PNR for Booked) */}
          <div className={`grid ${formData.trackingGoal === 'booked' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
            {formData.trackingGoal === 'booked' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  PNR / Confirmation Code
                </label>
                <input
                  maxLength={10}
                  placeholder="e.g. K9XZ4B"
                  value={formData.pnr}
                  onChange={e => setFormData({ ...formData, pnr: e.target.value.toUpperCase() })}
                  className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Fare Restrictions
              </label>
              <select
                value={formData.fareTier}
                onChange={e => setFormData({ ...formData, fareTier: e.target.value as FareTier })}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none"
              >
                <option value="Standard">Standard (No Basic)</option>
                <option value="Basic Economy">Basic / Unbundled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Cabin Class
              </label>
              <select
                value={formData.cabinClass}
                onChange={e => setFormData({ ...formData, cabinClass: e.target.value as CabinClass })}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none"
              >
                <option value="economy">Economy</option>
                <option value="premium_economy">Premium Economy</option>
                <option value="business">Business</option>
                <option value="first">First Class</option>
              </select>
            </div>
          </div>

          {/* Search Preferences: Stops, Time of Day, and No Redeye (Only for unbooked watching flights) */}
          {formData.trackingGoal !== 'booked' && (
            <SearchPreferencesSection
              earliestDeparture={formData.earliestDeparture}
              latestDeparture={formData.latestDeparture}
              noRedeye={formData.noRedeye}
              maxStops={formData.maxStops}
              onEarliestChange={val => setFormData({ ...formData, earliestDeparture: val })}
              onLatestChange={val => setFormData({ ...formData, latestDeparture: val })}
              onNoRedeyeChange={val => setFormData({ ...formData, noRedeye: val })}
              onMaxStopsChange={val => setFormData({ ...formData, maxStops: val })}
            />
          )}

          {/* Alert Thresholds and Mute/Pause Toggles */}
          <AlertThresholdsSection
            minDropDollar={formData.minDropDollar}
            minDropPercent={formData.minDropPercent}
            priceTrackingDirection={formData.priceTrackingDirection}
            minIncreaseDollar={formData.minIncreaseDollar}
            minIncreasePercent={formData.minIncreasePercent}
            isBooked={formData.trackingGoal === 'booked'}
            isPoints={isPointsFlight}
            pauseTracking={formData.pauseTracking}
            disableNotifications={formData.disableNotifications}
            defaultSettings={defaultSettings}
            currentPrice={initialFlight?.currentPrice || (formData.purchasePrice ? parseFloat(formData.purchasePrice) : null)}
            onDollarChange={val => setFormData({ ...formData, minDropDollar: val })}
            onPercentChange={val => setFormData({ ...formData, minDropPercent: val })}
            onDirectionChange={dir => setFormData({ ...formData, priceTrackingDirection: dir })}
            onIncreaseDollarChange={val => setFormData({ ...formData, minIncreaseDollar: val })}
            onIncreasePercentChange={val => setFormData({ ...formData, minIncreasePercent: val })}
            onPauseChange={val => setFormData({ ...formData, pauseTracking: val })}
            onDisableNotificationsChange={val => setFormData({ ...formData, disableNotifications: val })}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-2.5 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              placeholder="e.g. Wedding trip, checked bags included..."
            />
          </div>

          {/* Schedule Cadence Overrides */}
          <CadenceOverridesSection
            overrideFarOut={formData.overrideFarOut}
            overrideStandard={formData.overrideStandard}
            overrideFinalStretch={formData.overrideFinalStretch}
            defaultSettings={defaultSettings}
            onFarOutChange={val => setFormData({ ...formData, overrideFarOut: val })}
            onStandardChange={val => setFormData({ ...formData, overrideStandard: val })}
            onFinalStretchChange={val => setFormData({ ...formData, overrideFinalStretch: val })}
          />

          <div className="pt-4 border-t border-gunmetal-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-sky-400 flex items-center gap-1.5 font-medium">
              {loading && !initialFlight && (
                <span className="flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  Querying data sources for live initial fare...
                </span>
              )}
            </div>

            <div className="flex justify-end gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-gunmetal-canvas border border-gunmetal-border hover:bg-gunmetal-border rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || lookupFailed || (!initialFlight && !dsStatus.available && formData.trackingGoal === 'watching')}
                title={
                  lookupFailed
                    ? 'Lookup failed across all data sources. Adjust route/date inputs to try again.'
                    : !dsStatus.available
                    ? dsStatus.reason
                    : initialFlight ? 'Update Flight' : 'Track Flight'
                }
                className={`px-5 py-2 text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 ${
                  loading || lookupFailed || (!initialFlight && !dsStatus.available && formData.trackingGoal === 'watching')
                    ? 'bg-gunmetal-card border border-gunmetal-border text-gunmetal-muted opacity-50 cursor-not-allowed'
                    : 'bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400'
                }`}
              >
                {loading ? (
                  !initialFlight ? 'Querying Fares & Saving...' : 'Saving Flight...'
                ) : lookupFailed ? (
                  'Lookup Failed (Modify Inputs)'
                ) : initialFlight ? (
                  'Update Flight'
                ) : (
                  'Track Flight'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}