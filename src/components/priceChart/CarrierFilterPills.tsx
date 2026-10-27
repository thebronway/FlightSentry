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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
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

      <div className="flex items-center gap-2 text-[11px] text-gunmetal-muted ml-auto">
        <button
          type="button"
          onClick={() => onToggleAll(true)}
          className="hover:text-slate-200 transition-colors"
        >
          All
        </button>
        <span>•</span>
        <button
          type="button"
          onClick={() => onToggleAll(false)}
          className="hover:text-slate-200 transition-colors"
        >
          None
        </button>
      </div>
    </div>
  );
}