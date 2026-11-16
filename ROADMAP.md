# FlightSentry Roadmap

*Last updated: 2026-11-15*  
*Current Version: v0.9.0*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.9.1: Public API
- **API Key Management, Scopes & Authentication**
  - Add named API key generation, expiration (optional), and revocation in **Settings → Security** (`api_keys` SQLite table storing SHA-256 key hashes, key prefix `fss_live_...`, `lastUsedAt`, and scope permissions, displaying the raw token once on creation).
  - Support scoped access (`read`, `write`, `admin`) so read-only dashboard widgets (Home Assistant, Homepage, TRMNL) can use restricted keys while automation scripts use `write` keys.
  - Authenticate `/api/v1/*` requests via `Authorization: Bearer <key>` or `X-API-Key` headers (integrated into `src/services/auth/apiGuard.ts` ahead of the web-login-disabled check, with `requireApiScope` enforcement for `read` / `write` / `admin`) and standardized JSON error envelopes (`401 Unauthorized`, `403 Forbidden`, `429 Too Many Requests`, `400 Bad Request`).
  - Add per-key sliding-window rate limiting and audit logging (`api_request_logs` or `datasource_logs`).
- **Versioned Flight & Price History Endpoints (`/api/v1/flights`)**
  - `GET /api/v1/flights`: List tracked flights with optional query filters (`status`, `searchMode`, `airline`, `origin`, `destination`, `isManual`, `currency`) and normalized price summary fields (`currentPrice`, `baselinePrice`, `purchasePrice`, `allTimeLow`, `allTimeHigh`, `priceDelta`, `priceDeltaPercent`, and `nonstop` vs. `withStops` floor breakdown when available).
  - `GET /api/v1/flights/:id`: Return full flight details (including `bookingAirline`, alliances, co-location clusters, alert thresholds, and schedule cadence) alongside paginated `price_history` checks and competitor carrier breakdowns.
  - `POST /api/v1/flights`: Create a watched route, watched flight, or booked flight (cash automated, cash manual, or points/miles), supporting all search preferences (`maxStops`, `fareTier`, `cabinClass`, `noRedeye`, `includedAirlines`, `excludedAirlines`, `includedAlliances`, `excludedAlliances`, `monitorRouteAlternatives`), `notes`, and an optional `runInitialCheck` flag.
  - `PATCH /api/v1/flights/:id`: Update flight settings, pause/resume automated checks (enforcing manual/points guards), or update alert thresholds.
  - `DELETE /api/v1/flights/:id`: Delete a tracked flight and its associated price history.
- **Flight Lifecycle & Action Endpoints**
  - `POST /api/v1/flights/:id/check`: Trigger an immediate live price check (respecting global pause, circuit breaker, provider quotas, and manual/points mode locks) and return the updated fare, provider used, and next scheduled check timestamp.
  - `POST /api/v1/flights/:id/history`: Log a manual price/points check or competing route flight entry onto an existing flight's history timeline.
  - `POST /api/v1/flights/:id/convert`: Convert a `Watching` flight to `Booked` in place with `purchasePrice`, `airline`, `flightNumber`, and `pnr`.
  - `POST /api/v1/flights/:id/rebook`: Log a post-booking rebook or fare credit adjustment, recording the savings milestone in `price_history`.
  - `POST /api/v1/flights/cleanup-past`: Purge archived `Past` flights by retention window or all past flights.
- **Route Lookup, Email Queue & System Telemetry Endpoints**
  - `POST /api/v1/flights/lookup-route`: Resolve origin/destination airport pair(s) for a carrier and flight number.
  - `GET /api/v1/email-queue` & `POST /api/v1/email-queue/:id/approve` | `deny`: Inspect and act on pending parsed flight emails from external automations (n8n, Home Assistant, Shortcuts).
  - `GET /api/v1/system/status`: Return instance version, active currency, configured points currencies, global pause/circuit-breaker state, and per-provider quota usage/remaining counts.
- **OpenAPI Specification & API Reference**
  - Serve a machine-readable OpenAPI 3.1 spec at `GET /api/v1/openapi.json` and an interactive **API Reference** viewer (linked in **Settings → Security**).

### Release v0.9.2a: Brand Optimization
- go through and ensure that branding and theming is consistent across the entire app. Look at colors, look at modal size, look at everything. Deep dive and report back. What is different, what is not. And then we'll make a plan for the next release.
- Create DETAILED design guide

### Release v0.9.2: Brand Optimization Application
- Brand Optimization Application

### Release v0.9.3: Mobile Optimization
- **Mobile Experience Optimization:**
  - Convert or confirm all modals to responsive full-height bottom-sheets on mobile viewports (use whatever flightmodal uses as a standard).
  - Standardize touch targets across all form inputs, toggles, tags, and action buttons.
  - Add touch-friendly everything across that app
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized
- Multiple phases so testing and changes are not massive, a lot of modals already optimized

### Release v0.9.4a: Research Only, Security and Best Practices Audit
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
- Make a plan for another ai for v0.9.4 for fixes, no fixes today. Be clear and concise.
- Double check results. It will be compared against another ai. 

### Release v0.9.4: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.9.5: Production Prep
- **Single-Container Consolidation & Entrypoint**
  - Combine `web` and `worker` into one container via a startup entrypoint script (`ENTRYPOINT` / `CMD` baked into `Dockerfile` so `docker run`, Unraid, and Portainer work out of the box) with automatic worker restart on unexpected exit.
  - Respect dynamic `PORT` environment variables.
- **Graceful Shutdown & SQLite Integrity**
  - Handle `SIGTERM` and `SIGINT` across the entrypoint and `src/services/background.ts` to run `PRAGMA wal_checkpoint(TRUNCATE)` and close SQLite cleanly without orphaned `-wal`/`-shm` files.
- **Healthcheck & Multi-Stage Non-Root Image**
  - Add an unauthenticated `GET /api/health` endpoint (exempted in `src/middleware.ts`) verifying SQLite read/write readiness and wire it to a `Dockerfile` `HEALTHCHECK`.
  - Refactor `Dockerfile` to a multi-stage build that strips build toolchains (`python3`, `make`, `g++`, `sqlite-dev`) from the final runtime image and drops privileges from `root` to `node` after initializing `/app/data`.
- **`/app/data` Cleanup & Standardization**
  - Centralize data directory and `DATABASE_PATH` resolution across SQLite (`flightsentry.db`), `.encryption_key`, and `.auth_secret` so all persistent state lives cleanly under `/app/data` (or the configured data path).
  - Exclude placeholder `.gitkeep` files from the container image and ensure `/app/data` initializes with writable permissions on first boot.
- **Docker Compose & Environment Config**
  - Update `docker-compose.yml` to a standard single-service example (`thebronway/flightsentry:latest`, `./data:/app/data`, port `4000:4000`) with `ENABLE_API_TESTER` removed so the dev tester remains opt-in.
  - Update `.env.example` to document optional self-hosted overrides (`PORT`, `TZ`, `DATABASE_PATH`, `ENCRYPTION_SECRET`, `AUTH_USERNAME`, `AUTH_PASSWORD`) while keeping `.env` optional.

### Release v0.9.6: Multi-Architecture Docker Builds
- **Automated Multi-Arch CI/CD (`linux/amd64` & `linux/arm64`)**
  - Add a GitHub Actions workflow using `docker/setup-qemu-action`, `docker/setup-buildx-action`, and `docker/build-push-action` to build and push multi-architecture images (`linux/amd64`, `linux/arm64`) to Docker Hub (`thebronway/flightsentry`) on version tags.
  - Validate native `better-sqlite3` compilation and startup health checks on ARM64 (Raspberry Pi / ARM servers) prior to `v1.0.0`.

### Release v0.9.7
- Site Launch
    - User Guide
    - Quickstart Guide
    - API Documentation
  - Sections and layout for both the main app FlightSentry and the FlightSentryScraper (mostly just api documention)
  - Follow Design Guide, but its okay to use addtional elements
  - What screenshots do you need?
  - No public demo yet
  - No hosted version yet (but coming in the future)
- Final tweaks
  - Email queue in two places, only need one
  - Make Settings Tabs Persistent like settings/general
  - Does settings tab order make sense?

### Release v0.9.8
- Playwright?
- Another Security Audit

### Release v0.9.9
- README finalize

### Release v1.0.0
- GitHub, Docker Release


### Release v1.5.0
- Points Path Search?