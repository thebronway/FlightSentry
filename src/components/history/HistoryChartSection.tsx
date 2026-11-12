'use client';

import { Flight, PriceHistory } from '@/types';
import { Layers } from 'lucide-react';
import PriceChart from '../PriceChart';

interface Props {
  flight: Flight;
  history: PriceHistory[];
  isFlightNumMode: boolean;
  overlayRouteFloor: boolean;
  onToggleOverlay: () => void;
}

export default function HistoryChartSection({
  flight,
  history,
  isFlightNumMode,
  overlayRouteFloor,
  onToggleOverlay,
}: Props) {
  const canOverlayRouteFloor =
    isFlightNumMode && (flight.monitorRouteAlternatives === 1 || history.some(h => Boolean(h.metadata)));

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Price History Graph
          </h3>
          {canOverlayRouteFloor && (
            <button
              type="button"
              onClick={onToggleOverlay}
              className={`inline-flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] px-3 py-2 sm:py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                overlayRouteFloor
                  ? 'bg-sky-950/60 border-sky-500 text-sky-300 shadow-sm'
                  : 'bg-gunmetal-canvas border-gunmetal-border text-gunmetal-muted hover:text-slate-200 hover:border-slate-500'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{overlayRouteFloor ? 'Route Floor Overlay: ON' : 'Overlay Route Floor'}</span>
            </button>
          )}
        </div>
        <span className="text-[11px] text-gunmetal-muted">
          {overlayRouteFloor
            ? 'Viewing route floor & competitor trends'
            : 'Hover or drag chart to inspect checks'}
        </span>
      </div>
      <PriceChart
        history={history}
        baselinePrice={flight.baselinePrice}
        purchasePrice={flight.purchasePrice}
        searchMode={overlayRouteFloor ? 'Route' : flight.searchMode}
        overlayRouteFloor={overlayRouteFloor}
        currency={flight.currency}
      />
    </div>
  );
}