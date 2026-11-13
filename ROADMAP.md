# FlightSentry Roadmap

*Last updated: 2026-11-12*  
*Current Version: v0.8.2*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.8.3: Replace Fast-Flights with FlightSentry-Scraper Integration
- **Security & Architecture Rules**
  - **URL Validation:** Validate `flightsentryScraperUrl` via Zod (`safeHttpUrlSchema`) allowing `http:` and `https:` schemes across any user-configured host and port, rejecting embedded credentials, and stripping trailing slashes.
  - **Credential Handling:** Store `flightsentryScraperApiKey` in SQLite `settings`, mask it in Settings with `type="password"`, and exclude `fss_...` tokens from console logs and `datasource_logs.errorMessage`.
  - **Circuit Breaker Isolation:** Neither a `429 RateLimited` nor a `503 Paused` response from `flightsentry-scraper` may set `settings.circuitBreakerUntil`; fail over immediately to the next active metered provider (`SerpAPI`, `SearchApi.io`, `HasData`).
  - **Queue & Jitter:** Remove the `2,000 ms–4,500 ms` pre-request sleep in `src/services/datasource.ts`; `FlightSentry-Scraper` manages its own serial FIFO queue (`concurrency = 1`) and jitter internally.
- **Remove `fast-flights-ts`**
  - Uninstall `fast-flights-ts` from `package.json`.
  - Remove `'fast-flights-ts'` from `experimental.serverComponentsExternalPackages` in `next.config.js`.
  - Delete `src/services/fastflights.ts`.
- **Database Schema & Migrations (`src/db/schema.ts`, `src/db/init.ts`, `src/db/settings.ts`)**
  - Add columns to `settings`:
    - `flightsentryScraperEnabled INTEGER NOT NULL DEFAULT 0`
    - `flightsentryScraperUrl TEXT`
    - `flightsentryScraperApiKey TEXT`
    - `flightsentryScraperPaused INTEGER NOT NULL DEFAULT 0`
    - `flightsentryScraperUsed INTEGER NOT NULL DEFAULT 0`
  - Add idempotent `ALTER TABLE settings ADD COLUMN` migrations in `initDb()` (`src/db/init.ts`).
  - Migrate `settings.dataSourceStrategy` in `initDb()` by replacing `fastflights` with `flightsentry-scraper` and removing legacy `fli` entries.
  - Update `settingsDb.update()`, `incrementApiUsage()`, and `resetApiUsage()` in `src/db/settings.ts` for `'flightsentry-scraper'` (`flightsentryScraperUsed`).
- **Types & Validation (`src/types/index.ts`, `src/utils/validation.ts`)**
  - Replace `fastFlightsEnabled`, `fastFlightsQuota`, `fastFlightsUsed`, and `fastFlightsPaused` on `Settings` (`src/types/index.ts`) with `flightsentryScraperEnabled`, `flightsentryScraperUrl`, `flightsentryScraperApiKey`, `flightsentryScraperPaused`, and `flightsentryScraperUsed`.
  - Add `'Paused'` to check/scrape status unions where remote scraper status is surfaced.
  - Update `settingsSchema` (`src/utils/validation.ts`) to validate `flightsentryScraperEnabled` (`0 | 1`), `flightsentryScraperPaused` (`0 | 1`), `flightsentryScraperUrl` (`http:` / `https:` URL or empty/`null`), and `flightsentryScraperApiKey` (`^fss_[a-f0-9]{64}$` or empty/`null`).
- **Provider Adapter (`src/services/flightsentryScraper.ts`)**
  - Return `status: 'Error'` if `flightsentryScraperUrl` or `flightsentryScraperApiKey` is missing.
  - Call `GET /api/v1/health` (`5,000 ms` timeout) before scraping to inspect `status` (`'ok' | 'rate_limited' | 'cooldown' | 'paused'`), `state` (`'ready' | 'rate_limited' | 'cooldown' | 'paused'`), `paused`, `circuitBreakerActive`, `rateLimited`, `statusReason`, `retryAfter`, `queueDepth`, and `usage` (`hourlyUsed`, `hourlyLimit`, `dailyUsed`, `dailyLimit`):
    - If `paused === true` (`state === 'paused'`), return `status: 'Paused'` without calling `/api/v1/scrape` (note: API key tokens have read-only status visibility and cannot toggle remote pause).
    - If `circuitBreakerActive === true`, `rateLimited === true`, `usage.hourlyUsed >= usage.hourlyLimit`, or `usage.dailyUsed >= usage.dailyLimit`, return `status: 'RateLimited'` without calling `/api/v1/scrape`.
  - Call `POST /api/v1/scrape` (`90,000 ms` timeout, `includeRaw: false`) passing:
    - `origin` and `destination` as `string[]` resolved via `resolveToAirportList()` (`src/utils/coLocations.ts`)
    - `departureDate`, `cabinClass`, `fareTier` (`'Basic Economy'` → `'Basic'`, `'Standard'` → `'Standard'`), and `currency`
    - In `Route` mode: `maxStops` (`0..2`), expanded `includedAirlines`, and expanded `excludedAirlines`
    - In `FlightNumber` mode: `airline` and `flightNumber` only when `monitorRouteAlternatives !== 1`; omit both when `monitorRouteAlternatives === 1`
  - Handle `HTTP 503` / `status === 'Paused'` from `/api/v1/scrape` by returning `status: 'Paused'` cleanly without consuming quota or tripping the circuit breaker.
  - Map `ScraperItinerary[]` to `RouteItinerary[]` (preserving `maxLayoverMinutes` and `legs`), apply `filterItinerariesBySearchPreferences()`, match `FlightNumber` across `flightNumber` and `legs[]`, and return the lowest qualifying fare with `eligibleItineraries`.
- **Router, Execution Entry Points & Quota (`src/services/datasource.ts`, `src/services/scheduler.ts`, `src/app/api/flights/[id]/check/route.ts`, `src/services/quota.ts`, `src/utils/airline.ts`)**
  - Replace `'fastflights'` with `'flightsentry-scraper'` in `DataSourceProvider` (`src/services/datasource.ts`), require enabled + locally unpaused + non-empty URL and API key in `activeUnmetered`, and remove pre-request jitter.
  - Skip updating `settings.circuitBreakerUntil` in both `src/services/scheduler.ts` and `src/app/api/flights/[id]/check/route.ts` when `result.sourceUsed === 'flightsentry-scraper'` returns `RateLimited` or `Paused`, failing over to the next active provider.
  - Update `canMakeApiCall()` (`src/services/quota.ts`) and `getDataSourceStatus()` (`src/utils/airline.ts`) to check `flightsentryScraperEnabled`, `flightsentryScraperPaused`, `flightsentryScraperUrl`, and `flightsentryScraperApiKey`.
- **Settings UI, Quota Ribbon & History Badges**
  - Update `UnmeteredScraperCard.tsx` and `DataSourcesTab.tsx` with `FlightSentry-Scraper` label, inputs for **Scraper Base URL** and masked **API Key** (`type="password"`), and a **Test Connection & Quota** button calling `POST /api/settings/test-scraper` (`GET /api/v1/health`) to display `version`, `state` (`Ready`, `Paused`, `Cooldown`, `Rate Limited`), `paused` status (`statusReason`), `circuitBreakerActive`, `queueDepth`, and rolling `hourlyUsed / hourlyLimit` and `dailyUsed / dailyLimit` quotas.
  - Update `QuotaRibbon.tsx` and `src/components/quotaRibbon/types.ts` to replace `fastflights` / `fastFlightsPaused` with `flightsentry-scraper` / `flightsentryScraperPaused`, reflecting orange paused styling when paused locally or remotely via `/api/v1/health`.
  - Update `HistoryCheckBadges.tsx` (`SOURCE_LABEL_MAP`) to map `'flightsentry-scraper'` to `FlightSentry-Scraper`, keep `'fastflights'` mapped to `Fast-Flights`, and render an orange `Paused` badge when a check returns `Paused`.
  - Update `SettingsForm.tsx` and `src/app/page.tsx` (`handleUnpauseAll`) to use `flightsentryScraperPaused` and `'flightsentry-scraper'`.

### Release v0.8.4: Dev API
- **Env-Gated Internal Test Page (`/api-test`)**
  - Build a dedicated `/api-test` UI page and `POST /api/dev/provider-test` endpoint directly into the main FlightSentry image, gated by `ENABLE_API_TESTER=true` (returning `404` when unset or `false`).
- **Saved & Temporary Provider Key Testing**
  - Use existing API keys and scraper URLs saved in SQLite by default (resolved server-side without exposing stored secrets in the UI, and incrementing that provider's quota counter so usage tracking stays accurate).
  - Allow an optional temporary key override per provider (never saved to SQLite and excluded from saved key quota counters).
  - Execute FlightSentry's actual production provider adapters (`SerpAPI`, `SearchApi.io`, `HasData`, `FlightSentry-Scraper`) against configurable origin, destination, date, cabin class, and optional flight number inputs.
- **Result Parity & Raw Payload Inspection**
  - Run selected providers side-by-side and flag mismatches across normalized fields (carrier, flight number, price, stops, departure/arrival times) to verify all providers return consistent results.
  - Display per-provider latency, parsed flight count, error details, and collapsible raw upstream JSON responses to quickly catch breaking API or scraper changes.

### Release v0.8.5: bug fixes / app tweaks
- App wide
  - google flights link(s) dont work
- Flight Modal Flight Lookups
  - what happens when airlines use the same flight number for multiple flights? How do we deal with that in the UI
  - it is sometimes auto-checking for route and putting in the route before I finish typing in the number, so maybe don't auto-check until I get to four numbers or until time has passed or until like focus like it's you're out of the cell or something, you know what I mean. Need to come up with a good solution. need options
- Data Sources
  - Data Sources can be one time or monthly, need to support both modes per data source.
- Dashboard
  - Old flights cleanup worth it? maybe keep 1 year, but user changeable in settings? performance implications? Maybe a cleanup button in settings? Okay with just keeping everything archived. Discuss/options first.

### Release v0.8.6: UX/UI tweaks
- Flight Modal
  - Quick add
  - If selecting any miles (ex AA miles, must be a oneworld airline, etc.) airline or airline alliance (or partership like UA and JB) should be selected as carrier. Not hard stop, just warning message. Also we can change Carrier Code to Carrier. And add booking carrier, if not specified used carrier. Need a way to differentiate for non-aviation people. 
  - fast flights does not support basic economy, so we need a way in the UI to denote that show that something. You know what I mean, like need to forget this out
  - Manual Mode, also monitor route hide / disable?
    - when booking with points, maybe if they add the cash fare, then it can track it. I don't know, we need to rethink that process.

### Release v0.8.7a: Brand Optimization
- go through and ensure that branding and theming is consistent across the entire app. Look at colors, look at modal size, look at everything. Deep dive and report back. What is different, what is not. And then we'll make a plan for the next release.

### Release v0.8.7: Brand Optimization Application
- Brand Optimization Application

### Release v0.8.8: Mobile Optimization
- **Mobile Experience Optimization:**
  - Convert or confirm all modals to responsive full-height bottom-sheets on mobile viewports (use whatever flightmodal uses as a standard).
  - Standardize touch targets across all form inputs, toggles, tags, and action buttons.
  - Add touch-friendly everything across that app
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized
- Multiple phases so testing and changes are not massive.

### Release v0.8.9a: Research Only, Security and Best Practices Audit
- Look for hacks
- Look for non stable components
- Look for monolthic files / lack of folder organization
- Look for security issues
- Look for things that do not follow best practices 
- Look for missing/deprecated/no longer used imports
- Look for duplicate components that should be reused instead
- Look for inconsistent theming or elements
- Look to clean up database alters, no one has old database, clean up to make it better
- Every above item should be its own phase, and then when developing a plan, reference previous findings
- Make a plan for another ai for v0.8.8 for fixes, no fixes today. Be clear and concise.
- Double check results. It will be compared against another ai. 

### Release v0.8.9: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.9.0: Production Prep
- **Single-Container Consolidation**
  - Combine `web` and `worker` into one container via a startup entrypoint script with clean `SIGTERM` shutdown handling and automatic worker restart on exit.
  - Respect dynamic `PORT` environment variables and ensure `/app/data` initializes with writable permissions on first boot.
- **Docker Compose & Environment Config**
  - Update `docker-compose.yml` to a standard single-service example (`thebronway/flightsentry:latest`, `./data:/app/data`, port `4000:4000`).
  - Add a minimal `.env.example` documenting optional overrides (`PORT`, `TZ`, `DATABASE_PATH`, `HOSTING_PLATFORM`, `DISABLE_UPDATE_BANNER`, `ENABLE_LOCAL`) while keeping `.env` optional.
  - Add DISABLE_UPDATE_BANNER optional docker env. if set to true disable update banner. Deafult is false
  - Add ENABLE_LOCAL optional docker env. if set to false, disable flightsentry-scraper integration. Defailt is true
- **Railway & PikaPods Prep**
  - Add `HOSTING_PLATFORM` env support so managed hosts (like PikaPods) can be identified by the app.
  - Prepare one-click Railway template config (single `/app/data` volume) and PikaPods catalog requirements (including optional basic login auth for public pod URLs).

### Release v0.9.1
- TBD

### Release v0.9.2: Public API
- **API Key Management & Authentication**
  - Add named API key generation and revocation in Settings (stored hashed in SQLite and displayed once upon creation).
  - Authenticate external requests via `Authorization: Bearer <key>` (or `X-API-Key`) header with clean JSON `401`/`403` error responses.
- **Versioned Flight Endpoints (`/api/v1/flights`)**
  - `GET /api/v1/flights` & `GET /api/v1/flights/:id`: Return tracked flights including route, dates, airline, flight number, cabin class, booked/baseline price, current lowest price, price delta, status, and price history.
  - `POST /api/v1/flights`: Add a flight to track with full itinerary details, booked price, optional external reference/notes, and an option to trigger an immediate initial price check.
  - `PATCH /api/v1/flights/:id` & `DELETE /api/v1/flights/:id`: Update flight details (such as resetting the booked price after rebooking or pausing tracking) and delete tracked flights.
  - Anyother endpoints needed.
- **Link to API Reference on website**

### Release v0.9.3
- New API providers
  - Links to get API keys
  - Referral links

### Release v0.9.4
- TBD

### Release v0.9.5
- Site Launch
    - User Guide
    - Quickstart Guide
    - API Documentation
  
### Release v0.9.6
- TBD

### Release v0.9.7
- TBD

### Release v0.9.8
- TBD

### Release v0.9.9
- README finalize

### Release v1.0.0
- GitHub, Docker, Railway and PikaPods Release

PikaPods: Non-technical users pick an app from their catalog and PikaPods spins up a private, isolated container with persistent storage, SSL, and automatic image updates starting around $1.80–$3.00/month (billed hourly from prepaid credit, with a $5 welcome credit for new users). Each user still gets their own private single-user FlightSentry instance and plugs in their own API keys, while PikaPods handles all servers, billing, and uptime. If you reach out to them (hello@pikapods.com) once FlightSentry is ready for a wider audience, they offer a developer agreement that pays 20% of the hosting revenue your app generates.

Railway: Self-serve—you can publish a 1-click Docker template with a persistent volume for SQLite without waiting for catalog approval.