# FlightSentry Roadmap

*Last updated: 2026-11-20*  
*Current Version: v0.9.9*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v1.0.0
- Audit every page and modal against `DESIGN_GUIDE.md` mobile standards (full-screen mobile modals, `44px` touch targets, and zero horizontal overflow).
- Polish mobile-specific interactions beyond CSS layout tokens (numeric/decimal mobile keyboards via `inputMode`, touch chart scrubbing ergonomics, and condensed table scrolling on narrow viewports).

### Release v1.0.1: UI Polish: Authentication Transition Stability
- Issue: Users experience brief visual flickering and layout shifts during the login process. This includes the "Sign Out" button abruptly popping into the navigation bar, the "Sign In" button momentarily resetting its loading state before the redirect completes, and the Passkey section rendering slightly after the main login card.
- Proposed Solution: Stabilize the authentication handoff by preloading the user's session state on the server before the initial render (eliminating Navbar layout shifts), persisting the "Signing In..." state until the browser has fully navigated to the dashboard, and optimizing client-side security checks so all login components mount simultaneously in the first frame.

### Release v1.0.2a: Research Only, Security and Best Practices Audit
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
- Make a plan for another ai for v1.0.2-v1.0.6 for fixes, no fixes today. Be clear and concise.
- Double check results. It will be compared against another ai. 

### Release v1.0.2-v1.0.6: Security and Best Practices Application
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

- Site Launch
    - User Guide
    - Quickstart Guide
    - API Documentation
  - Sections and layout for both the main app FlightSentry and OpenFareScraper (incl api documentation)
  - Follow Design Guide, but its okay to use addtional elements
  - What screenshots do you need?
  - No public demo yet
  - No hosted version yet (but coming in the future maybe)