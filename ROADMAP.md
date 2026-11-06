# FlightSentry Roadmap

*Last updated: 2026-11-05*  
*Current Version: v0.7.0*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.7.1: Global Search Preferences & Multi-Fare Ingestion
- **Dedicated Search Preferences Tab in Settings:**
  - Add a dedicated "Search Preferences" tab in Settings to establish instance-wide flight search defaults.
  - Configure instance-wide defaults for:
    - Default Cabin Class (Economy, Premium Economy, Business, First).
    - Default Fare Tier (Standard vs. Basic Economy).
    - Default Redeye Filter (Include vs. Exclude).
    - Default Maximum Stops (Any, Nonstop, 1 Stop, 2 Stops).
    - Global Airline Inclusions and Exclusions (e.g., always exclude specific carriers).
    - Max stored itineraries per check (default: 12, configurable 6–24) with carrier diversity toggle.
  - Automatically populate new flight tracking modals from these global defaults.
- **Multi-Fare Ingestion & Carrier Diversity Engine:**
  - Upgrade scraper and API result parsers (SerpAPI, SearchApi.io, HasData, Fast-Flights) to capture up to 12 itineraries per check.
  - Implement a carrier-diversity selection algorithm: guarantee at least one lowest fare from every operating airline on the route before allocating remaining slots to the next absolute cheapest flights.
  - Update the Carrier Breakdown Matrix and Price Chart to support inspecting multiple departures for a single airline on any given check.

### Release v0.7.2: Continuous Monitoring (Dual Flight & Route Tracking)
- **Opt-In Route Monitoring on Specific Flights:**
  - Add an optional "Also Monitor Route Alternatives" toggle when tracking specific flight numbers (disabled by default for standalone flight tracking).
  - Progressive disclosure: toggling route monitoring reveals route-level filters (airport co-locations, stops, departure/arrival time windows, redeye exclusions, airline inclusions/exclusions), pre-populated from global Search Preferences.
  - Inherit cabin class and fare tier (Standard vs. Basic) directly from the parent flight.
- **Watched-to-Booked Route Adoption:**
  - When converting a watched flight to booked status, copy all existing route search preferences and enable "Also Monitor Route Alternatives" by default.
- **Alert & Visualization Hierarchy:**
  - Notifications & Emails: Position the primary tracked flight status, benchmark, and price change prominently in the top header card; display a secondary, compact table of alternative flights on the route below.
  - History Modal: Focus graph lines on the tracked flight by default; provide a toggle to overlay the broader route floor and competitor trends (default: route floor hidden to prevent clutter).

### Release v0.7.3: Manual Entry Mode
- **Custom Historical & Manual Price Entries:**
  - Allow users to manually log price check data points directly into price history for both cash and award points flights.
  - Entry fields: Date (supports past calendar dates), Price / Points Cost, Carrier Code, Flight Number, and Route.
  - Pre-fill fields automatically based on the selected flight's active metadata, with full user override capability.
- **Flight & Route Association Logic:**
  - If the entered carrier and flight number match the tracked flight, append the data point directly to that flight's historical timeline.
  - If the flight number differs, append the data point as a competing flight on that route's history log.
  - For cash flights, provide an optional toggle to immediately trigger an automated live verification check for that route/flight if data sources are active.
- **Purchased Flight**
  - Once a flight is booked, orignal purchase price should be locked, but a user can enter a new purchase price via manual mode and mark it as a rebook.

### Release v0.7.4: Flight Modal Redesign
- **Modular Modal Redesign:**
  - Ground-up redesign of the flight modal incorporating all finalized capabilities (Points vs. Cash, Watching vs. Booked, Route vs. Flight Number, Dual Route Monitoring, Search Preference Overrides, and Manual Logging).
  - Organize into clean visual sections:
    1. Tracking Goal & Currency (Watching vs. Booked, Fiat vs. Points).
    2. Route & Schedule (Airports with Co-Location quick-swaps, Flight Number auto-detection, Departure Date).
    3. Cabin & Fares (Cabin Class, Fare Restrictions).
    4. Dual Route Tracking (Collapsible opt-in panel with stops, time steppers, redeye toggle, and airline tags).
    5. Alert Rules & Cadence (Threshold targets with real-time math previews, check cadence selectors, pause/mute toggles).
  - Decompose monolithic state into isolated, single-responsibility sub-components.
  - Points bookings should not have Price Alerts, notifications, etc. and Disable flight price checks should be checked and greyed out. 
- **Mobile Experience Optimization:**
  - Make sure the redesign includes a mobile optimization for the modal.
- **Component Cleanup:**
  - Make sure a correct folders strcuture is used, no monolthic files, no hacks, no missing/deprecated/no longer used imports and that all best practices are followed. 

### Release v0.7.5: Flight Card Redesign

### Release v0.7.6
- Fast Flights is broken, always showing sold old. need to look up actual documention and fix it.

### Release v0.7.7: Mobile Optimization
- **Mobile Experience Optimization:**
  - Convert Flight Modal, Convert Modal, and History Modal to responsive full-height bottom-sheets on mobile viewports (<640px).
  - Standardize touch targets (minimum 44x44px) across all form inputs, toggles, tags, and action buttons.
  - Add touch-friendly crosshair scrubbing on the Price History chart with viewport-bounded tooltips.
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized

### Release v0.7.8a: Research Only, Security and Best Practices Audit
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
- Every item should be its own phase, and then when developing a plan, reference previous findings
- Make a plan for another ai for v0.6.8 for fixes, no fixes today. Be clear and concise.
    - Double check results

### Release v0.7.8: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.7.9a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.

### Release v0.7.9: Separate playwright container scraper implementation
- API Playwright optional hosted scrapper integration.

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

### Release v1.0.0
- Production Release