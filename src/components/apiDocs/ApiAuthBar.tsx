'use client';

import { useState } from 'react';
import { KeyRound, Eye, EyeOff, FileJson, Copy, Check } from 'lucide-react';

interface Props {
  apiKey: string;
  onApiKeyChange: (val: string) => void;
  authHeaderMode: 'bearer' | 'x-api-key';
  onAuthHeaderModeChange: (mode: 'bearer' | 'x-api-key') => void;
  baseUrl: string;
}

export default function ApiAuthBar({
  apiKey,
  onApiKeyChange,
  authHeaderMode,
  onAuthHeaderModeChange,
  baseUrl,
}: Props) {
  const [showKey, setShowKey] = useState(false);
  const [copiedSpecUrl, setCopiedSpecUrl] = useState(false);

  const specUrl = `${baseUrl}/api/v1/openapi.json`;

  const handleCopySpecUrl = async () => {
    try {
      await navigator.clipboard.writeText(specUrl);
      setCopiedSpecUrl(true);
      setTimeout(() => setCopiedSpecUrl(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-slate-100">
              Interactive API Key & Spec
            </h2>
            <p className="text-xs text-gunmetal-muted">
              Paste a key generated in Settings → Security to test live requests directly from this page (held in memory only).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-center">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-xs font-mono text-slate-300">
            <FileJson className="w-3.5 h-3.5 text-sky-400" />
            <span>/api/v1/openapi.json</span>
          </span>
          <button
            type="button"
            onClick={handleCopySpecUrl}
            className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedSpecUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied URL</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>Copy Spec URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="fss_live_..."
            className="w-full min-h-[44px] sm:min-h-[38px] pl-3 pr-10 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border font-mono text-sm sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
          <button
            type="button"
            onClick={() => setShowKey((prev) => !prev)}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            className="absolute inset-y-0 right-0 min-w-[44px] sm:min-w-[36px] px-3 flex items-center justify-center text-gunmetal-muted hover:text-slate-200 cursor-pointer"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <select
          value={authHeaderMode}
          onChange={(e) =>
            onAuthHeaderModeChange(e.target.value as 'bearer' | 'x-api-key')
          }
          aria-label="Authentication header format"
          className="min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-md bg-gunmetal-canvas border border-gunmetal-border text-sm sm:text-xs font-semibold text-slate-200 focus:outline-none focus:border-slate-500"
        >
          <option value="bearer">Authorization: Bearer &lt;key&gt;</option>
          <option value="x-api-key">X-API-Key: &lt;key&gt;</option>
        </select>
      </div>
    </div>
  );
}