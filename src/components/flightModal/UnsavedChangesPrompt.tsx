'use client';

import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesPrompt({ isOpen, onConfirm, onCancel }: Props) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5 text-amber-400">
            <div className="p-2 rounded-lg bg-amber-950/50 border border-amber-800/60">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Unsaved Changes</h3>
              <p className="text-xs text-gunmetal-muted">Confirm discarding changes</p>
            </div>
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
          You have unsaved changes in this flight form. If you close now, your updates will be lost.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gunmetal-border/70">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border rounded-md transition-colors cursor-pointer"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/70 rounded-md transition-colors cursor-pointer shadow-sm"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}