import { SelectHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
  wrapperClassName?: string;
  compactDesktop?: boolean;
}

export default function SettingsSelect({
  children,
  wrapperClassName = '',
  compactDesktop = false,
  className = '',
  ...rest
}: Props) {
  const heightClass = compactDesktop ? 'min-h-[44px] sm:min-h-[38px]' : 'min-h-[44px]';
  return (
    <div className={`relative ${wrapperClassName}`.trim()}>
      <select
        {...rest}
        className={`w-full ${heightClass} appearance-none border border-gunmetal-border px-3 py-2 pr-9 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 disabled:opacity-50 text-sm cursor-pointer ${className}`.trim()}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
    </div>
  );
}