# FlightSentry Roadmap

*Last updated: 2026-11-17*  
*Current Version: v0.9.6*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.9.7: Live Search Progress & Failover Popup
- **Search Router Progress Telemetry**
  - Display active provider label, flight/route context, and failover reason.
- **Compact Floating Search Popup**
  - displaying an active spinner, the data source currently being queried, and a live `amber` failover notice whenever a provider fails or hits a limit and switches to another.
  - Auto-dismiss ~1 second after the search completes, with a manual close (`X`) button.
- Do it for anytime a search is being done.

### Release v0.9.8: Brand Optimization Application
- Apply `DESIGN_GUIDE.md` across the entire app:
  - Standardize primary buttons to Translucent Slate Glass (`bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80`) and align secondary, toolbar, destructive, and semantic action buttons.
  - Consolidate status colors to canonical `sky`, `emerald`, `amber`, and `rose` tokens (removing stray `gray-*`, `blue-*`, `green-*`, `red-*`, and `yellow-*` classes).
  - Standardize all modals to the 3 desktop width tiers (`max-w-md`, `max-w-2xl`, `max-w-4xl lg:max-w-5xl xl:max-w-6xl`), full-screen mobile layouts for Tier 2 & 3 modals, `44px` minimum mobile touch targets, and single-line `lucide-react` imports.
  - Looks at the guide and make sure every element follows it, ask questions if there is uncertaintiy or ambiguity, happy to expand the guide if needed.

### Release v0.9.9: Email Scanner Overhaul & Dev Email Import Tester
- **IMAP Cursor Integrity & Scan Audit Trail**
  - Remove the `internalDate < baselineTimestamp` filter in `imapClient.ts` (`UIDNEXT - 1` baseline on account creation already prevents historical inbox backfill without silently dropping existing emails moved or re-filed into a monitored folder).
  - Only mark a `Message-ID` as seen in `email_seen_messages` when an event is queued, and persist per-message scan outcomes (`queued`, `duplicate`, `skipped` with subject, sender, and exact reason) in a capped `email_scan_logs` table surfaced in **Settings → Email Scanner**.
- **Structured MIME, Schema.org Microdata & iCalendar (`.ics`) Extractors**
  - Add recursive `message/rfc822` attachment unwrapping in `scannerService.ts` via `mailparser` so `.eml` forwards (Outlook, Apple Mail, Thunderbird) extract original headers (`From`, `Subject`, `Date`) and bodies natively.
  - Extend `schemaOrgParser.ts` with `cheerio` DOM parsing to extract Schema.org HTML Microdata (`[itemscope][itemtype*="FlightReservation"]` and `[itemprop]` elements) alongside JSON-LD.
  - Add an RFC 5545 iCalendar parser (`src/services/emailScanner/icsParser.ts` via `node-ical`) to extract flight segments, airport codes, timestamps, PNRs, and cancellations (`STATUS:CANCELLED` / `METHOD:CANCEL`) from `text/calendar` MIME parts and `.ics` attachments.
- **DOM-Segmented Multi-Leg Extraction Engine**
  - Replace regex HTML tag stripping in `textPreprocessor.ts` with `cheerio` DOM traversal that preserves `<tr>` / `<td>` table cells and block boundaries (`<div>`, `<p>`, `<section>`) instead of flattening adjacent columns together.
  - Refactor `heuristicParser.ts` and `src/services/emailScanner/parser/*` to segment round-trip, multi-city, and connecting itineraries into ordered `ParsedFlightEmailEvent[]` entries sharing the reservation PNR, attaching total paid fare or points to the primary leg without duplication.
  - Replace the hardcoded carrier list in `identityExtractor.ts` with dynamic lookups against `AIRLINE_THEMES` and `normalizeAirlineCode()`, broaden PNR matching (`Confirmation: ABC123`, `Booking Ref`, `Record Locator`, `PNR`), and support international `DD Mon` and `DD/MM/YYYY` date formats.
- **Dev Email Import Tester (`/email-test`)**
  - Add a dev-only `/email-test` workspace and `POST /api/dev/email-test` endpoint gated by `ENABLE_API_TESTER=true` (returning `404` when unset or `false`, matching `/api-test`).
  - Support `.eml` file upload and raw RFC 822 source paste executed strictly in memory through `parseEmailBuffer()` without advancing IMAP cursors or mutating `email_seen_messages`.
  - Display a step-by-step parser breakdown (resolved sender/carrier, parser tier hit, extracted legs, payment/points detection, matched tracked flight ID, and skip/rejection reasons) with an optional **Stage to Email Queue** button for end-to-end queue testing.
- **Sanitized Fixture Regression Suite**
  - Add an automated test suite with sanitized email fixtures covering direct and forwarded confirmations, round-trip and multi-leg itineraries, `.ics` attachments, `message/rfc822` forwards, points/miles redemptions, schedule changes, and cancellations.

### Release v1.0.0
- Site Launch
    - User Guide
    - Quickstart Guide
    - API Documentation
  - Sections and layout for both the main app FlightSentry and OpenFareScraper (incl api documentation)
  - Follow Design Guide, but its okay to use addtional elements
  - What screenshots do you need?
  - No public demo yet
  - No hosted version yet (but coming in the future maybe)

### Release v1.0.1
- TBD

### Release v1.0.2: Mobile Optimization
- Audit every page and modal against `DESIGN_GUIDE.md` mobile standards (full-screen mobile modals, `44px` touch targets, and zero horizontal overflow).
- Polish mobile-specific interactions beyond CSS layout tokens (numeric/decimal mobile keyboards via `inputMode`, touch chart scrubbing ergonomics, and condensed table scrolling on narrow viewports).

### Release v1.0.3a: Research Only, Security and Best Practices Audit
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
- Make a plan for another ai for v1.0.3-v1.0.6 for fixes, no fixes today. Be clear and concise.
- Double check results. It will be compared against another ai. 

### Release v1.0.3-v1.0.6: Security and Best Practices Application
- Security and Best Practices Application

### Release v1.0.7: Production Prep
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

### Release v1.0.8: Multi-Architecture Docker Builds
- **Automated Multi-Arch CI/CD (`linux/amd64` & `linux/arm64`)**
  - Add a GitHub Actions workflow using `docker/setup-qemu-action`, `docker/setup-buildx-action`, and `docker/build-push-action` to build and push multi-architecture images (`linux/amd64`, `linux/arm64`) to Docker Hub (`thebronway/flightsentry`) on version tags.
  - Validate native `better-sqlite3` compilation and startup health checks on ARM64 (Raspberry Pi / ARM servers) prior to `v1.0.0`.

### Release v1.0.9
- Final Fixes

### Release v1.1.0
- README finalize
- Another Security Audit
- GitHub, Docker Release

### Release v1.5.0
- Points Path Search?