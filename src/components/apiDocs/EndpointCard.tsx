'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ApiEndpointDoc, HttpMethod } from './types';
import { ApiKeyScope } from '@/types';
import EndpointTryConsole from './EndpointTryConsole';

interface Props {
  endpoint: ApiEndpointDoc;
  apiKey: string;
  authHeaderMode: 'bearer' | 'x-api-key';
  baseUrl: string;
}

function getMethodBadgeStyle(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'bg-sky-950/80 border-sky-700/70 text-sky-300';
    case 'POST':
      return 'bg-emerald-950/80 border-emerald-700/70 text-emerald-300';
    case 'PATCH':
      return 'bg-amber-950/80 border-amber-700/70 text-amber-300';
    case 'DELETE':
      return 'bg-rose-950/80 border-rose-700/70 text-rose-300';
  }
}

function getScopeBadgeStyle(scope: ApiKeyScope): string {
  switch (scope) {
    case 'admin':
      return 'bg-rose-950/60 border-rose-800/60 text-rose-300';
    case 'write':
      return 'bg-amber-950/60 border-amber-800/60 text-amber-300';
    case 'read':
    default:
      return 'bg-slate-800/80 border-slate-600/70 text-slate-300';
  }
}

export default function EndpointCard({
  endpoint,
  apiKey,
  authHeaderMode,
  baseUrl,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gunmetal-card border border-gunmetal-border rounded-xl overflow-hidden transition-colors">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-gunmetal-canvas/50 transition-colors cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gunmetal-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gunmetal-muted flex-shrink-0" />
          )}
          <span
            className={`px-2 py-0.5 rounded border font-mono font-bold text-xs w-16 text-center flex-shrink-0 ${getMethodBadgeStyle(
              endpoint.method
            )}`}
          >
            {endpoint.method}
          </span>
          <code className="text-xs sm:text-sm font-mono font-semibold text-slate-100 break-all">
            {endpoint.path}
          </code>
        </div>

        <div className="flex items-center gap-2.5 pl-6 sm:pl-0 flex-shrink-0">
          <span className="text-xs text-gunmetal-muted truncate max-w-xs">
            {endpoint.summary}
          </span>
          <span
            className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${getScopeBadgeStyle(
              endpoint.requiredScope
            )}`}
          >
            {endpoint.requiredScope}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gunmetal-border/80 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            {endpoint.description}
          </p>

          {endpoint.parameters.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted">
                Parameters
              </h4>
              <div className="border border-gunmetal-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gunmetal-canvas/80 text-gunmetal-muted border-b border-gunmetal-border">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">In</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gunmetal-border">
                    {endpoint.parameters.map((param) => (
                      <tr key={param.name}>
                        <td className="px-3 py-2 font-mono text-slate-100">
                          {param.name}
                          {param.required && (
                            <span className="text-rose-400 ml-0.5">*</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gunmetal-muted">
                          {param.in}
                        </td>
                        <td className="px-3 py-2 font-mono text-sky-300">
                          {param.type}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {param.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endpoint.bodyFields && endpoint.bodyFields.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted">
                Request Body Fields
              </h4>
              <div className="border border-gunmetal-border rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gunmetal-canvas/80 text-gunmetal-muted border-b border-gunmetal-border">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Field</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Required</th>
                      <th className="px-3 py-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gunmetal-border">
                    {endpoint.bodyFields.map((field) => (
                      <tr key={field.name}>
                        <td className="px-3 py-2 font-mono text-slate-100">
                          {field.name}
                        </td>
                        <td className="px-3 py-2 font-mono text-sky-300">
                          {field.type}
                        </td>
                        <td className="px-3 py-2">
                          {field.required ? (
                            <span className="text-rose-300 font-semibold">Yes</span>
                          ) : (
                            <span className="text-gunmetal-muted">No</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {field.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gunmetal-muted mr-1">
              Responses:
            </span>
            {endpoint.responseCodes.map((rc) => (
              <span
                key={rc.status}
                className="px-2 py-0.5 rounded bg-gunmetal-canvas border border-gunmetal-border text-[11px] font-mono text-slate-300"
              >
                {rc.status} · {rc.description}
              </span>
            ))}
          </div>

          <EndpointTryConsole
            endpoint={endpoint}
            apiKey={apiKey}
            authHeaderMode={authHeaderMode}
            baseUrl={baseUrl}
          />
        </div>
      )}
    </div>
  );
}