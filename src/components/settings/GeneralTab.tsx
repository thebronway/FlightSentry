'use client';

import { useState, useEffect } from 'react';
import { Settings } from '@/types';
import { Globe, Clock, Tag, Coffee, Github, BookOpen, ExternalLink, ChevronDown, AlertTriangle, X } from 'lucide-react';
import { setActiveCurrency } from '@/utils/format';
import packageInfo from '../../../package.json';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onAutoSave?: (
    updatedSettings: Settings,
    statusKey: string,
    pillMessage?: string,
    toastMessage?: string
  ) => Promise<void>;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'AU$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'SG$' },
];

export default function GeneralTab({ settings, onChange, onAutoSave }: Props) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [flightCount, setFlightCount] = useState<number>(0);
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const timezone = settings.timezone || 'UTC';

  useEffect(() => {
    fetch('/api/flights')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFlightCount(data.length);
      })
      .catch(() => setFlightCount(0));
  }, []);

  useEffect(() => {
    const updateClock = () => {
      try {
        const formatted = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(new Date());
        setCurrentTime(formatted);
      } catch {
        setCurrentTime(new Date().toUTCString());
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const executeCurrencyChange = async (newCurrency: string) => {
    setActiveCurrency(newCurrency);
    const updated = { ...settings, currency: newCurrency };
    onChange(updated);
    if (onAutoSave) {
      await onAutoSave(updated, 'general', undefined, `Currency updated to ${newCurrency}`);
    }
  };

  const handleCurrencySelect = (newCurrency: string) => {
    if (newCurrency === (settings.currency || 'USD')) return;
    if (flightCount > 0) {
      setPendingCurrency(newCurrency);
      setShowWarningModal(true);
    } else {
      executeCurrencyChange(newCurrency);
    }
  };

  const handleConfirmModal = async () => {
    if (pendingCurrency) {
      await executeCurrencyChange(pendingCurrency);
      setPendingCurrency(null);
    }
    setShowWarningModal(false);
  };

  const handleCancelModal = () => {
    setPendingCurrency(null);
    setShowWarningModal(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showWarningModal) {
        handleCancelModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWarningModal]);

  useEffect(() => {
    if (settings.currency) {
      setActiveCurrency(settings.currency);
    }
  }, [settings.currency]);

  return (
    <div className="space-y-6 pt-2">
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-3.5 rounded-lg text-xs text-slate-300">
        <p className="font-semibold text-slate-200 mb-0.5">Instance Preferences & System Environment</p>
        Manage instance-wide defaults including application currency, application timezone, version information, and project links.
      </div>

      {/* Currency Selector Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-1">
            <Tag className="w-4 h-4 text-slate-400" />
            Display & Search Currency
          </label>
          <p className="text-[11px] text-gunmetal-muted mb-2.5">
            Sets the primary currency used for dashboard prices, corridor charts, and outbound Google Flights search API queries.
          </p>
        </div>

        <div className="relative max-w-sm">
          <select
            value={settings.currency || 'USD'}
            onChange={e => handleCurrencySelect(e.target.value)}
            className="w-full appearance-none border border-gunmetal-border p-2.5 pr-10 rounded-md bg-gunmetal-canvas text-slate-200 focus:outline-none focus:border-slate-500 text-sm cursor-pointer font-medium"
          >
            {SUPPORTED_CURRENCIES.map(curr => (
              <option key={curr.code} value={curr.code} className="bg-gunmetal-card text-slate-200">
                {curr.code} — {curr.name} ({curr.symbol})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gunmetal-muted pointer-events-none" />
        </div>
      </div>

      {/* System Timezone & Clock Card */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-400" />
          Application Timezone & Environment Time
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border">
            <span className="text-[11px] font-semibold text-gunmetal-muted block uppercase tracking-wider">
              Configured Timezone
            </span>
            <span className="text-sm font-bold text-slate-100 font-mono mt-0.5 block">
              {timezone}
            </span>
            <span className="text-[10px] text-gunmetal-muted block mt-1">
              Set via Docker container TZ environment variable.
            </span>
          </div>

          <div className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border">
            <span className="text-[11px] font-semibold text-gunmetal-muted block uppercase tracking-wider">
              Current Local Time
            </span>
            <span className="text-sm font-bold text-sky-400 font-mono mt-0.5 block">
              {currentTime || 'Resolving clock...'}
            </span>
            <span className="text-[10px] text-gunmetal-muted block mt-1">
              Synchronized reference time used for scheduling cadences.
            </span>
          </div>
        </div>
      </div>

      {/* App Version & Support Links */}
      <div className="bg-gunmetal-canvas/60 border border-gunmetal-border p-4 rounded-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gunmetal-border/70">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Application Version</h4>
            <span className="text-base font-bold text-slate-100 font-mono">
              FlightSentry v{packageInfo.version}
            </span>
          </div>
          <a
            href="https://github.com/thebronway/FlightSentry/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Release Notes</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
            Support & Community Links
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://brian.conway.im/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
            >
              <Globe className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Developer's Website</span>
              <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
            </a>

            <a
              href="https://github.com/thebronway/FlightSentry/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
            >
              <Github className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              <span>Report An Issue</span>
              <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
            </a>

            <a
              href="https://buymeacoffee.com/brianconway"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-md bg-gunmetal-canvas border border-gunmetal-border hover:border-slate-500 hover:bg-gunmetal-border/40 transition-colors flex items-center gap-2.5 text-xs font-semibold text-slate-200 group"
            >
              <Coffee className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Support FlightSentry</span>
              <ExternalLink className="w-3 h-3 text-gunmetal-muted ml-auto" />
            </a>
          </div>
        </div>
      </div>

      {/* Currency Switch Warning Modal */}
      {showWarningModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        >
          <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gunmetal-border flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-400">
                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Change Instance Currency</h3>
                  <p className="text-xs text-gunmetal-muted">Active flights detected</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelModal}
                className="p-1.5 text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 space-y-2 text-xs text-amber-300/90">
                <p className="font-semibold text-amber-200">
                  Switching from {settings.currency || 'USD'} to {pendingCurrency}
                </p>
                <p className="leading-relaxed">
                  You currently have <strong>{flightCount} {flightCount === 1 ? 'flight' : 'flights'}</strong> tracked. Existing prices, baselines, and historical checks are stored as raw numbers and will <strong>not</strong> be automatically converted using foreign exchange rates.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gunmetal-muted leading-relaxed">
                <p>
                  • <strong>Historical Numbers:</strong> Previous records retain their numerical amounts and will now display with the {pendingCurrency} symbol.
                </p>
                <p>
                  • <strong>False Alert Notice:</strong> Because baseline benchmarks were recorded in {settings.currency || 'USD'}, the first price check in {pendingCurrency} may trigger a drop or surge alert due to difference in currency value.
                </p>
                <p>
                  • <strong>Future Checks:</strong> All future checks and new searches will query search providers in {pendingCurrency}.
                </p>
              </div>

              <div className="pt-2 border-t border-gunmetal-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelModal}
                  className="px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModal}
                  className="px-4 py-2 text-xs font-semibold bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/80 rounded-md transition-colors shadow-sm"
                >
                  Switch to {pendingCurrency}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}