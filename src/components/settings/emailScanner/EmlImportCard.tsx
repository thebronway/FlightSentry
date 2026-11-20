'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import SettingsCard from '../shared/SettingsCard';
import EmlSourceInput from '@/components/emailImport/EmlSourceInput';
import ParsedEmailPreview from '@/components/emailImport/ParsedEmailPreview';
import { EmlPreviewResponse } from '@/components/emailImport/types';

interface EmlImportCardProps {
  onNotify?: (message: string, type?: 'success' | 'error') => void;
  onImported?: () => void;
}

export default function EmlImportCard({ onNotify, onImported }: EmlImportCardProps) {
  const [rawSource, setRawSource] = useState<string | null>(null);
  const [preview, setPreview] = useState<EmlPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInspect = async (payload: { rawSource: string; fileName: string | null }) => {
    setLoadingPreview(true);
    setError(null);
    setRawSource(payload.rawSource);

    try {
      const res = await fetch('/api/email-scanner/import-eml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'preview',
          rawSource: payload.rawSource,
          fileName: payload.fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to preview .eml file.');
        setPreview(null);
        return;
      }
      setPreview(data as EmlPreviewResponse);
    } catch (err: any) {
      setError(err?.message || 'Network error while parsing .eml file.');
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleStageToQueue = async () => {
    if (!rawSource || !preview || staging) return;
    setStaging(true);
    setError(null);

    try {
      const res = await fetch('/api/email-scanner/import-eml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'stage',
          rawSource,
          fileName: preview.fileName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to stage events to Email Queue.');
        return;
      }

      const msg =
        data.queuedCount > 0
          ? `Staged ${data.queuedCount} flight event(s) to the Email Review Queue.`
          : 'No new events staged (already present in queue or tracked flights).';
      if (onNotify) {
        onNotify(msg, data.queuedCount > 0 ? 'success' : 'error');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flightsentry:email-queue-updated'));
      }
      if (onImported) {
        onImported();
      }
      setPreview(null);
      setRawSource(null);
    } catch (err: any) {
      setError(err?.message || 'Network error staging .eml file.');
    } finally {
      setStaging(false);
    }
  };

  return (
    <SettingsCard className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Upload className="w-4 h-4 text-sky-400" />
          <span>Manual .eml File Import &amp; Preview</span>
        </h3>
        <p className="text-xs text-gunmetal-muted mt-0.5">
          Upload a saved airline <span className="font-mono text-slate-300">.eml</span> email to preview extracted legs, fares, and dates before staging it into the Dashboard Email Review Queue.
        </p>
      </div>

      <EmlSourceInput
        allowRawPaste={false}
        isLoading={loadingPreview}
        onInspect={handleInspect}
        onClear={() => {
          setPreview(null);
          setRawSource(null);
          setError(null);
        }}
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/45 border border-rose-700/70 flex items-start gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {preview && (
        <ParsedEmailPreview
          fileName={preview.fileName}
          diagnostic={preview.diagnostic}
          actionSlot={
            preview.diagnostic.events.length > 0 ? (
              <button
                type="button"
                disabled={staging}
                onClick={() => void handleStageToQueue()}
                className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-950/60 hover:bg-emerald-900/75 border border-emerald-700/80 text-emerald-200 hover:text-white inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{staging ? 'Staging...' : 'Stage to Email Queue'}</span>
              </button>
            ) : null
          }
        />
      )}
    </SettingsCard>
  );
}