'use client';

import { useState, useEffect, useRef } from 'react';
import { X, PlaneTakeoff, Compass, Lock, Tag, ShoppingBag, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { FareTier, CabinClass, SearchMode, Flight, Settings } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFlight?: Flight | null;
}

type TrackingGoal = 'watching' | 'booked';

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
  minDropDollar: '',
  minDropPercent: '',
  notes: '',
  overrideFarOut: '',
  overrideStandard: '',
  overrideFinalStretch: '',
  pauseTracking: false,
  disableNotifications: false,
};

export default function FlightModal({ isOpen, onClose, onSuccess, initialFlight }: Props) {
  const [formData, setFormData] = useState(DEFAULT_STATE);
  const [defaultSettings, setDefaultSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Route auto-detection state
  const [detectedRoute, setDetectedRoute] = useState<{ origin: string; destination: string; airlineName?: string } | null>(null);
  const [routeLookupLoading, setRouteLookupLoading] = useState(false);
  const [routeAlert, setRouteAlert] = useState<'confirmed' | 'mismatch' | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setDefaultSettings(data))
      .catch(err => console.error('Failed to load global settings in modal:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialFlight) {
        let farOut = '';
        let standard = '';
        let finalStretch = '';
        if (initialFlight.scheduleOverride) {
          try {
            const override = JSON.parse(initialFlight.scheduleOverride);
            farOut = override.farOut ? String(override.farOut) : '';
            standard = override.standard ? String(override.standard) : '';
            finalStretch = override.finalStretch ? String(override.finalStretch) : '';
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
          minDropDollar: (initialFlight.minDropDollar !== null && initialFlight.minDropDollar !== undefined) ? String(initialFlight.minDropDollar) : '',
          minDropPercent: (initialFlight.minDropPercent !== null && initialFlight.minDropPercent !== undefined) ? String(initialFlight.minDropPercent) : '',
          notes: initialFlight.notes || '',
          overrideFarOut: farOut,
          overrideStandard: standard,
          overrideFinalStretch: finalStretch,
          pauseTracking: initialFlight.status === 'Paused',
          disableNotifications: initialFlight.disableNotifications === 1,
        });
      } else {
        setFormData(DEFAULT_STATE);
      }
      setError(null);
    }
  }, [isOpen, initialFlight]);

  // Debounced Route Lookup for Flight Number Mode
  useEffect(() => {
    if (!isOpen || formData.searchMode !== 'FlightNumber') {
      setDetectedRoute(null);
      setRouteAlert(null);
      return;
    }

    const airline = formData.airline.trim().toUpperCase();
    const flightNum = formData.flightNumber.trim();

    if (airline.length < 2 || flightNum.length < 1) {
      setDetectedRoute(null);
      setRouteAlert(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    console.log(`[FlightModal] Initiating debounced lookup for Carrier: "${airline}", Flight#: "${flightNum}"`);
    debounceTimerRef.current = setTimeout(async () => {
      setRouteLookupLoading(true);
      try {
        console.log(`[FlightModal] Dispatching POST to /api/flights/lookup-route with:`, { airline, flightNumber: flightNum });
        const res = await fetch('/api/flights/lookup-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ airline, flightNumber: flightNum }),
        });
        console.log(`[FlightModal] HTTP response status: ${res.status}`);
        const data = await res.json();
        console.log(`[FlightModal] Response payload:`, data);

        if (data.success && data.origin && data.destination) {
          const detected = {
            origin: data.origin.toUpperCase(),
            destination: data.destination.toUpperCase(),
            airlineName: data.airlineName,
          };
          setDetectedRoute(detected);
          console.log(`[FlightModal] Route successfully resolved: ${detected.origin} -> ${detected.destination}`);

          // User guidance: Auto-populate if origin and destination are empty
          if (!formData.origin && !formData.destination) {
            console.log(`[FlightModal] Origin and destination are empty. Auto-populating with ${detected.origin} -> ${detected.destination}`);
            setFormData(prev => ({
              ...prev,
              origin: detected.origin,
              destination: detected.destination,
            }));
            setRouteAlert('confirmed');
          } else if (
            formData.origin.toUpperCase() !== detected.origin ||
            formData.destination.toUpperCase() !== detected.destination
          ) {
            // Mismatch warning alert when manually typed pairs differ from lookup
            console.log(`[FlightModal] Route mismatch detected. Entered: ${formData.origin}->${formData.destination}, Detected: ${detected.origin}->${detected.destination}`);
            setRouteAlert('mismatch');
          } else {
            setRouteAlert('confirmed');
          }
        } else {
          console.warn(`[FlightModal] Lookup did not return a valid route:`, data.error || 'Unknown reason');
          setDetectedRoute(null);
          setRouteAlert(null);
        }
      } catch (err) {
        console.error('[FlightModal] Fetch exception during route lookup:', err);
      } finally {
        setRouteLookupLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [formData.airline, formData.flightNumber, formData.searchMode, isOpen]);

  // Sync mismatch alert dynamically if user manually updates origin/destination
  useEffect(() => {
    if (formData.searchMode === 'FlightNumber' && detectedRoute) {
      const currentOrigin = formData.origin.trim().toUpperCase();
      const currentDest = formData.destination.trim().toUpperCase();
      if (currentOrigin && currentDest) {
        if (currentOrigin !== detectedRoute.origin || currentDest !== detectedRoute.destination) {
          setRouteAlert('mismatch');
        } else {
          setRouteAlert('confirmed');
        }
      }
    }
  }, [formData.origin, formData.destination, detectedRoute, formData.searchMode]);

  if (!isOpen) return null;

  const handleClose = () => {
    setFormData(DEFAULT_STATE);
    setDetectedRoute(null);
    setRouteAlert(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const scheduleOverride = (formData.overrideFarOut || formData.overrideStandard || formData.overrideFinalStretch)
      ? JSON.stringify({
          farOut: formData.overrideFarOut ? parseInt(formData.overrideFarOut, 10) : undefined,
          standard: formData.overrideStandard ? parseInt(formData.overrideStandard, 10) : undefined,
          finalStretch: formData.overrideFinalStretch ? parseInt(formData.overrideFinalStretch, 10) : undefined,
        })
      : null;

    const parsedPurchase = formData.purchasePrice ? parseFloat(formData.purchasePrice) : null;
    let parsedBaseline = formData.baselinePrice ? parseFloat(formData.baselinePrice) : null;

    // If booked and baseline not explicitly typed, sync baseline with purchase price
    if (!parsedBaseline && parsedPurchase) {
      parsedBaseline = parsedPurchase;
    }

    const payload = {
      searchMode: formData.searchMode,
      origin: formData.origin.trim().toUpperCase(),
      destination: formData.destination.trim().toUpperCase(),
      airline: formData.airline ? formData.airline.trim().toUpperCase() : '',
      flightNumber: formData.searchMode === 'FlightNumber' && formData.flightNumber ? formData.flightNumber.trim() : null,
      includedAirlines: formData.includedAirlines ? formData.includedAirlines.trim().toUpperCase() : null,
      excludedAirlines: formData.excludedAirlines ? formData.excludedAirlines.trim().toUpperCase() : null,
      departureDate: formData.departureDate,
      fareTier: formData.fareTier,
      cabinClass: formData.cabinClass,
      baselinePrice: parsedBaseline,
      purchasePrice: parsedPurchase,
      minDropDollar: formData.minDropDollar ? parseFloat(formData.minDropDollar) : null,
      minDropPercent: formData.minDropPercent ? parseFloat(formData.minDropPercent) : null,
      pnr: formData.pnr ? formData.pnr.trim().toUpperCase() : null,
      notes: formData.notes ? formData.notes.trim() : null,
      status: formData.pauseTracking ? 'Paused' : 'Active',
      disableNotifications: formData.disableNotifications ? 1 : 0,
      scheduleOverride,
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
        throw new Error(data.error?.message || data.error || 'Failed to save flight');
      }

      setFormData(DEFAULT_STATE);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-colors">
      <div className="bg-gunmetal-card rounded-lg shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gunmetal-border flex flex-col">
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
            <div className="bg-red-950/40 border border-red-800 text-red-300 p-3 rounded-md text-sm font-medium">
              {error}
            </div>
          )}

          {/* Search Mode Selection (Hidden & Locked when editing existing flight) */}
          {initialFlight ? (
            <div className="flex items-center p-3 rounded-lg border border-gunmetal-border bg-gunmetal-canvas/40">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>
                  Tracking Mode: {formData.searchMode === 'FlightNumber' ? 'Specific Flight Number' : 'Route (Origin to Destination)'}
                </span>
              </div>
            </div>
          ) : (
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
          <div className="border border-gunmetal-border rounded-lg p-3 bg-gunmetal-canvas/30 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Tracking Goal
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, trackingGoal: 'watching' })}
                className={`flex items-center justify-center gap-2 p-2 rounded-md text-xs font-semibold transition-colors border ${
                  formData.trackingGoal === 'watching'
                    ? 'bg-gunmetal-border border-slate-400 text-slate-100 shadow-sm'
                    : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Planning to Book (Watching)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, trackingGoal: 'booked' })}
                className={`flex items-center justify-center gap-2 p-2 rounded-md text-xs font-semibold transition-colors border ${
                  formData.trackingGoal === 'booked'
                    ? 'bg-gunmetal-border border-slate-400 text-slate-100 shadow-sm'
                    : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Already Booked (Drop Alerts)</span>
              </button>
            </div>

            {formData.trackingGoal === 'watching' ? (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Initial Baseline Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="Leave blank to auto-detect from live fare on save"
                  value={formData.baselinePrice}
                  onChange={e => setFormData({ ...formData, baselinePrice: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
                <p className="text-[11px] text-gunmetal-muted mt-1">
                  Alerts trigger when the live price drops below this initial tracked fare.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    Purchase Price ($ Paid)
                  </label>
                  <input
                    required={formData.trackingGoal === 'booked'}
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 349.00"
                    value={formData.purchasePrice}
                    onChange={e => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                  />
                  <p className="text-[11px] text-gunmetal-muted mt-1">
                    Alerts trigger when fares drop below what you paid.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    PNR / Confirmation Code
                  </label>
                  <input
                    maxLength={8}
                    placeholder="e.g. K9XZ4B"
                    value={formData.pnr}
                    onChange={e => setFormData({ ...formData, pnr: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                  />
                  <p className="text-[11px] text-gunmetal-muted mt-1">
                    Airline booking confirmation reference.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Flight Number Inputs (Presented First in FlightNumber Mode to Feed Detection) */}
          {formData.searchMode === 'FlightNumber' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Carrier Code
                  </label>
                  <input
                    required
                    placeholder="e.g. AS or AA"
                    maxLength={3}
                    value={formData.airline}
                    onChange={e => setFormData({ ...formData, airline: e.target.value.toUpperCase() })}
                    className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Flight Number
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
                    placeholder="e.g. 6 or 1"
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
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        origin: detectedRoute.origin,
                        destination: detectedRoute.destination,
                      }));
                      setRouteAlert('confirmed');
                    }}
                    className="flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold bg-amber-900/50 hover:bg-amber-800/60 text-amber-100 border border-amber-700/60 rounded transition-colors whitespace-nowrap self-end sm:self-center"
                  >
                    Use {detectedRoute.origin} → {detectedRoute.destination}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Origin and Destination (Required and Editable for All Modes) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Origin Airport (IATA)
              </label>
              <input
                required
                maxLength={3}
                placeholder="DCA"
                value={formData.origin}
                onChange={e => setFormData({ ...formData, origin: e.target.value.toUpperCase() })}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Destination Airport (IATA)
              </label>
              <input
                required
                maxLength={3}
                placeholder="LAS"
                value={formData.destination}
                onChange={e => setFormData({ ...formData, destination: e.target.value.toUpperCase() })}
                className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
              />
            </div>
          </div>

          {/* Route Mode Airline Inclusions & Exclusions */}
          {formData.searchMode === 'Route' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Airline Inclusions (Optional)
                </label>
                <input
                  placeholder="DL, AA"
                  value={formData.includedAirlines}
                  onChange={e => setFormData({ ...formData, includedAirlines: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Airline Exclusions (Optional)
                </label>
                <input
                  placeholder="NK, F9"
                  value={formData.excludedAirlines}
                  onChange={e => setFormData({ ...formData, excludedAirlines: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Departure Date on its own row */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Departure Date
            </label>
            <input
              required
              type="date"
              value={formData.departureDate}
              onChange={e => setFormData({ ...formData, departureDate: e.target.value })}
              className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
            />
          </div>

          {/* Dedicated Row: Fare Restrictions & Cabin Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Fare Restrictions
              </label>
              <select
                value={formData.fareTier}
                onChange={e => setFormData({ ...formData, fareTier: e.target.value as FareTier })}
                className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none"
              >
                <option value="Standard">Standard Fare (Exclude Basic)</option>
                <option value="Basic Economy">Basic Economy (Restricted)</option>
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

          {/* Per-Flight Alert Threshold Overrides */}
          <div className="border border-gunmetal-border rounded-lg p-3 bg-gunmetal-canvas/30 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Price Drop Alert Thresholds (Optional Overrides)
            </h3>
            <p className="text-[11px] text-gunmetal-muted">
              Leave blank to inherit global defaults from Settings. Specify a custom amount or percentage if you only want alerts above specific thresholds for this flight.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Min $ Drop to Alert
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gunmetal-muted text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={defaultSettings?.minDropDollar != null ? String(defaultSettings.minDropDollar) : '15'}
                    value={formData.minDropDollar}
                    onChange={e => setFormData({ ...formData, minDropDollar: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Min % Drop to Alert
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gunmetal-muted text-xs">%</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder={defaultSettings?.minDropPercent != null ? String(defaultSettings.minDropPercent) : '5'}
                    value={formData.minDropPercent}
                    onChange={e => setFormData({ ...formData, minDropPercent: e.target.value })}
                    className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                  />
                </div>
              </div>
            </div>
          </div>

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

          {/* Tracking & Alert Control Toggles with Explicit Verbiage */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 text-sm font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pauseTracking}
                onChange={e => setFormData({ ...formData, pauseTracking: e.target.checked })}
                className="w-4 h-4 mt-0.5 accent-slate-500 rounded"
              />
              <div>
                <span>Pause price checks</span>
                <span className="block text-xs text-gunmetal-muted">Stops all automated API polling for this flight.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 text-sm font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.disableNotifications}
                onChange={e => setFormData({ ...formData, disableNotifications: e.target.checked })}
                className="w-4 h-4 mt-0.5 accent-slate-500 rounded"
              />
              <div>
                <span>Mute notifications</span>
                <span className="block text-xs text-gunmetal-muted">Continue checking and recording prices in history, but do not dispatch alerts.</span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-gunmetal-border pb-1.5 mb-2.5">
              Schedule Cadence Overrides (Leave blank for global settings)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gunmetal-muted mb-1">Far Out (&gt;90d hrs)</label>
                <input
                  type="number"
                  placeholder={defaultSettings?.scheduleFarOut != null ? String(defaultSettings.scheduleFarOut) : '48'}
                  value={formData.overrideFarOut}
                  onChange={e => setFormData({ ...formData, overrideFarOut: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal-muted mb-1">Standard (14-90d hrs)</label>
                <input
                  type="number"
                  placeholder={defaultSettings?.scheduleStandard != null ? String(defaultSettings.scheduleStandard) : '24'}
                  value={formData.overrideStandard}
                  onChange={e => setFormData({ ...formData, overrideStandard: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gunmetal-muted mb-1">Final Stretch (&lt;14d hrs)</label>
                <input
                  type="number"
                  placeholder={defaultSettings?.scheduleFinalStretch != null ? String(defaultSettings.scheduleFinalStretch) : '12'}
                  value={formData.overrideFinalStretch}
                  onChange={e => setFormData({ ...formData, overrideFinalStretch: e.target.value })}
                  className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gunmetal-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-sky-400 flex items-center gap-1.5 font-medium">
              {loading && !formData.baselinePrice && (
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
                disabled={loading}
                className="px-5 py-2 text-sm font-medium bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400 rounded-md disabled:opacity-50 shadow-sm transition-colors flex items-center gap-2"
              >
                {loading ? (
                  !formData.baselinePrice ? 'Querying Fares & Saving...' : 'Saving Flight...'
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