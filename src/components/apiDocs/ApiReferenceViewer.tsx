'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Search, ShieldCheck } from 'lucide-react';
import { ApiEndpointDoc } from './types';
import ApiAuthBar from './ApiAuthBar';
import EndpointCard from './EndpointCard';

interface Props {
  specVersion: string;
}

const ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: 'list-flights',
    tag: 'Flights',
    method: 'GET',
    path: '/api/v1/flights',
    summary: 'List tracked flights',
    description:
      'Returns all tracked flights matching optional query filters along with normalized price summary fields (`currentPrice`, `baselinePrice`, `purchasePrice`, `taxesAmount`, `taxesCurrency`, `allTimeLow`, `allTimeHigh`, `priceDelta`, `priceDeltaPercent`) and `nonstop` vs `withStops` floor breakdown.',
    requiredScope: 'read',
    parameters: [
      {
        name: 'status',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Filter by status (Watching, Booked, Paused, Past).',
        enumValues: ['Watching', 'Booked', 'Paused', 'Past'],
      },
      {
        name: 'searchMode',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Filter by search mode (Route or FlightNumber).',
        enumValues: ['Route', 'FlightNumber'],
      },
      {
        name: 'airline',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Filter by 2-character IATA carrier code (e.g. DL, B6).',
      },
      {
        name: 'origin',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Filter by origin IATA airport or metro code.',
      },
      {
        name: 'destination',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Filter by destination IATA airport or metro code.',
      },
      {
        name: 'isManual',
        in: 'query',
        required: false,
        type: 'boolean',
        description: 'Filter by manual/points mode (true or false).',
        enumValues: ['true', 'false'],
      },
      {
        name: 'currency',
        in: 'query',
        required: false,
        type: 'string',
        description: 'Filter by currency code or points currency name.',
      },
    ],
    responseCodes: [
      { status: 200, description: 'Flights list returned' },
      { status: 400, description: 'Invalid filter value' },
      { status: 401, description: 'Unauthorized' },
      { status: 429, description: 'Rate limit exceeded' },
    ],
  },
  {
    id: 'create-flight',
    tag: 'Flights',
    method: 'POST',
    path: '/api/v1/flights',
    summary: 'Create a tracked route or flight',
    description:
      'Creates a watched route, watched flight, or booked flight (cash automated, cash manual, or points/miles). Executes an immediate live fare check unless `runInitialCheck` is `false` or Manual/Points mode is selected.',
    requiredScope: 'write',
    parameters: [],
    bodyFields: [
      { name: 'searchMode', type: '"Route" | "FlightNumber"', required: true, description: 'Track an entire route or a specific flight number.' },
      { name: 'origin', type: 'string', required: false, description: '3-letter IATA airport or metro code (e.g. JFK, WAS).' },
      { name: 'destination', type: 'string', required: false, description: '3-letter IATA airport or metro code (e.g. LAX, NYC).' },
      { name: 'departureDate', type: 'YYYY-MM-DD', required: true, description: 'Outbound departure date.' },
      { name: 'airline', type: 'string', required: false, description: '2-character IATA carrier code (required for FlightNumber).' },
      { name: 'flightNumber', type: 'string', required: false, description: 'Numeric flight number (required for FlightNumber).' },
      { name: 'baselinePrice', type: 'number', required: false, description: 'Initial benchmark fare or points cost.' },
      { name: 'purchasePrice', type: 'number', required: false, description: 'Paid fare (automatically creates as Booked).' },
      { name: 'currency', type: 'string', required: false, description: 'Fiat currency code or configured points currency name.' },
      { name: 'taxesAmount', type: 'number', required: false, description: 'Cash taxes and fees paid on a points booking.' },
      { name: 'taxesCurrency', type: 'string', required: false, description: 'Fiat currency code for taxesAmount (defaults to instance currency).' },
      { name: 'targetPrice', type: 'number', required: false, description: 'Target alert threshold price.' },
      { name: 'cabinClass', type: 'string', required: false, description: 'economy | premium_economy | business | first' },
      { name: 'fareTier', type: 'string', required: false, description: 'Basic Economy | Standard' },
      { name: 'maxStops', type: '0 | 1 | 2 | null', required: false, description: 'Maximum allowed stops (0 = nonstop).' },
      { name: 'noRedeye', type: '0 | 1', required: false, description: 'Exclude overnight redeye flights when set to 1.' },
      { name: 'runInitialCheck', type: 'boolean', required: false, description: 'Whether to run a live provider lookup on creation (default true).' },
    ],
    exampleBody: JSON.stringify(
      {
        searchMode: 'FlightNumber',
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2026-12-20',
        airline: 'DL',
        flightNumber: '452',
        cabinClass: 'economy',
        fareTier: 'Standard',
        baselinePrice: 349,
        targetPrice: 280,
        runInitialCheck: false,
      },
      null,
      2
    ),
    responseCodes: [
      { status: 201, description: 'Flight created' },
      { status: 400, description: 'Validation or fare lookup failure' },
      { status: 401, description: 'Unauthorized' },
      { status: 403, description: 'Requires write scope' },
    ],
  },
  {
    id: 'get-flight-detail',
    tag: 'Flights',
    method: 'GET',
    path: '/api/v1/flights/{id}',
    summary: 'Get full flight details & paginated history',
    description:
      'Returns full flight configuration (alliances, co-location clusters, alert thresholds, schedule cadence, stop metrics, and competitor carrier breakdowns) alongside paginated `price_history` records.',
    requiredScope: 'read',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Tracked flight ID.', defaultValue: '1' },
      { name: 'limit', in: 'query', required: false, type: 'integer', description: 'History items per page (1-200).', defaultValue: '25' },
      { name: 'offset', in: 'query', required: false, type: 'integer', description: 'Pagination offset.', defaultValue: '0' },
    ],
    responseCodes: [
      { status: 200, description: 'Flight detail & price history' },
      { status: 401, description: 'Unauthorized' },
      { status: 404, description: 'Flight not found' },
    ],
  },
  {
    id: 'patch-flight',
    tag: 'Flights',
    method: 'PATCH',
    path: '/api/v1/flights/{id}',
    summary: 'Update flight settings or pause/resume',
    description:
      'Partially updates flight settings, alert thresholds, notes, or status (`Watching`, `Booked`, `Paused`, `Past`). Blocks resuming automated checks on Manual/Points flights.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Tracked flight ID.', defaultValue: '1' },
    ],
    exampleBody: JSON.stringify(
      {
        status: 'Paused',
        targetPrice: 275,
        notes: 'Paused via Public API',
      },
      null,
      2
    ),
    responseCodes: [
      { status: 200, description: 'Flight updated' },
      { status: 400, description: 'Invalid update or manual/points lock' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Flight not found' },
    ],
  },
  {
    id: 'delete-flight',
    tag: 'Flights',
    method: 'DELETE',
    path: '/api/v1/flights/{id}',
    summary: 'Delete a tracked flight',
    description: 'Permanently deletes a tracked flight and all associated price history records.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Tracked flight ID.', defaultValue: '1' },
    ],
    responseCodes: [
      { status: 200, description: 'Flight deleted' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Flight not found' },
    ],
  },
  {
    id: 'check-flight',
    tag: 'Flight Actions',
    method: 'POST',
    path: '/api/v1/flights/{id}/check',
    summary: 'Trigger an immediate live price check',
    description:
      'Runs an on-demand live price check across configured providers (respecting global pause, circuit breaker, quotas, and Manual/Points mode locks) and returns the updated price, provider used, and next scheduled check timestamp.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Tracked flight ID.', defaultValue: '1' },
    ],
    exampleBody: '{}',
    responseCodes: [
      { status: 200, description: 'Price check executed' },
      { status: 400, description: 'Past or Manual/Points flight' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Flight not found' },
      { status: 429, description: 'Quota exceeded, paused, or circuit breaker active' },
    ],
  },
  {
    id: 'log-flight-history',
    tag: 'Flight Actions',
    method: 'POST',
    path: '/api/v1/flights/{id}/history',
    summary: 'Log a manual price/points check or competitor entry',
    description:
      'Adds a manual price/points check or competing carrier flight onto an existing flight history timeline.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Tracked flight ID.', defaultValue: '1' },
    ],
    bodyFields: [
      { name: 'price', type: 'number', required: true, description: 'Observed cash price or points amount.' },
      { name: 'airline', type: 'string', required: true, description: '2-character IATA carrier code.' },
      { name: 'flightNumber', type: 'string', required: false, description: 'Numeric flight number.' },
      { name: 'origin', type: 'string', required: false, description: 'Origin airport code override.' },
      { name: 'destination', type: 'string', required: false, description: 'Destination airport code override.' },
      { name: 'date', type: 'ISO-8601', required: false, description: 'Observation timestamp (defaults to now).' },
    ],
    exampleBody: JSON.stringify(
      {
        airline: 'B6',
        flightNumber: '123',
        price: 315,
      },
      null,
      2
    ),
    responseCodes: [
      { status: 201, description: 'History entry recorded' },
      { status: 400, description: 'Validation error' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Flight not found' },
    ],
  },
  {
    id: 'convert-flight',
    tag: 'Flight Actions',
    method: 'POST',
    path: '/api/v1/flights/{id}/convert',
    summary: 'Convert Watching flight to Booked',
    description:
      'Converts a `Watching` flight to `Booked` in place with `purchasePrice`, `airline`, `flightNumber`, and optional `pnr`, preserving historical price checks.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Tracked flight ID.', defaultValue: '1' },
    ],
    bodyFields: [
      { name: 'purchasePrice', type: 'number', required: true, description: 'Confirmed ticket price or points paid.' },
      { name: 'airline', type: 'string', required: true, description: '2-character IATA carrier code.' },
      { name: 'flightNumber', type: 'string', required: true, description: 'Numeric flight number.' },
      { name: 'pnr', type: 'string', required: false, description: 'Booking confirmation / PNR code.' },
      { name: 'currency', type: 'string', required: false, description: 'Fiat currency code or configured points currency name.' },
      { name: 'taxesAmount', type: 'number', required: false, description: 'Cash taxes and fees paid on a points booking.' },
      { name: 'taxesCurrency', type: 'string', required: false, description: 'Fiat currency code for taxesAmount (defaults to instance currency).' },
    ],
    exampleBody: JSON.stringify(
      {
        purchasePrice: 315,
        airline: 'B6',
        flightNumber: '123',
        pnr: 'ABC123',
      },
      null,
      2
    ),
    responseCodes: [
      { status: 200, description: 'Flight converted to Booked' },
      { status: 400, description: 'Validation error' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Flight not found' },
    ],
  },
  {
    id: 'rebook-flight',
    tag: 'Flight Actions',
    method: 'POST',
    path: '/api/v1/flights/{id}/rebook',
    summary: 'Log a post-booking rebook or fare credit',
    description:
      'Logs a rebooked lower fare on an existing `Booked` flight, calculates `creditClaimed`, preserves `originalPurchasePrice`, and records a milestone in `price_history`.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Booked flight ID.', defaultValue: '1' },
    ],
    bodyFields: [
      { name: 'newPrice', type: 'number', required: true, description: 'New rebooked fare or points cost.' },
      { name: 'pnr', type: 'string', required: false, description: 'Updated PNR confirmation code.' },
      { name: 'notes', type: 'string', required: false, description: 'Updated flight notes.' },
    ],
    exampleBody: JSON.stringify(
      {
        newPrice: 279,
        pnr: 'ABC123',
      },
      null,
      2
    ),
    responseCodes: [
      { status: 200, description: 'Rebook adjustment recorded' },
      { status: 400, description: 'Flight is not Booked or invalid payload' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Flight not found' },
    ],
  },
  {
    id: 'cleanup-past',
    tag: 'Flight Actions',
    method: 'POST',
    path: '/api/v1/flights/cleanup-past',
    summary: 'Purge archived Past flights (Admin)',
    description:
      'Purges archived `Past` flights either by retention window (`scope: "retention"`) or all past flights (`scope: "all"`). Requires an `admin`-scoped API key.',
    requiredScope: 'admin',
    parameters: [],
    bodyFields: [
      { name: 'scope', type: '"all" | "retention"', required: true, description: 'Purge all past flights or only those older than retentionDays.' },
      { name: 'retentionDays', type: 'integer', required: false, description: 'Required when scope is "retention" (1-3650 days).' },
    ],
    exampleBody: JSON.stringify(
      {
        scope: 'retention',
        retentionDays: 30,
      },
      null,
      2
    ),
    responseCodes: [
      { status: 200, description: 'Past flights purged' },
      { status: 400, description: 'Invalid payload' },
      { status: 403, description: 'Requires admin scope' },
    ],
  },
  {
    id: 'lookup-route',
    tag: 'Flight Actions',
    method: 'POST',
    path: '/api/v1/flights/lookup-route',
    summary: 'Resolve airport pair(s) for a flight number',
    description:
      'Resolves origin and destination IATA airport pair(s) for a carrier code and flight number.',
    requiredScope: 'read',
    parameters: [],
    bodyFields: [
      { name: 'airline', type: 'string', required: true, description: '2-character IATA carrier code (e.g. DL).' },
      { name: 'flightNumber', type: 'string', required: true, description: 'Numeric flight number (e.g. 452).' },
      { name: 'departureDate', type: 'YYYY-MM-DD', required: false, description: 'Optional departure date hint.' },
    ],
    exampleBody: JSON.stringify(
      {
        airline: 'DL',
        flightNumber: '452',
      },
      null,
      2
    ),
    responseCodes: [
      { status: 200, description: 'Route resolved' },
      { status: 400, description: 'Invalid carrier or flight number' },
      { status: 404, description: 'Route not found' },
    ],
  },
  {
    id: 'list-email-queue',
    tag: 'Email Queue',
    method: 'GET',
    path: '/api/v1/email-queue',
    summary: 'Inspect pending parsed email events',
    description:
      'Lists pending booking confirmations, schedule changes, and cancellations parsed by the Email Scanner.',
    requiredScope: 'read',
    parameters: [],
    responseCodes: [
      { status: 200, description: 'Pending email queue items' },
      { status: 401, description: 'Unauthorized' },
    ],
  },
  {
    id: 'approve-email-queue',
    tag: 'Email Queue',
    method: 'POST',
    path: '/api/v1/email-queue/{id}/approve',
    summary: 'Approve & apply a queued email event',
    description:
      'Approves a pending email queue item (with optional field overrides) and creates or updates the matched flight.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Email queue item ID.', defaultValue: '1' },
    ],
    exampleBody: '{}',
    responseCodes: [
      { status: 200, description: 'Email queue item approved' },
      { status: 400, description: 'Missing required flight fields or already resolved' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Queue item not found' },
    ],
  },
  {
    id: 'deny-email-queue',
    tag: 'Email Queue',
    method: 'POST',
    path: '/api/v1/email-queue/{id}/deny',
    summary: 'Deny & dismiss a queued email event',
    description: 'Dismisses a pending email queue item without modifying tracked flights.',
    requiredScope: 'write',
    parameters: [
      { name: 'id', in: 'path', required: true, type: 'integer', description: 'Email queue item ID.', defaultValue: '1' },
    ],
    exampleBody: '{}',
    responseCodes: [
      { status: 200, description: 'Email queue item denied' },
      { status: 403, description: 'Requires write scope' },
      { status: 404, description: 'Queue item not found' },
    ],
  },
  {
    id: 'system-status',
    tag: 'System',
    method: 'GET',
    path: '/api/v1/system/status',
    summary: 'Get instance status & provider quotas',
    description:
      'Returns FlightSentry version, active currency, configured points currencies, global pause/circuit-breaker status, flight counts, and sanitized per-provider quota usage/remaining counts.',
    requiredScope: 'read',
    parameters: [],
    responseCodes: [
      { status: 200, description: 'System status returned' },
      { status: 401, description: 'Unauthorized' },
    ],
  },
  {
    id: 'openapi-spec',
    tag: 'System',
    method: 'GET',
    path: '/api/v1/openapi.json',
    summary: 'Get machine-readable OpenAPI 3.1 spec',
    description: 'Returns the OpenAPI 3.1.0 JSON specification for all Public API v1 endpoints.',
    requiredScope: 'read',
    parameters: [],
    responseCodes: [
      { status: 200, description: 'OpenAPI 3.1 JSON document' },
      { status: 401, description: 'Unauthorized' },
    ],
  },
];

const TAG_FILTERS = [
  'All',
  'Flights',
  'Flight Actions',
  'Email Queue',
  'System',
] as const;

export default function ApiReferenceViewer({ specVersion }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [authHeaderMode, setAuthHeaderMode] = useState<'bearer' | 'x-api-key'>(
    'bearer'
  );
  const [selectedTag, setSelectedTag] =
    useState<(typeof TAG_FILTERS)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:4000');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const filteredEndpoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ENDPOINTS.filter((ep) => {
      if (selectedTag !== 'All' && ep.tag !== selectedTag) {
        return false;
      }
      if (!q) return true;
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.description.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedTag]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
              Public API Reference
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-sky-950/70 border border-sky-700/70 text-[11px] font-mono font-semibold text-sky-300">
              v{specVersion} · OpenAPI 3.1
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gunmetal-muted">
            Versioned REST API (<code className="text-slate-300">/api/v1/*</code>) for external dashboards, widgets, and automation workflows.
          </p>
        </div>

        <Link
          href="/settings/security"
          className="self-start sm:self-center min-h-[44px] sm:min-h-[38px] px-3.5 py-2 rounded-lg bg-gunmetal-canvas hover:bg-gunmetal-border border border-gunmetal-border text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>
      </div>

      <ApiAuthBar
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        authHeaderMode={authHeaderMode}
        onAuthHeaderModeChange={setAuthHeaderMode}
        baseUrl={baseUrl}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-gunmetal-card border border-gunmetal-border space-y-1">
          <p className="font-semibold text-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scoped Access</span>
          </p>
          <p className="text-gunmetal-muted leading-relaxed">
            <code className="text-sky-300">read</code> for widgets,{' '}
            <code className="text-amber-300">write</code> for automations, and{' '}
            <code className="text-rose-300">admin</code> for past-flight cleanup.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-gunmetal-card border border-gunmetal-border space-y-1">
          <p className="font-semibold text-slate-100">Sliding-Window Rate Limit</p>
          <p className="text-gunmetal-muted leading-relaxed">
            Default 120 requests/minute per API key with{' '}
            <code className="text-slate-300">X-RateLimit-*</code> and{' '}
            <code className="text-slate-300">Retry-After</code> headers.
          </p>
        </div>
        <div className="p-3.5 rounded-xl bg-gunmetal-card border border-gunmetal-border space-y-1">
          <p className="font-semibold text-slate-100">Standard Error Envelope</p>
          <p className="text-gunmetal-muted leading-relaxed">
            Errors return{' '}
            <code className="text-slate-300">
              {`{"error":{"code":"...","message":"..."}}`}
            </code>{' '}
            with HTTP 400, 401, 403, 404, or 429.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TAG_FILTERS.map((tag) => {
            const active = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-gunmetal-border border-slate-500 text-slate-100 shadow-sm'
                    : 'bg-gunmetal-card border-gunmetal-border text-gunmetal-muted hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-gunmetal-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter endpoints..."
            className="w-full min-h-[44px] sm:min-h-[36px] pl-8 pr-3 py-1.5 rounded-md bg-gunmetal-card border border-gunmetal-border text-sm sm:text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredEndpoints.length === 0 ? (
          <div className="p-6 rounded-xl bg-gunmetal-card border border-gunmetal-border text-center text-xs text-gunmetal-muted">
            No API endpoints match your current filter.
          </div>
        ) : (
          filteredEndpoints.map((ep) => (
            <EndpointCard
              key={ep.id}
              endpoint={ep}
              apiKey={apiKey}
              authHeaderMode={authHeaderMode}
              baseUrl={baseUrl}
            />
          ))
        )}
      </div>
    </div>
  );
}