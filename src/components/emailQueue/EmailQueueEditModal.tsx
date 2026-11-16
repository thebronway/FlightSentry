'use client';

import { useEffect, useState, FormEvent } from 'react';
import { X, Pencil, Check, AlertCircle } from 'lucide-react';
import { CabinClass, EmailQueueEventType, EmailQueueItem, FareTier } from '@/types';
import SettingsModalPortal from '../settings/shared/SettingsModalPortal';
import SettingsSelect from '../settings/shared/SettingsSelect';
import { ActiveFlightSummary } from './EmailQueueItemCard';

interface Props {
  isOpen: boolean;
  item: EmailQueueItem | null;
  flights: ActiveFlightSummary[];
  onClose: () => void;
  onApplied: (queueItemId: number) => void;
}

export default function EmailQueueEditModal({
  isOpen,
  item,
  flights,
  onClose,
  onApplied,
}: Props) {
  const [eventType, setEventType] = useState<EmailQueueEventType>('new_booking');
  const [matchedFlightId, setMatchedFlightId] = useState<string>('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [pnr, setPnr] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [cabinClass, setCabinClass] = useState<CabinClass>('economy');
  const [fareTier, setFareTier] = useState<FareTier>('Standard');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    setError(null);
    setEventType(item.eventType);
    setMatchedFlightId(item.matchedFlightId ? String(item.matchedFlightId) : '');
    setOrigin(item.origin || '');
    setDestination(item.destination || '');
    setAirline(item.airline || '');
    setFlightNumber(item.flightNumber || '');
    setDepartureDate(item.departureDate || '');
    setDepartureTime(item.departureTime || '');
    setArrivalTime(item.arrivalTime || '');
    setPnr(item.pnr || '');
    setPrice(item.price !== null && item.price !== undefined ? String(item.price) : '');
    setCurrency(item.currency || 'USD');
    setCabinClass(item.cabinClass || 'economy');
    setFareTier(item.fareTier || 'Standard');
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const parsedPrice = price.trim() !== '' ? Number(price) : null;
      const parsedFlightId = matchedFlightId.trim() !== '' ? Number(matchedFlightId) : null;

      const res = await fetch(`/api/email-queue/${item.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          matchedFlightId: parsedFlightId,
          origin: origin.trim().toUpperCase(),
          destination: destination.trim().toUpperCase(),
          airline: airline.trim().toUpperCase(),
          flightNumber: flightNumber.trim(),
          departureDate: departureDate.trim(),
          departureTime: departureTime.trim(),
          arrivalTime: arrivalTime.trim(),
          pnr: pnr.trim().toUpperCase(),
          price: parsedPrice,
          currency: currency.trim().toUpperCase(),
          cabinClass,
          fareTier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to apply edited email event');
        return;
      }

      onApplied(item.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Network error applying email event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      >
        <div className="bg-gunmetal-card w-full h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl shadow-2xl border border-gunmetal-border flex flex-col overflow-hidden sm:max-w-2xl">
          <div className="px-4 sm:px-6 py-4 border-b border-gunmetal-border flex items-center justify-between bg-gunmetal-nav/80">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-sky-400" />
              <h3 className="text-base font-bold text-slate-100">
                Review &amp; Edit Email Event Before Applying
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close edit modal"
              className="p-2 rounded-lg text-gunmetal-muted hover:text-slate-100 hover:bg-gunmetal-border/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/70 flex items-start gap-2 text-xs text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Event Action Type
                </label>
                <SettingsSelect
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EmailQueueEventType)}
                >
                  <option value="new_booking" className="bg-gunmetal-card text-slate-200">
                    New Booking (Add Booked Flight)
                  </option>
                  <option value="schedule_change" className="bg-gunmetal-card text-slate-200">
                    Schedule Change (Update Tracked Flight)
                  </option>
                  <option value="cancellation" className="bg-gunmetal-card text-slate-200">
                    Cancellation (Pause Tracked Flight)
                  </option>
                </SettingsSelect>
              </div>

              {(eventType === 'schedule_change' || eventType === 'cancellation') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Tracked Flight *
                  </label>
                  <SettingsSelect
                    value={matchedFlightId}
                    onChange={(e) => setMatchedFlightId(e.target.value)}
                  >
                    <option value="" className="bg-gunmetal-card text-slate-200">
                      -- Select Tracked Flight --
                    </option>
                    {flights.map((f) => (
                      <option key={f.id} value={f.id} className="bg-gunmetal-card text-slate-200">
                        {f.airline} {f.flightNumber || ''} · {f.origin || '?'}→{f.destination || '?'} ({f.departureDate})
                        {f.pnr ? ` [${f.pnr}]` : ''}
                      </option>
                    ))}
                  </SettingsSelect>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Origin (IATA) *
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  placeholder="JFK"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destination (IATA) *
                </label>
                <input
                  type="text"
                  maxLength={3}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.toUpperCase())}
                  placeholder="LAX"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Carrier (IATA)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={airline}
                  onChange={(e) => setAirline(e.target.value.toUpperCase())}
                  placeholder="DL"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Flight #
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.replace(/\D+/g, ''))}
                  placeholder="1428"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Departure Date *
                </label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Departure Time
                </label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Arrival Time
                </label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PNR / Confirmation
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={pnr}
                  onChange={(e) => setPnr(e.target.value.toUpperCase())}
                  placeholder="K8M4QP"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Price Paid
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="348.20"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Currency
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                  className="w-full min-h-[42px] border border-gunmetal-border px-3 py-2 rounded-md bg-gunmetal-canvas text-slate-200 font-mono uppercase text-sm focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cabin Class
                </label>
                <SettingsSelect
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value as CabinClass)}
                >
                  <option value="economy" className="bg-gunmetal-card text-slate-200">
                    Economy
                  </option>
                  <option value="premium_economy" className="bg-gunmetal-card text-slate-200">
                    Premium Economy
                  </option>
                  <option value="business" className="bg-gunmetal-card text-slate-200">
                    Business
                  </option>
                  <option value="first" className="bg-gunmetal-card text-slate-200">
                    First Class
                  </option>
                </SettingsSelect>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Fare Tier
                </label>
                <SettingsSelect
                  value={fareTier}
                  onChange={(e) => setFareTier(e.target.value as FareTier)}
                >
                  <option value="Standard" className="bg-gunmetal-card text-slate-200">
                    Standard
                  </option>
                  <option value="Basic Economy" className="bg-gunmetal-card text-slate-200">
                    Basic Economy
                  </option>
                </SettingsSelect>
              </div>
            </div>

            <div className="pt-3 border-t border-gunmetal-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-4 py-2 rounded-md text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[42px] px-5 py-2 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Applying...' : 'Save & Apply'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </SettingsModalPortal>
  );
}