'use client';

import { useFlightModalState } from './flightModal/useFlightModalState';
import ModalHeader from './flightModal/ModalHeader';
import TrackingModeSelector from './flightModal/TrackingModeSelector';
import FlightIdentitySection from './flightModal/FlightIdentitySection';
import BookingDetailsSection from './flightModal/BookingDetailsSection';
import RouteSection from './flightModal/RouteSection';
import DualRouteSection from './flightModal/DualRouteSection';
import PricingAndAlertsSection from './flightModal/PricingAndAlertsSection';
import SearchPreferencesSection from './flightModal/SearchPreferencesSection';
import CadenceOverridesSection from './flightModal/CadenceOverridesSection';
import UnsavedChangesPrompt from './flightModal/UnsavedChangesPrompt';
import { Flight, Settings, FareTier, CabinClass } from '@/types';
import { getTodayDateString } from '@/utils/date';
import { AlertTriangle, ChevronDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialFlight?: Flight | null;
  settings?: Settings | null;
}

export default function FlightModal({
  isOpen,
  onClose,
  onSuccess,
  initialFlight,
  settings,
}: Props) {
  const {
    formData,
    defaultSettings,
    pointsList,
    isPointsFlight,
    dsStatus,
    loading,
    lookupFailed,
    error,
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
  } = useFlightModalState({
    isOpen,
    onClose,
    onSuccess,
    initialFlight,
    settings,
  });

  if (!isOpen) return null;

  const todayStr = getTodayDateString(defaultSettings?.timezone);
  const isBooked = formData.trackingType === 'flight_booked';
  const isRouteWatch = formData.trackingType === 'route_watch';
  const isFlightMode = formData.trackingType === 'flight_watch' || isBooked;
  const isAutomatedSubmissionBlocked = !initialFlight && !dsStatus.available && !isPointsFlight && !formData.isManual;
  const isPurchasePriceLocked = Boolean(
    initialFlight &&
    (initialFlight.status === 'Booked' ||
      (initialFlight.purchasePrice !== null && initialFlight.purchasePrice !== undefined && initialFlight.purchasePrice > 0))
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 md:p-6 transition-all"
    >
      <div className="bg-gunmetal-card w-full h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl shadow-2xl border border-gunmetal-border flex flex-col overflow-hidden sm:max-w-4xl lg:max-w-5xl">
        {/* Sticky Header */}
        <ModalHeader
          initialFlight={initialFlight}
          trackingType={formData.trackingType}
          onCloseRequest={handleCloseRequest}
        />

        {/* Scrollable Form Body */}
        <form id="flight-modal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 p-3.5 rounded-xl text-xs font-medium space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>Price Lookup / Validation Notice</span>
              </div>
              <p className="text-red-300/90 leading-relaxed pl-6">{error}</p>
            </div>
          )}

          {isAutomatedSubmissionBlocked && (
            <div className="bg-amber-950/30 border border-amber-800/60 p-3.5 rounded-xl text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-100 block mb-0.5">Automated Tracking Unavailable</span>
                  <span>
                    {dsStatus.reason} Select <strong>Manual Tracking Mode</strong> or <strong>Points / Miles</strong> below to add this flight manually, or activate a data source in Settings.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleFieldChange({
                    isManual: true,
                    pauseTracking: true,
                    showRouteDetails: isFlightMode ? true : formData.showRouteDetails,
                  })
                }
                className="self-start sm:self-center flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800/70 border border-amber-600/70 text-amber-100 font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Use Manual Mode
              </button>
            </div>
          )}

          {/* 1. Tracking Mode & Payment Type Selector */}
          <TrackingModeSelector
            trackingType={formData.trackingType}
            paymentType={formData.paymentType}
            isManual={formData.isManual}
            currency={formData.currency || defaultSettings?.currency || 'USD'}
            fiatCurrency={defaultSettings?.currency || 'USD'}
            pointsCurrencies={pointsList}
            isInitialFlight={Boolean(initialFlight)}
            automatedUnavailable={!initialFlight && !dsStatus.available}
            onTrackingTypeChange={handleTrackingTypeChange}
            onPaymentTypeChange={handlePaymentTypeChange}
            onCurrencyChange={handleCurrencyChange}
            onManualChange={val =>
              handleFieldChange({
                isManual: val,
                pauseTracking: val ? true : formData.pauseTracking,
                showRouteDetails: val && isFlightMode ? true : formData.showRouteDetails,
              })
            }
          />

          {/* 2. Flight Details (Carrier & Flight #) for Flight Watch & Booked */}
          {isFlightMode && (
            <FlightIdentitySection
              airline={formData.airline}
              flightNumber={formData.flightNumber}
              departureDate={formData.departureDate}
              minDepartureDate={todayStr}
              showRouteDetails={formData.showRouteDetails}
              routeLookupLoading={routeLookupLoading}
              routeAlert={routeAlert}
              detectedRoute={detectedRoute}
              currentOrigin={formData.origin}
              currentDestination={formData.destination}
              isBooked={isBooked}
              onAirlineChange={val => handleFieldChange({ airline: val })}
              onFlightNumberChange={val => handleFieldChange({ flightNumber: val })}
              onDepartureDateChange={val => handleFieldChange({ departureDate: val })}
              onShowRouteDetailsChange={val => handleFieldChange({ showRouteDetails: val })}
              onAdoptRoute={adoptDetectedRoute}
            />
          )}

          {/* 3. Booking Details (Amount Paid, Booking Date, PNR) for Booked Flight */}
          {isBooked && (
            <BookingDetailsSection
              purchasePrice={formData.purchasePrice}
              bookingDate={formData.bookingDate}
              maxBookingDate={todayStr}
              pnr={formData.pnr}
              paymentType={formData.paymentType}
              currency={formData.currency || defaultSettings?.currency || 'USD'}
              isPurchasePriceLocked={isPurchasePriceLocked}
              onPurchasePriceChange={val => handleFieldChange({ purchasePrice: val })}
              onBookingDateChange={val => handleFieldChange({ bookingDate: val })}
              onPnrChange={val => handleFieldChange({ pnr: val })}
            />
          )}

          {/* 4. Route & Airport Parameters (Origin/Destination) */}
          <RouteSection
            trackingType={formData.trackingType}
            showRouteDetails={formData.showRouteDetails}
            origin={formData.origin}
            destination={formData.destination}
            departureDate={formData.departureDate}
            minDepartureDate={todayStr}
            includedAirlines={formData.includedAirlines}
            excludedAirlines={formData.excludedAirlines}
            onOriginChange={val => handleFieldChange({ origin: val })}
            onDestinationChange={val => handleFieldChange({ destination: val })}
            onDepartureDateChange={val => handleFieldChange({ departureDate: val })}
            onIncludedAirlinesChange={val => handleFieldChange({ includedAirlines: val })}
            onExcludedAirlinesChange={val => handleFieldChange({ excludedAirlines: val })}
          />

          {/* 4b. Dual Route Monitoring (Always accessible for Flight Watch and Booked Flights) */}
          {isFlightMode && (
            <DualRouteSection
              origin={formData.origin || detectedRoute?.origin || ''}
              destination={formData.destination || detectedRoute?.destination || ''}
              airline={formData.airline}
              flightNumber={formData.flightNumber}
              includedAirlines={formData.includedAirlines}
              excludedAirlines={formData.excludedAirlines}
              monitorRouteAlternatives={formData.monitorRouteAlternatives}
              physicalOrigin={detectedRoute?.origin || (initialFlight?.airline && initialFlight?.flightNumber ? initialFlight.origin : null)}
              physicalDestination={detectedRoute?.destination || (initialFlight?.airline && initialFlight?.flightNumber ? initialFlight.destination : null)}
              onIncludedAirlinesChange={val => handleFieldChange({ includedAirlines: val })}
              onExcludedAirlinesChange={val => handleFieldChange({ excludedAirlines: val })}
              onToggleRouteAlternatives={handleToggleRouteAlternatives}
              onScopeChange={updates => handleFieldChange(updates)}
            />
          )}

          {/* 5. Cabin Class & Fare Tier Row */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block">
              Cabin Class & Fare Restrictions
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Fare Restrictions
                </label>
                <div className="relative">
                  <select
                    value={formData.fareTier}
                    onChange={e => handleFieldChange({ fareTier: e.target.value as FareTier })}
                    className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
                  >
                    <option value="Standard">Standard (No Basic)</option>
                    <option value="Basic Economy">Basic / Unbundled</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Cabin Class
                </label>
                <div className="relative">
                  <select
                    value={formData.cabinClass}
                    onChange={e => handleFieldChange({ cabinClass: e.target.value as CabinClass })}
                    className="w-full h-10 appearance-none border border-gunmetal-border px-3 py-2 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer"
                  >
                    <option value="economy">Economy</option>
                    <option value="premium_economy">Premium Economy</option>
                    <option value="business">Business</option>
                    <option value="first">First Class</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* 6. Search Preferences (Stops, Time Windows, Redeye, Layovers, Duration) */}
          {(isRouteWatch || formData.monitorRouteAlternatives) && (
            <SearchPreferencesSection
              earliestDeparture={formData.earliestDeparture}
              latestDeparture={formData.latestDeparture}
              noRedeye={formData.noRedeye}
              maxStops={formData.maxStops}
              maxLayoverMinutes={formData.maxLayoverMinutes}
              excludedConnectingAirports={formData.excludedConnectingAirports}
              maxTotalDurationMinutes={formData.maxTotalDurationMinutes}
              onEarliestChange={val => handleFieldChange({ earliestDeparture: val })}
              onLatestChange={val => handleFieldChange({ latestDeparture: val })}
              onNoRedeyeChange={val => handleFieldChange({ noRedeye: val })}
              onMaxStopsChange={val => handleFieldChange({ maxStops: val })}
              onMaxLayoverChange={val => handleFieldChange({ maxLayoverMinutes: val })}
              onExcludedConnectingAirportsChange={val => handleFieldChange({ excludedConnectingAirports: val })}
              onMaxTotalDurationChange={val => handleFieldChange({ maxTotalDurationMinutes: val })}
            />
          )}

          {/* 7. Pricing, Alerts & Thresholds */}
          <PricingAndAlertsSection
            trackingType={formData.trackingType}
            paymentType={formData.paymentType}
            isManual={formData.isManual}
            baselinePrice={formData.baselinePrice}
            minDropDollar={formData.minDropDollar}
            minDropPercent={formData.minDropPercent}
            priceTrackingDirection={formData.priceTrackingDirection}
            minIncreaseDollar={formData.minIncreaseDollar}
            minIncreasePercent={formData.minIncreasePercent}
            pauseTracking={formData.pauseTracking}
            disableNotifications={formData.disableNotifications}
            defaultSettings={defaultSettings}
            currentPrice={initialFlight?.currentPrice || (formData.purchasePrice ? parseFloat(formData.purchasePrice) : null)}
            currency={formData.currency || defaultSettings?.currency || 'USD'}
            onBaselinePriceChange={val => handleFieldChange({ baselinePrice: val })}
            onDollarChange={val => handleFieldChange({ minDropDollar: val })}
            onPercentChange={val => handleFieldChange({ minDropPercent: val })}
            onDirectionChange={dir => handleFieldChange({ priceTrackingDirection: dir })}
            onIncreaseDollarChange={val => handleFieldChange({ minIncreaseDollar: val })}
            onIncreasePercentChange={val => handleFieldChange({ minIncreasePercent: val })}
            onPauseChange={val => handleFieldChange({ pauseTracking: val })}
            onDisableNotificationsChange={val => handleFieldChange({ disableNotifications: val })}
          />

          {/* 8. Notes */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Flight Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => handleFieldChange({ notes: e.target.value })}
              className="w-full p-2.5 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500"
              placeholder="e.g. Vacation with family, includes checked bag allowance..."
            />
          </div>

          {/* 9. Schedule Cadence Overrides */}
          <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5">
            <CadenceOverridesSection
              overrideFarOut={formData.overrideFarOut}
              overrideStandard={formData.overrideStandard}
              overrideFinalStretch={formData.overrideFinalStretch}
              defaultSettings={defaultSettings}
              onFarOutChange={val => handleFieldChange({ overrideFarOut: val })}
              onStandardChange={val => handleFieldChange({ overrideStandard: val })}
              onFinalStretchChange={val => handleFieldChange({ overrideFinalStretch: val })}
            />
          </div>

          </form>

        {/* Solid Footer: Placed outside the scrollable body so content can never bleed through */}
        <div className="bg-gunmetal-card border-t border-gunmetal-border px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 z-20 flex-shrink-0">
          <div className="text-xs flex items-center gap-1.5 font-medium">
            {loading && !initialFlight && !isPointsFlight && !formData.isManual ? (
              <span className="text-sky-400 flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                Querying live fare data...
              </span>
            ) : isAutomatedSubmissionBlocked ? (
              <span className="text-amber-300/90">
                Enable Manual Mode, select Points / Miles, or activate a data source to submit.
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCloseRequest}
              className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-sm font-semibold text-slate-300 bg-gunmetal-canvas border border-gunmetal-border hover:bg-gunmetal-border rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              form="flight-modal-form"
              type="submit"
              disabled={loading || lookupFailed || isAutomatedSubmissionBlocked}
              title={isAutomatedSubmissionBlocked ? 'Enable Manual Tracking Mode, select Points / Miles, or activate a data source in Settings to add a flight.' : undefined}
              className={`flex-1 sm:flex-none min-h-[44px] px-6 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${
                loading || lookupFailed || isAutomatedSubmissionBlocked
                  ? 'bg-gunmetal-card border border-gunmetal-border text-gunmetal-muted opacity-50 cursor-not-allowed'
                  : 'bg-gunmetal-border border border-slate-500 text-slate-100 hover:bg-slate-700 hover:border-slate-400 cursor-pointer'
              }`}
            >
              {loading
                ? 'Saving Flight...'
                : lookupFailed
                ? 'Lookup Failed (Adjust Inputs)'
                : initialFlight
                ? 'Update Flight'
                : 'Track Flight'}
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes In-App Confirmation Prompt */}
      <UnsavedChangesPrompt
        isOpen={showUnsavedPrompt}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </div>
  );
}