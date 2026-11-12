'use client';

import { getAirlineColor, getAirlineName } from '@/utils/airline';

interface Props {
  allOperatingAirlines: string[];
  activeAirlines: Record<string, boolean>;
  onToggleAirline: (code: string) => void;
  onToggleAll: (enable: boolean) => void;
}

export default function CarrierFilterPills({
  allOperatingAirlines,
  activeAirlines,
  onToggleAirline,
  onToggleAll,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-gunmetal-canvas/70 border border-gunmetal-border p-2.5 rounded-lg text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 select-none">
          Airlines:
        </span>
        {allOperatingAirlines.map(code => {
          const isSelected = activeAirlines[code];
          const brandColor = getAirlineColor(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => onToggleAirline(code)}
              className={`flex items-center gap-1.5 min-h-[44px] sm:min-h-[30px] px-3 sm:px-2.5 py-2 sm:py-1 rounded-md text-xs font-semibold transition-all border cursor-pointer ${
                isSelected
                  ? 'bg-gunmetal-card text-white border-slate-600 shadow-sm'
                  : 'bg-gunmetal-canvas text-gunmetal-muted border-gunmetal-border/60 opacity-40 hover:opacity-75'
              }`}
              style={{
                borderLeftColor: isSelected ? brandColor : undefined,
                borderLeftWidth: isSelected ? '3px' : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              />
              <span>{code}</span>
              <span className="text-[10px] text-gunmetal-muted font-normal hidden sm:inline">
                {getAirlineName(code).replace(/ (Air Lines|Airlines|Airways|Air)$/i, '')}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-gunmetal-muted ml-auto">
        <button
          type="button"
          onClick={() => onToggleAll(true)}
          className="min-h-[44px] sm:min-h-[28px] px-2.5 sm:px-1.5 inline-flex items-center justify-center rounded border border-gunmetal-border/60 sm:border-0 bg-gunmetal-card/60 sm:bg-transparent hover:text-slate-200 transition-colors cursor-pointer"
        >
          All
        </button>
        <span className="hidden sm:inline">•</span>
        <button
          type="button"
          onClick={() => onToggleAll(false)}
          className="min-h-[44px] sm:min-h-[28px] px-2.5 sm:px-1.5 inline-flex items-center justify-center rounded border border-gunmetal-border/60 sm:border-0 bg-gunmetal-card/60 sm:bg-transparent hover:text-slate-200 transition-colors cursor-pointer"
        >
          None
        </button>
      </div>
    </div>
  );
}