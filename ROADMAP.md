# FlightSentry Roadmap

*Last updated: 2026-11-15*  
*Current Version: v0.8.8*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.8.9
- **Multi-Account IMAP Email Scanner (New Emails Only)**
  - Store multiple email accounts in an `imap_accounts` SQLite table (`label`, `host`, `port`, `tls`, `username`, encrypted/masked password, optional monitored folder/label tag defaulting to `INBOX`, `enabled`, `lastUid`, `lastCheckedAt`, `lastError`).
  - Record mailbox `UIDNEXT` / connection timestamp when an account is added so only newly arriving emails are scanned (no historical inbox backfills).
  - Parse airline emails via `Schema.org/FlightReservation` JSON-LD extraction and airline domain/text pattern heuristics for new bookings, flight number/schedule changes, and cancellations using `ImapFlow` and `mailparser`.
  - Deduplicate across inboxes via `Message-ID` and `PNR + Carrier + Flight Number + Departure Date` without persisting raw email bodies to disk.
- **Dedicated Email Scanner Settings Tab (Modular Architecture)**
  - Add a dedicated **Email Scanner** tab in **Settings** (`EmailScannerTab.tsx`) split into single-responsibility sub-components under `src/components/settings/emailScanner/` (account list/status cards, add/edit account modal, polling interval card, connection test) and dedicated service modules under `src/services/emailScanner/`.
- **Multi-Item Email Review Queue & Notifications**
  - Store parsed email events in an `email_queue` table (tagged with source account label) rather than modifying flights automatically.
  - Add a dashboard **Email Queue** manager modal supporting multiple pending items with per-item and bulk **Add / Apply**, **Edit Before Adding**, and **Deny** actions.
  - Dispatch optional notifications (Discord, Slack, Generic Webhook, SMTP) when new email events are queued with deep links to review, edit, or deny items.

### Release v0.9.0: Optional Authentication & Passkeys
- **Optional Single-User Username & Password Auth**
  - Disabled by default so local/homelab instances boot unlocked; enabled via **Settings → Security** (`SecurityTab.tsx` with modular components under `src/components/settings/security/`).
  - Support a user-configurable username (defaulting to `admin`) and strong password hashed with Node `crypto.scrypt` and per-user salt.
  - Add a `/login` screen and a **Sign Out** action in `Navbar` when authentication is active.
- **Environment Variable Bootstrap & Lockout Recovery**
  - Support optional `AUTH_USERNAME` and `AUTH_PASSWORD` environment variables so cloud/public deployments (Railway, PikaPods) boot locked on first launch and self-hosted users can reset a forgotten password via container config.
- **Edge + SQLite Session Management & Hardening**
  - Issue HMAC-signed `HttpOnly`, `SameSite=Lax` session cookies (`Secure` when on HTTPS) checked by Next.js middleware for page redirects and validated against a SQLite `auth_sessions` table on `/api/*` routes for immediate server-side revocation on logout, password change, or disabling auth.
  - Add brute-force rate limiting / lockout backoff on `POST /api/auth/login` and structure the API auth guard to support future `Authorization: Bearer` API keys (`v0.9.5`).
- **Optional Passkey (WebAuthn) Sign-In**
  - Add optional multi-device passkey registration (`@simplewebauthn/server` and `@simplewebauthn/browser`) in **Settings → Security** once password auth is enabled, storing named credentials in an `auth_passkeys` table.
  - Enable passkey sign-in on `/login` when accessed over a secure context (`https://` or `localhost`), with clear UI guidance when running over plain HTTP LAN addresses.

### Release v0.9.1: Public API
- **API Key Management & Authentication**
  - Add named API key generation and revocation in Settings (stored hashed in SQLite and displayed once upon creation).
  - Authenticate external requests via `Authorization: Bearer <key>` (or `X-API-Key`) header with clean JSON `401`/`403` error responses.
- **Versioned Flight Endpoints (`/api/v1/flights`)**
  - `GET /api/v1/flights` & `GET /api/v1/flights/:id`: Return tracked flights including route, dates, airline, flight number, cabin class, booked/baseline price, current lowest price, price delta, status, and price history.
  - `POST /api/v1/flights`: Add a flight to track with full itinerary details, booked price, optional external reference/notes, and an option to trigger an immediate initial price check.
  - `PATCH /api/v1/flights/:id` & `DELETE /api/v1/flights/:id`: Update flight details (such as resetting the booked price after rebooking or pausing tracking) and delete tracked flights.
  - Anyother endpoints needed, like doing a flight check now and others
- **Link to API Reference on website**

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
- **Single-Container Consolidation**
  - Combine `web` and `worker` into one container via a startup entrypoint script with clean `SIGTERM` shutdown handling and automatic worker restart on exit.
  - Respect dynamic `PORT` environment variables and ensure `/app/data` initializes with writable permissions on first boot.
- **Docker Compose & Environment Config**
  - Update `docker-compose.yml` to a standard single-service example (`thebronway/flightsentry:latest`, `./data:/app/data`, port `4000:4000`).
  - Add a minimal `.env.example` documenting optional overrides (`PORT`, `TZ`, `DATABASE_PATH`, `HOSTING_PLATFORM`, `DISABLE_UPDATE_BANNER`, `ENABLE_LOCAL`) while keeping `.env` optional.
  - Add DISABLE_UPDATE_BANNER optional docker env. if set to true disable update banner. Deafult is false
  - Add ENABLE_LOCAL optional docker env. if set to false, disable flightsentry-scraper integration. Defailt is true

### Release v0.9.6
- **Railway & PikaPods Prep**
  - Add `HOSTING_PLATFORM` env support so managed hosts (like PikaPods) can be identified by the app.
  - Prepare one-click Railway template config (single `/app/data` volume) and PikaPods catalog requirements (including optional basic login auth for public pod URLs).

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

### Release v0.9.8
- TBD

### Release v0.9.9
- README finalize

### Release v1.0.0
- GitHub, Docker, Railway and PikaPods Release

PikaPods: Non-technical users pick an app from their catalog and PikaPods spins up a private, isolated container with persistent storage, SSL, and automatic image updates starting around $1.80–$3.00/month (billed hourly from prepaid credit, with a $5 welcome credit for new users). Each user still gets their own private single-user FlightSentry instance and plugs in their own API keys, while PikaPods handles all servers, billing, and uptime. If you reach out to them (hello@pikapods.com) once FlightSentry is ready for a wider audience, they offer a developer agreement that pays 20% of the hosting revenue your app generates.

Railway: Self-serve—you can publish a 1-click Docker template with a persistent volume for SQLite without waiting for catalog approval.

### Release v1.5.0
- Points Path Search?