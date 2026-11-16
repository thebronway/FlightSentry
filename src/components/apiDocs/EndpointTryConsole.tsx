'use client';

import { useMemo, useState } from 'react';
import { Play, Copy, Check, Loader2, Terminal } from 'lucide-react';
import { ApiEndpointDoc } from './types';

interface Props {
  endpoint: ApiEndpointDoc;
  apiKey: string;
  authHeaderMode: 'bearer' | 'x-api-key';
  baseUrl: string;
}

export default function EndpointTryConsole({
  endpoint,
  apiKey,
  authHeaderMode,
  baseUrl,
}: Props) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    endpoint.parameters.forEach((p) => {
      initial[p.name] = p.defaultValue ?? '';
    });
    return initial;
  });

  const [bodyText, setBodyText] = useState<string>(endpoint.exampleBody ?? '');
  const [executing, setExecuting] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [result, setResult] = useState<{
    status: number;
    durationMs: number;
    rateLimitRemaining: string | null;
    body: string;
  } | null>(null);

  const resolvedUrl = useMemo(() => {
    let resolvedPath = endpoint.path;
    const queryParts: string[] = [];

    endpoint.parameters.forEach((param) => {
      const val = (paramValues[param.name] || '').trim();
      if (param.in === 'path') {
        resolvedPath = resolvedPath.replace(
          `{${param.name}}`,
          encodeURIComponent(val || '1')
        );
      } else if (val) {
        queryParts.push(
          `${encodeURIComponent(param.name)}=${encodeURIComponent(val)}`
        );
      }
    });

    const querySuffix =
      queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return `${baseUrl}${resolvedPath}${querySuffix}`;
  }, [baseUrl, endpoint.path, endpoint.parameters, paramValues]);

  const curlSnippet = useMemo(() => {
    const displayKey = apiKey.trim() || 'fss_live_YOUR_API_KEY';
    const authFlag =
      authHeaderMode === 'bearer'
        ? `-H "Authorization: Bearer ${displayKey}"`
        : `-H "X-API-Key: ${displayKey}"`;

    const parts = [`curl -X ${endpoint.method}`, authFlag];
    if (endpoint.method !== 'GET' && endpoint.method !== 'DELETE' && bodyText.trim()) {
      parts.push('-H "Content-Type: application/json"');
      const compactBody = bodyText.trim().replace(/'/g, "'\\''");
      parts.push(`-d '${compactBody}'`);
    }
    parts.push(`"${resolvedUrl}"`);
    return parts.join(' \\\n  ');
  }, [apiKey, authHeaderMode, bodyText, endpoint.method, resolvedUrl]);

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlSnippet);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleExecute = async () => {
    if (executing) return;
    setExecuting(true);
    setResult(null);

    const headers: Record<string, string> = {};
    if (apiKey.trim()) {
      if (authHeaderMode === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      } else {
        headers['X-API-Key'] = apiKey.trim();
      }
    }

    const hasBody =
      endpoint.method !== 'GET' &&
      endpoint.method !== 'DELETE' &&
      bodyText.trim().length > 0;
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    const startMs = performance.now();
    try {
      const targetUrlObj = new URL(resolvedUrl);
      const relativeTarget = `${targetUrlObj.pathname}${targetUrlObj.search}`;

      const res = await fetch(relativeTarget, {
        method: endpoint.method,
        headers,
        body: hasBody ? bodyText : undefined,
      });

      const durationMs = Math.max(1, Math.round(performance.now() - startMs));
      const rawText = await res.text();
      let formattedBody = rawText;
      try {
        formattedBody = JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        // Keep raw response if non-JSON
      }

      setResult({
        status: res.status,
        durationMs,
        rateLimitRemaining: res.headers.get('x-ratelimit-remaining'),
        body: formattedBody,
      });
    } catch (err) {
      const durationMs = Math.max(1, Math.round(performance.now() - startMs));
      setResult({
        status: 0,
        durationMs,
        rateLimitRemaining: null,
        body: err instanceof Error ? err.message : 'Network error executing request',
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gunmetal-border space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-200 inline-flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span>Interactive Request Console</span>
        </span>
        <button
          type="button"
          onClick={handleCopyCurl}
          className="min-h-[34px] px-2.5 py-1 rounded bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs text-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {copiedCurl ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied cURL</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>Copy cURL</span>
            </>
          )}
        </button>
      </div>

      {endpoint.parameters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {endpoint.parameters.map((param) => (
            <div key={param.name} className="space-y-1">
              <label className="block text-[11px] font-mono text-slate-300">
                {param.name}{' '}
                <span className="text-gunmetal-muted">({param.in})</span>
                {param.required && <span className="text-rose-400 ml-0.5">*</span>}
              </label>
              {param.enumValues ? (
                <select
                  value={paramValues[param.name] ?? ''}
                  onChange={(e) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [param.name]: e.target.value,
                    }))
                  }
                  className="w-full min-h-[38px] px-2.5 py-1.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-xs text-slate-100 focus:outline-none focus:border-slate-500"
                >
                  <option value="">(any)</option>
                  {param.enumValues.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={paramValues[param.name] ?? ''}
                  onChange={(e) =>
                    setParamValues((prev) => ({
                      ...prev,
                      [param.name]: e.target.value,
                    }))
                  }
                  placeholder={param.defaultValue || param.type}
                  className="w-full min-h-[38px] px-2.5 py-1.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {endpoint.method !== 'GET' && endpoint.method !== 'DELETE' && (
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-slate-300">
            JSON Request Body
          </label>
          <textarea
            rows={6}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-500"
          />
        </div>
      )}

      <div className="p-2.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border overflow-x-auto">
        <pre className="text-[11px] font-mono text-slate-300 whitespace-pre">
          {curlSnippet}
        </pre>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-gunmetal-muted">
          {apiKey.trim()
            ? 'Using API key entered at top of page'
            : 'Tip: Paste an API key in the top bar to test authenticated calls'}
        </span>
        <button
          type="button"
          disabled={executing}
          onClick={handleExecute}
          className="min-h-[38px] px-4 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {executing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Send Request</span>
            </>
          )}
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-gunmetal-border bg-gunmetal-canvas overflow-hidden">
          <div className="px-3 py-2 border-b border-gunmetal-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                  result.status >= 200 && result.status < 300
                    ? 'bg-emerald-950/80 border border-emerald-700/70 text-emerald-300'
                    : result.status >= 400
                    ? 'bg-rose-950/80 border border-rose-700/70 text-rose-300'
                    : 'bg-amber-950/80 border border-amber-700/70 text-amber-300'
                }`}
              >
                HTTP {result.status || 'ERR'}
              </span>
              <span className="text-gunmetal-muted font-mono">
                {result.durationMs} ms
              </span>
            </div>
            {result.rateLimitRemaining !== null && (
              <span className="text-[11px] font-mono text-gunmetal-muted">
                X-RateLimit-Remaining: {result.rateLimitRemaining}
              </span>
            )}
          </div>
          <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto max-h-80">
            {result.body}
          </pre>
        </div>
      )}
    </div>
  );
}