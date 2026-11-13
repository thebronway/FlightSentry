'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Code2 } from 'lucide-react';
import { DevProviderTestItemResult } from '@/services/devApiTester';

interface RawPayloadViewerProps {
  results: DevProviderTestItemResult[];
}

interface ProviderRawAccordionProps {
  item: DevProviderTestItemResult;
}

function ProviderRawAccordion({ item }: ProviderRawAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedJson = useMemo(() => {
    if (item.rawPayload === null || item.rawPayload === undefined) {
      return null;
    }
    try {
      return JSON.stringify(item.rawPayload, null, 2);
    } catch {
      return String(item.rawPayload);
    }
  }, [item.rawPayload]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!formattedJson) return;

    let didCopy = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(formattedJson);
        didCopy = true;
      } catch {
        // Fall through to legacy textarea copy
      }
    }

    if (!didCopy && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = formattedJson;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      try {
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, formattedJson.length);
        didCopy = document.execCommand('copy');
      } catch {
        didCopy = false;
      } finally {
        document.body.removeChild(textarea);
      }
    }

    if (didCopy) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const sizeLabel = formattedJson
    ? `${(new Blob([formattedJson]).size / 1024).toFixed(1)} KB`
    : 'No payload captured';

  return (
    <div className="border border-gunmetal-border rounded-lg overflow-hidden bg-gunmetal-canvas/60">
      <div
        role="button"
        tabIndex={0}
        onClick={() => formattedJson && setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (formattedJson && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        className={`px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 ${
          formattedJson ? 'cursor-pointer hover:bg-gunmetal-border/40' : 'opacity-65'
        } transition-colors`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {formattedJson ? (
            expanded ? (
              <ChevronDown className="w-4 h-4 text-slate-300 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )
          ) : (
            <Code2 className="w-4 h-4 text-gunmetal-muted flex-shrink-0" />
          )}
          <span className="font-bold text-xs text-slate-100">{item.label}</span>
          <span className="text-[11px] font-mono text-gunmetal-muted">({sizeLabel})</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gunmetal-card border border-gunmetal-border text-emerald-300/90">
            Secrets Redacted
          </span>
        </div>

        {formattedJson && (
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[32px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gunmetal-card border border-gunmetal-border text-slate-300 hover:text-white hover:bg-gunmetal-border transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        )}
      </div>

      {expanded && formattedJson && (
        <div className="border-t border-gunmetal-border bg-[#0a0a0c] p-3.5">
          <pre className="text-[11px] font-mono text-slate-200 overflow-x-auto max-h-[460px] overflow-y-auto leading-relaxed whitespace-pre">
            {formattedJson}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function RawPayloadViewer({ results }: RawPayloadViewerProps) {
  return (
    <div className="bg-gunmetal-card border border-gunmetal-border rounded-lg p-4 sm:p-5 space-y-3 shadow-sm">
      <div className="border-b border-gunmetal-border/70 pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
          5. Raw Upstream JSON Payloads
        </h2>
        <p className="text-xs text-gunmetal-muted mt-0.5">
          Expand any provider response below to inspect the raw upstream payload returned by the API or scraper (API keys and tokens are automatically redacted server-side).
        </p>
      </div>

      <div className="space-y-2.5">
        {results.map((item) => (
          <ProviderRawAccordion key={item.provider} item={item} />
        ))}
      </div>
    </div>
  );
}