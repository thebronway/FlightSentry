'use client';

import React from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
  className?: string;
  disabled?: boolean;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  align = 'center',
  className = '',
  disabled = false,
}: TooltipProps) {
  if (!content || disabled) {
    return <>{children}</>;
  }

  const alignContainerClasses = {
    left: 'left-0 items-start',
    center: 'left-1/2 -translate-x-1/2 items-center',
    right: 'right-0 items-end',
  }[align];

  const caretAlignClasses = {
    left: 'ml-3 self-start',
    center: 'self-center',
    right: 'mr-3 self-end',
  }[align];

  const positionContainerClasses =
    position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';

  return (
    <div className={`relative inline-flex group/tooltip hover:z-50 ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute ${positionContainerClasses} opacity-0 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 transition-opacity duration-150 ease-out z-50 flex flex-col ${alignContainerClasses}`}
      >
        {position === 'bottom' && (
          <div
            className={`w-1.5 h-1.5 bg-gunmetal-card border-l border-t border-slate-600 rotate-45 -mb-1 ${caretAlignClasses}`}
          />
        )}
        <div className="bg-gunmetal-card/95 text-slate-100 text-[11px] font-sans font-semibold px-2.5 py-1 rounded shadow-2xl border border-slate-600 whitespace-nowrap backdrop-blur-sm">
          {content}
        </div>
        {position === 'top' && (
          <div
            className={`w-1.5 h-1.5 bg-gunmetal-card border-r border-b border-slate-600 rotate-45 -mt-1 ${caretAlignClasses}`}
          />
        )}
      </div>
    </div>
  );
}