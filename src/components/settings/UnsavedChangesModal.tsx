'use client';

import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({
  isOpen,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes in your settings. If you navigate away now, your modifications will be discarded.',
  confirmLabel = 'Discard & Continue',
  cancelLabel = 'Keep Editing',
  onConfirm,
  onCancel,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 text-amber-400">
            <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-800/60">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-100">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gunmetal-muted hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-gunmetal-muted leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gunmetal-border/70">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-2 text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/70 rounded-md transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}