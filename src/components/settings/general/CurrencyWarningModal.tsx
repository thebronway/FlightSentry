'use client';

import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import SettingsModalPortal from '../shared/SettingsModalPortal';

interface Props {
  isOpen: boolean;
  currentCurrency: string;
  pendingCurrency: string | null;
  flightCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CurrencyWarningModal({
  isOpen,
  currentCurrency,
  pendingCurrency,
  flightCount,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !pendingCurrency) return null;

  return (
    <SettingsModalPortal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4"
      >
        <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-gunmetal-border flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-amber-400 min-w-0">
              <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60 flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-100 truncate">Change Instance Currency</h3>
                <p className="text-xs text-gunmetal-muted">Active flights detected</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close modal"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gunmetal-muted hover:text-slate-200 hover:bg-gunmetal-canvas rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3.5 space-y-2 text-xs text-amber-300/90">
              <p className="font-semibold text-amber-200">
                Switching from {currentCurrency} to {pendingCurrency}
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
                • <strong>False Alert Notice:</strong> Because baseline benchmarks were recorded in {currentCurrency}, the first price check in {pendingCurrency} may trigger a drop or surge alert due to difference in currency value.
              </p>
              <p>
                • <strong>Future Checks:</strong> All future checks and new searches will query search providers in {pendingCurrency}.
              </p>
            </div>

            <div className="pt-2 border-t border-gunmetal-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/80 rounded-md transition-colors shadow-sm"
              >
                Switch to {pendingCurrency}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SettingsModalPortal>
  );
}