'use client';

import { Lock, Coins } from 'lucide-react';
import { PaymentType } from './useFlightModalState';
import { getCurrencySymbol } from '@/utils/format';

interface Props {
  purchasePrice: string;
  bookingDate: string;
  maxBookingDate: string;
  pnr: string;
  paymentType: PaymentType;
  currency: string;
  isPurchasePriceLocked: boolean;
  onPurchasePriceChange: (val: string) => void;
  onBookingDateChange: (val: string) => void;
  onPnrChange: (val: string) => void;
}

export default function BookingDetailsSection({
  purchasePrice,
  bookingDate,
  maxBookingDate,
  pnr,
  paymentType,
  currency,
  isPurchasePriceLocked,
  onPurchasePriceChange,
  onBookingDateChange,
  onPnrChange,
}: Props) {
  const isPoints = paymentType === 'points';

  return (
    <div className="bg-gunmetal-canvas/60 border border-gunmetal-border rounded-xl p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Booking & Purchase Details
        </label>
        {isPurchasePriceLocked && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <Lock className="w-3 h-3" /> Price Paid Locked
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Purchase Price or Points Redeemed */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            {isPoints ? 'Points Redeemed *' : 'Amount Paid *'}
          </label>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-sm ${isPoints ? 'text-amber-400 font-semibold flex items-center gap-1 text-xs' : 'text-gunmetal-muted'}`}>
              {isPoints ? <><Coins className="w-3.5 h-3.5" /> pts</> : getCurrencySymbol(currency)}
            </span>
            <input
              required
              disabled={isPurchasePriceLocked}
              readOnly={isPurchasePriceLocked}
              type="number"
              step={isPoints ? "1" : "0.01"}
              min="1"
              placeholder={isPoints ? "e.g. 35000" : "e.g. 349.00"}
              value={purchasePrice}
              onChange={e => onPurchasePriceChange(e.target.value)}
              className={`w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono ${
                isPurchasePriceLocked ? 'opacity-60 cursor-not-allowed bg-gunmetal-card border-gunmetal-border/80' : ''
              }`}
            />
          </div>
          <span className="text-[11px] text-gunmetal-muted block mt-1">
            {isPurchasePriceLocked
              ? 'To record a lower price paid, use "Log Rebook" on the dashboard.'
              : isPoints
              ? 'Award points spent on this ticket.'
              : 'Alerts trigger if fares drop below what you paid.'}
          </span>
        </div>

        {/* Booking Date (Defaults to today, allows past dates) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            Booking Date *
          </label>
          <div className="relative">
            <input
              required
              type="date"
              max={maxBookingDate}
              value={bookingDate}
              onChange={e => onBookingDateChange(e.target.value)}
              className="w-full h-10 px-3 py-2 text-sm rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none [color-scheme:dark]"
            />
          </div>
          <span className="text-[11px] text-gunmetal-muted block mt-1">
            Date ticket was booked (supports past dates).
          </span>
        </div>

        {/* PNR Confirmation Code */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
            PNR / Confirmation Code
          </label>
          <input
            maxLength={10}
            placeholder="e.g. K9XZ4B"
            value={pnr}
            onChange={e => onPnrChange(e.target.value.toUpperCase())}
            className="w-full h-10 px-3 py-2 text-sm uppercase rounded-md bg-gunmetal-canvas text-slate-200 border border-gunmetal-border focus:border-slate-500 focus:outline-none placeholder-zinc-500 font-mono"
          />
          <span className="text-[11px] text-gunmetal-muted block mt-1">
            Optional airline confirmation locator.
          </span>
        </div>
      </div>
    </div>
  );
}