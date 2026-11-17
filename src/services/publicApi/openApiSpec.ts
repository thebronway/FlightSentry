import packageInfo from '../../../package.json';

export interface OpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  security: Array<Record<string, string[]>>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, unknown>;
    responses: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
}

export function buildOpenApiSpec(serverUrl = 'http://localhost:4000'): OpenApiDocument {
  const cleanServerUrl = serverUrl.replace(/\/+$/, '');

  return {
    openapi: '3.1.0',
    info: {
      title: 'FlightSentry Public API',
      version: packageInfo.version,
      description:
        'Versioned REST API for querying tracked flights, logging fares, triggering live price checks, managing the email review queue, and inspecting system telemetry. Authenticate every /api/v1/* request with an API key created in Settings -> Security via `Authorization: Bearer fss_live_...` or `X-API-Key`.',
    },
    servers: [
      {
        url: cleanServerUrl,
        description: 'Current FlightSentry Instance',
      },
    ],
    security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
    tags: [
      {
        name: 'Flights',
        description: 'Create, list, inspect, update, and delete tracked routes and flights.',
      },
      {
        name: 'Flight Actions',
        description: 'Trigger live price checks, log manual history, convert to Booked, rebook, and run maintenance tasks.',
      },
      {
        name: 'Email Queue',
        description: 'Inspect and approve or deny parsed airline booking, schedule change, and cancellation emails.',
      },
      {
        name: 'System',
        description: 'Instance status, provider quota telemetry, and machine-readable OpenAPI schema.',
      },
    ],
    paths: {
      '/api/v1/flights': {
        get: {
          tags: ['Flights'],
          summary: 'List tracked flights',
          description:
            'Returns all tracked flights matching optional query filters, including normalized price summary metrics (`currentPrice`, `baselinePrice`, `purchasePrice`, `allTimeLow`, `allTimeHigh`, `priceDelta`, `priceDeltaPercent`) and `nonstop` vs `withStops` floor breakdown.',
          'x-required-scope': 'read',
          parameters: [
            {
              name: 'status',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['Watching', 'Booked', 'Paused', 'Past'] },
              description: 'Filter by flight lifecycle status.',
            },
            {
              name: 'searchMode',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['Route', 'FlightNumber'] },
              description: 'Filter by tracking mode.',
            },
            {
              name: 'airline',
              in: 'query',
              required: false,
              schema: { type: 'string', example: 'DL' },
              description: 'Filter by 2-character IATA operating or booking carrier code.',
            },
            {
              name: 'origin',
              in: 'query',
              required: false,
              schema: { type: 'string', example: 'JFK' },
              description: 'Filter by origin IATA airport or metro code.',
            },
            {
              name: 'destination',
              in: 'query',
              required: false,
              schema: { type: 'string', example: 'LAX' },
              description: 'Filter by destination IATA airport or metro code.',
            },
            {
              name: 'isManual',
              in: 'query',
              required: false,
              schema: { type: 'boolean' },
              description: 'Filter by manual/points tracking mode (`true` or `false`).',
            },
            {
              name: 'currency',
              in: 'query',
              required: false,
              schema: { type: 'string', example: 'USD' },
              description: 'Filter by currency or loyalty points label.',
            },
          ],
          responses: {
            '200': {
              description: 'List of tracked flights.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      flights: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/FlightSummary' },
                      },
                      count: { type: 'integer' },
                      defaultCurrency: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
        post: {
          tags: ['Flights'],
          summary: 'Create a tracked route or flight',
          description:
            'Creates a watched route, watched flight, or booked flight (cash automated, cash manual, or points/miles). By default runs an immediate live price check unless `runInitialCheck` is `false` or the flight uses Manual/Points tracking.',
          'x-required-scope': 'write',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateFlightRequest' },
                example: {
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
              },
            },
          },
          responses: {
            '201': {
              description: 'Flight created.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      flight: { $ref: '#/components/schemas/FlightSummary' },
                      initialCheckExecuted: { type: 'boolean' },
                      providerUsed: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
      },
      '/api/v1/flights/{id}': {
        get: {
          tags: ['Flights'],
          summary: 'Get full flight details & price history',
          description:
            'Returns complete flight metadata (including `bookingAirline`, alliances, co-location clusters, alert thresholds, schedule cadence, and competitor carrier breakdowns) alongside paginated `price_history` records.',
          'x-required-scope': 'read',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Numeric flight ID.',
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
              description: 'Maximum price history records to return.',
            },
            {
              name: 'offset',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 0, default: 0 },
              description: 'Offset into the price history list.',
            },
          ],
          responses: {
            '200': {
              description: 'Detailed flight payload and paginated history.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      flight: { $ref: '#/components/schemas/FlightDetail' },
                      priceHistory: {
                        type: 'object',
                        properties: {
                          items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/PriceHistoryEntry' },
                          },
                          total: { type: 'integer' },
                          limit: { type: 'integer' },
                          offset: { type: 'integer' },
                          hasMore: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        patch: {
          tags: ['Flights'],
          summary: 'Update flight settings or pause/resume',
          description:
            'Partially updates flight settings, alert thresholds, notes, or lifecycle status (`Watching`, `Booked`, `Paused`, `Past`). Enforces Manual and Points pause guards.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Numeric flight ID.',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateFlightRequest' },
                example: {
                  status: 'Paused',
                  targetPrice: 275,
                  notes: 'Paused via Public API',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Updated flight summary.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      flight: { $ref: '#/components/schemas/FlightSummary' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Flights'],
          summary: 'Delete a tracked flight',
          description: 'Permanently deletes a tracked flight and its associated price history records.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Numeric flight ID.',
            },
          ],
          responses: {
            '200': {
              description: 'Flight deleted.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      deleted: { type: 'boolean', example: true },
                      id: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/flights/{id}/check': {
        post: {
          tags: ['Flight Actions'],
          summary: 'Trigger an immediate live price check',
          description:
            'Executes an on-demand fare search across active data sources (respecting global pause, circuit breaker, provider quotas, and Manual/Points locks), evaluates alert rules, and returns the updated price, provider used, and next scheduled check timestamp.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Numeric flight ID.',
            },
          ],
          responses: {
            '200': {
              description: 'Price check completed.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      status: { type: 'string' },
                      price: { type: ['number', 'null'] },
                      previousPrice: { type: 'number' },
                      providerUsed: { type: ['string', 'null'] },
                      nextCheckAt: { type: 'string', format: 'date-time' },
                      flight: { $ref: '#/components/schemas/FlightSummary' },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
            '429': { $ref: '#/components/responses/RateLimited' },
          },
        },
      },
      '/api/v1/flights/{id}/history': {
        post: {
          tags: ['Flight Actions'],
          summary: 'Log a manual price check or competitor entry',
          description:
            'Records a manual cash/points fare observation or competing carrier flight onto an existing flight timeline.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Numeric flight ID.',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LogHistoryRequest' },
                example: {
                  airline: 'B6',
                  flightNumber: '123',
                  price: 315,
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'History entry recorded.',
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/flights/{id}/convert': {
        post: {
          tags: ['Flight Actions'],
          summary: 'Convert a Watching flight to Booked',
          description:
            'Transitions a `Watching` flight to `Booked` in place with `purchasePrice`, `airline`, `flightNumber`, and optional `pnr`, preserving existing historical price checks.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Numeric flight ID.',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConvertFlightRequest' },
                example: {
                  purchasePrice: 315,
                  airline: 'B6',
                  flightNumber: '123',
                  pnr: 'ABC123',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Flight converted to Booked.',
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/flights/{id}/rebook': {
        post: {
          tags: ['Flight Actions'],
          summary: 'Log a post-booking rebook or fare credit',
          description:
            'Updates a `Booked` flight with a new lower fare (`newPrice`), preserves `originalPurchasePrice`, calculates `creditClaimed`, and records a milestone entry in `price_history`.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Numeric flight ID.',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RebookFlightRequest' },
                example: {
                  newPrice: 279,
                  pnr: 'ABC123',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Rebook adjustment recorded.',
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/flights/cleanup-past': {
        post: {
          tags: ['Flight Actions'],
          summary: 'Purge archived Past flights',
          description:
            'Deletes archived `Past` flights either across all past flights (`{"scope":"all"}`) or older than a retention window (`{"scope":"retention","retentionDays":30}`). Requires the `admin` scope.',
          'x-required-scope': 'admin',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CleanupPastRequest' },
                example: {
                  scope: 'retention',
                  retentionDays: 30,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Past flights purged.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      deletedCount: { type: 'integer' },
                      remainingPastCount: { type: 'integer' },
                      cutoffDate: { type: ['string', 'null'] },
                    },
                  },
                },
              },
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/v1/flights/lookup-route': {
        post: {
          tags: ['Flight Actions'],
          summary: 'Resolve airport pair(s) for a flight number',
          description:
            'Resolves origin and destination IATA airport pair(s) for a given 2-character airline code and numeric flight number.',
          'x-required-scope': 'read',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RouteLookupRequest' },
                example: {
                  airline: 'DL',
                  flightNumber: '452',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Resolved route(s).',
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/email-queue': {
        get: {
          tags: ['Email Queue'],
          summary: 'List pending parsed email events',
          description:
            'Returns all pending airline booking confirmation, schedule change, and cancellation items awaiting review.',
          'x-required-scope': 'read',
          responses: {
            '200': {
              description: 'Pending email queue items.',
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/email-queue/{id}/approve': {
        post: {
          tags: ['Email Queue'],
          summary: 'Approve & apply a queued email event',
          description:
            'Approves a pending email queue item (with optional field overrides) and creates or updates the corresponding tracked flight.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Email queue item ID.',
            },
          ],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { type: 'object' },
                example: {},
              },
            },
          },
          responses: {
            '200': {
              description: 'Queue item approved and applied.',
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/email-queue/{id}/deny': {
        post: {
          tags: ['Email Queue'],
          summary: 'Deny & dismiss a queued email event',
          description: 'Marks a pending email queue item as denied without modifying tracked flights.',
          'x-required-scope': 'write',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', example: 1 },
              description: 'Email queue item ID.',
            },
          ],
          responses: {
            '200': {
              description: 'Queue item denied.',
            },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/system/status': {
        get: {
          tags: ['System'],
          summary: 'Get instance status & provider quota telemetry',
          description:
            'Returns the FlightSentry version, active currency, configured points currencies, global pause/circuit-breaker state, flight counts, and sanitized per-provider quota usage/remaining counts.',
          'x-required-scope': 'read',
          responses: {
            '200': {
              description: 'Sanitized system telemetry.',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SystemStatus' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/openapi.json': {
        get: {
          tags: ['System'],
          summary: 'Retrieve OpenAPI 3.1 specification',
          description: 'Returns this machine-readable OpenAPI 3.1 JSON document.',
          'x-required-scope': 'read',
          responses: {
            '200': {
              description: 'OpenAPI 3.1 JSON specification.',
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'fss_live_<64-hex>',
          description: 'Pass API key as `Authorization: Bearer fss_live_...`',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Pass API key in the `X-API-Key` header.',
        },
      },
      responses: {
        BadRequest: {
          description: 'Validation or request error.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        Unauthorized: {
          description: 'Missing, invalid, expired, or revoked API key.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        Forbidden: {
          description: 'API key lacks the required scope (`read`, `write`, or `admin`).',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
        RateLimited: {
          description: 'Per-key rate limit, provider quota limit, or circuit breaker active.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorEnvelope' },
            },
          },
        },
      },
      schemas: {
        ErrorEnvelope: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'unauthorized' },
                message: { type: 'string', example: 'API key required.' },
                details: {},
              },
            },
          },
        },
        FlightSummary: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            searchMode: { type: 'string', enum: ['Route', 'FlightNumber'] },
            status: { type: 'string', enum: ['Watching', 'Booked', 'Paused', 'Past'] },
            origin: { type: ['string', 'null'] },
            destination: { type: ['string', 'null'] },
            departureDate: { type: 'string', format: 'date' },
            airline: { type: 'string' },
            bookingAirline: { type: ['string', 'null'] },
            flightNumber: { type: ['string', 'null'] },
            pnr: { type: ['string', 'null'] },
            fareTier: { type: 'string', enum: ['Basic Economy', 'Standard'] },
            cabinClass: {
              type: 'string',
              enum: ['economy', 'premium_economy', 'business', 'first'],
            },
            currency: { type: 'string' },
            taxesAmount: { type: ['number', 'null'] },
            taxesCurrency: { type: ['string', 'null'] },
            isManual: { type: 'boolean' },
            monitorRouteAlternatives: { type: 'boolean' },
            maxStops: { type: ['integer', 'null'] },
            noRedeye: { type: 'boolean' },
            currentPrice: { type: 'number' },
            baselinePrice: { type: 'number' },
            purchasePrice: { type: ['number', 'null'] },
            originalPurchasePrice: { type: ['number', 'null'] },
            targetPrice: { type: ['number', 'null'] },
            allTimeLow: { type: ['number', 'null'] },
            allTimeHigh: { type: ['number', 'null'] },
            priceDelta: { type: ['number', 'null'] },
            priceDeltaPercent: { type: ['number', 'null'] },
            stopBreakdown: {
              type: 'object',
              properties: {
                nonstop: { type: ['number', 'null'] },
                withStops: { type: ['number', 'null'] },
              },
            },
            notes: { type: ['string', 'null'] },
            bookingDate: { type: ['string', 'null'] },
            nextCheckAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        FlightDetail: {
          allOf: [
            { $ref: '#/components/schemas/FlightSummary' },
            {
              type: 'object',
              properties: {
                alliances: { type: 'object' },
                coLocations: { type: 'object' },
                alertThresholds: { type: 'object' },
                scheduleCadence: { type: 'object' },
                searchPreferences: { type: 'object' },
                stopMetrics: { type: 'object' },
                competitorBreakdown: { type: 'array', items: { type: 'object' } },
              },
            },
          ],
        },
        PriceHistoryEntry: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            flightId: { type: 'integer' },
            price: { type: 'number' },
            status: { type: 'string' },
            airline: { type: ['string', 'null'] },
            flightNumber: { type: ['string', 'null'] },
            metadata: { type: ['string', 'null'] },
            sourceUsed: { type: ['string', 'null'] },
            checkedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateFlightRequest: {
          type: 'object',
          required: ['searchMode', 'departureDate'],
          properties: {
            searchMode: { type: 'string', enum: ['Route', 'FlightNumber'] },
            origin: { type: 'string', example: 'JFK' },
            destination: { type: 'string', example: 'LAX' },
            departureDate: { type: 'string', format: 'date', example: '2026-12-20' },
            airline: { type: 'string', example: 'DL' },
            bookingAirline: { type: 'string' },
            flightNumber: { type: 'string', example: '452' },
            fareTier: { type: 'string', enum: ['Basic Economy', 'Standard'], default: 'Standard' },
            cabinClass: {
              type: 'string',
              enum: ['economy', 'premium_economy', 'business', 'first'],
              default: 'economy',
            },
            baselinePrice: { type: 'number' },
            purchasePrice: { type: 'number' },
            targetPrice: { type: 'number' },
            pnr: { type: 'string' },
            currency: { type: 'string' },
            taxesAmount: { type: ['number', 'null'] },
            taxesCurrency: { type: ['string', 'null'] },
            isManual: { type: 'integer', enum: [0, 1] },
            maxStops: { type: ['integer', 'null'], enum: [0, 1, 2, null] },
            noRedeye: { type: 'integer', enum: [0, 1] },
            includedAirlines: { type: ['string', 'null'] },
            excludedAirlines: { type: ['string', 'null'] },
            includedAlliances: { type: ['string', 'null'] },
            excludedAlliances: { type: ['string', 'null'] },
            monitorRouteAlternatives: { type: 'integer', enum: [0, 1] },
            notes: { type: ['string', 'null'] },
            runInitialCheck: { type: 'boolean', default: true },
          },
        },
        UpdateFlightRequest: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['Watching', 'Booked', 'Paused', 'Past'] },
            targetPrice: { type: ['number', 'null'] },
            minDropDollar: { type: ['number', 'null'] },
            minDropPercent: { type: ['number', 'null'] },
            minIncreaseDollar: { type: ['number', 'null'] },
            minIncreasePercent: { type: ['number', 'null'] },
            priceTrackingDirection: { type: 'string', enum: ['drop', 'increase', 'both'] },
            disableNotifications: { type: 'integer', enum: [0, 1] },
            taxesAmount: { type: ['number', 'null'] },
            taxesCurrency: { type: ['string', 'null'] },
            notes: { type: ['string', 'null'] },
          },
        },
        LogHistoryRequest: {
          type: 'object',
          required: ['price', 'airline'],
          properties: {
            price: { type: 'number', example: 315 },
            airline: { type: 'string', example: 'B6' },
            flightNumber: { type: 'string', example: '123' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
          },
        },
        ConvertFlightRequest: {
          type: 'object',
          required: ['purchasePrice', 'airline', 'flightNumber'],
          properties: {
            purchasePrice: { type: 'number', example: 315 },
            airline: { type: 'string', example: 'B6' },
            flightNumber: { type: 'string', example: '123' },
            pnr: { type: 'string', example: 'ABC123' },
            currency: { type: 'string' },
            taxesAmount: { type: ['number', 'null'] },
            taxesCurrency: { type: ['string', 'null'] },
            monitorRouteAlternatives: { type: 'integer', enum: [0, 1], default: 1 },
          },
        },
        RebookFlightRequest: {
          type: 'object',
          required: ['newPrice'],
          properties: {
            newPrice: { type: 'number', example: 279 },
            airline: { type: 'string' },
            flightNumber: { type: 'string' },
            origin: { type: 'string' },
            destination: { type: 'string' },
            pnr: { type: 'string' },
            notes: { type: 'string' },
            checkedAt: { type: 'string', format: 'date-time' },
          },
        },
        CleanupPastRequest: {
          type: 'object',
          required: ['scope'],
          properties: {
            scope: { type: 'string', enum: ['all', 'retention'] },
            retentionDays: { type: 'integer', minimum: 1, maximum: 3650 },
          },
        },
        RouteLookupRequest: {
          type: 'object',
          required: ['airline', 'flightNumber'],
          properties: {
            airline: { type: 'string', example: 'DL' },
            flightNumber: { type: 'string', example: '452' },
            departureDate: { type: 'string', format: 'date' },
          },
        },
        SystemStatus: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            timezone: { type: 'string' },
            activeCurrency: { type: 'string' },
            pointsCurrencies: { type: 'array', items: { type: 'string' } },
            globalPause: { type: 'boolean' },
            circuitBreaker: { type: 'object' },
            flightCounts: { type: 'object' },
            emailQueue: { type: 'object' },
            providers: { type: 'object' },
          },
        },
      },
    },
  };
}