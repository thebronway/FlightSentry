# FlightSentry Roadmap

*Last updated: 2026-11-11*  
*Current Version: v0.7.9*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.8.1: Dashboard
- **Flight Modal**
  - Keep manual **Origin** and **Destination** airport overrides available in **Watching Flight** and **Booked Flight** modes (as a fallback when route auto-detection fails or in Manual Mode), but restrict them to single 3-letter IATA airports—enabling co-location cluster options only in **Watching Route** and **Also Monitor Route Alternatives**.
  - Always keep the Dashboard **Add Flight** button enabled when all data sources are paused or unconfigured; allow creating flights in **Manual Mode** (or **Points/Miles** mode) while disabling automated tracking submission with clear guidance messaging until a data source is active or Manual Mode is selected.
- **Quota Ribbon**
  - Set the **collapsed** state as the default on initial load while preserving user expand/collapse state in `localStorage`.
  - Apply threshold color states at `>= 75%` usage (yellow) and `>= 95%` usage (red) to both expanded provider progress bars and the collapsed `used / total` summary counter.
  - Optimize layout and touch targets (`44px` minimum) for mobile viewports (`375px+`).
  - Decompose `QuotaRibbon.tsx` into modular, single-responsibility sub-components.
- **Flight Card**
  - Hide the airline badge next to the points/miles currency badge on flights in **Manual Mode**.
  - Slightly increase the contrast/brightness of single-airport location bubbles so they are easier to read while remaining visually dimmer than multi-airport co-location cluster bubbles.

### Release v0.8.2: Update & Announcement Banners
- **Server-Side GitHub Sync & Settings Toggle**
  - Perform server-side checks every 24 hours against `raw.githubusercontent.com/thebronway/FlightSentry/main/` (`CHANGELOG.md` and `.github/announcements.json`), caching results in SQLite with silent offline/air-gapped fallback.
  - Add a toggle in **Settings → General** (enabled by default) to opt out of automatic 24-hour GitHub update/announcement checks, plus a manual **Check Now** button.
- **Update Available Banner**
  - Parse all `### Release vX.Y.Z` headings in `CHANGELOG.md`, resolve the maximum version using numeric SemVer (`major.minor.patch`) comparison, and compare against `package.json`.
  - Show a top banner when an update is available with links to GitHub Release Notes and Docker Hub, along with **Dismiss for 24 hrs** and **Dismiss forever** (per version) stored in SQLite.
  - Show an **Update available** badge and release/Docker links on the Application Version card in **Settings → General**, even after the top banner is dismissed.
- **Announcement Banner (`.github/announcements.json`)**
  - Validate `.github/announcements.json` via Zod supporting `id`, `active`, `severity` (`info` | `warning`), `title`, `message`, optional `linkUrl` / `linkText`, optional `expiresAt` (auto-hide after expiration date), and optional `maxVersion` (target instances running `<= maxVersion`).
  - Render active, non-expired announcements as dismissible top banners and persist dismissed announcement IDs in SQLite.

### Release v0.8.5: Mobile Optimization
- **Mobile Experience Optimization:**
  - Convert or confirm all modals to responsive full-height bottom-sheets on mobile viewports (use whatever flightmodal uses as a standard).
  - Standardize touch targets across all form inputs, toggles, tags, and action buttons.
  - Add touch-friendly everything across that app
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized

### Release v0.8.6a: Research Only, Security and Best Practices Audit
- Look for hacks
- Look for non stable components
- Look for monolthic files / lack of folder organization
- Look for security issues
- Look for things that do not follow best practices 
- Look for missing/deprecated/no longer used imports
- Look for duplicate components that should be reused instead
- Look for inconsistent theming or elements
- Look to clean up database alters, no one has old database, clean up to make it better
- Old flights cleanup worth it? maybe keep 1 year, but user changeable in settings? performance implications? 
- Every above item should be its own phase, and then when developing a plan, reference previous findings
- Make a plan for another ai for v0.8.6 for fixes, no fixes today. Be clear and concise.
- Double check results. It will be compared against another ai. 

### Release v0.8.6: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.8.7a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.
- I uploaded the current code base. This will be a seperate docker container.
- this separate docker container will have an API endpoint that can be accessed by the main app with an API key and all.
- we really need to think about scraping and rate limiting, etc.
- does the app need a UI? How will the user get their API key, and are there other settings that will be needed, if we will make a mini UI for lack of a better term, it should follow the exact theming of the current app.
- all you're doing today is making a plan for another AI, and they will make that container. You should add specific instructions so it pulls the same architecture as this app. I will set up a new github and everything. Should it just be called FlightSentry-Scraper?

### Release v0.8.7: Separate playwright container scraper implementation
- API Playwright hosted scrapper integration into the app as a free optional scraper

### Release v0.9.0: Production Prep
- Docker Compose Example

### Release v0.9.1: Dev API
- API monitor, script or function to test the apis, make sure all apis are returning the same result to verify api is still working.

### Release v0.9.1: Public API
- Expose API endpoint, for external apps to add, read flights (with api key authentication)

### Release v0.9.5
- Site Launch
    - User Guide
    - Quickstart Guide
    - API Guide

### Release v1.0.0
- Production Release