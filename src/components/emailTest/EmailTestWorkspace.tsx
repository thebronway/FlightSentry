'use client';

import React, { useState } from 'react';
import { FlaskConical, AlertCircle } from 'lucide-react';
import EmlSourceInput from '@/components/emailImport/EmlSourceInput';
import ParsedEmailPreview from '@/components/emailImport/ParsedEmailPreview';
import { EmlPreviewResponse } from '@/components/emailImport/types';

export default function EmailTestWorkspace() {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmlPreviewResponse | null>(null);

  const handleInspect = async (payload: { rawSource: string; fileName: string | null }) => {
    setIsParsing(true);
    setError(null);

    try {
      const res = await fetch('/api/dev/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed with HTTP ${res.status}`);
        return;
      }
      setResult(data as EmlPreviewResponse);
    } catch (err: any) {
      setError(err?.message || 'Network error executing email parser test.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100">Dev Email Import Tester</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border bg-amber-950/60 text-amber-300 border-amber-700/70">
              <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
              <span>ENABLE_API_TESTER=true</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gunmetal-muted mt-1">
            Upload an <span className="font-mono text-slate-300">.eml</span> file or paste raw RFC 822 source to preview parser extraction in memory without modifying IMAP cursors or queuing flights.
          </p>
        </div>
      </div>

      <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl p-4 sm:p-5">
        <EmlSourceInput
          allowRawPaste
          isLoading={isParsing}
          submitLabel="Preview Parsed Output"
          onInspect={handleInspect}
          onClear={() => {
            setResult(null);
            setError(null);
          }}
        />
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/45 border border-rose-700/70 flex items-start gap-3 text-xs sm:text-sm text-rose-200">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="break-words">{error}</div>
        </div>
      )}

      {result && (
        <ParsedEmailPreview
          fileName={result.fileName}
          diagnostic={result.diagnostic}
        />
      )}
    </div>
  );
}