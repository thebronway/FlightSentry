# Calendar-App Roadmap

*Last updated: 2026-10-26*  
*Current Version: v0.3.5*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.4.0
- **Consolidated Data Sources Architecture:**
  - Merge the Provider Priority Order ranking list and configuration cards into a single unified stack of reorderable cards.
  - Implement fixed rank position with visual disabled state (skipping inactive providers at runtime without shifting rankings).
- **Hardened Multi-Strategy Query Routing:**
  - Implement SQLite-backed persistent atomic pointer for Round-Robin rotation, eliminating process-split memory resets between worker and web containers.
  - Add "Balanced Usage" routing strategy to dynamically direct queries to the active provider with the lowest percentage of monthly quota consumed.
  - Retain "Exhaust Quota" priority failover strategy.
- **Flight Number Route Detection & User Guidance:**
  - Add debounced flight route lookup on carrier code and flight number input.
  - Display user guidance alerts:
    - Mismatch warning alert when manually typed airport pairs do not match schedule lookup results.
    - Verification confirmation alert when origin/destination fields are auto-populated into empty inputs.
  - Maintain required, editable airport codes to support seasonal route changes without hardcoded local route databases.
- **Native Multi-Channel Notification Dispatcher:**
  - Add modular, dedicated configuration cards for Discord Webhook, Slack Webhook, Generic Webhook, and SMTP Email.
  - Add independent enable/disable toggles per channel that preserve stored credentials when toggled off.
  - Provide individual "Save" and "Save & Test" actions per channel, replacing global notification tests with isolated single-channel validation.

  ### Release v0.4.5: Market Price History & Multi-Airline Route Intelligence
- **Multi-Airline Price Trend Graph (City-Pair Route Searches):**
  - Upgrade the SVG Price Chart to plot multiple distinct trendlines simultaneously when tracking an origin/destination city pair (e.g., JFK to LAX) instead of a single minimum-price line.
  - Render an interactive carrier filter pill bar above the chart allowing users to toggle individual airline lines on or off dynamically.
  - Implement synchronized crosshair tooltips: hovering over any point displays a unified comparison badge showing prices across all operating airlines for that specific check.
- **Dedicated Brand Color Palette:**
  - Delta Air Lines (`DL`): Crimson Red (`#E01A22`).
  - American Airlines (`AA`): Electric Sky Blue (`#38BDF8`).
  - United Airlines (`UA`): Deep Navy Blue (`#1D4ED8`).
  - JetBlue Airways (`B6`): Safety/Vibrant Orange (`#F97316`) to eliminate visual clashing with American and United blues.
  - Southwest Airlines (`WN`): Bold Gold / Yellow (`#EAB308`).
  - Alaska Airlines (`AS`): Spruce Teal / Green (`#10B981`).
  - Frontier Airlines (`F9`): Pine Dark Green (`#059669`).
  - Spirit Airlines (`NK`): Excluded / Deprecated.
  - Dynamic Palette Fallback: High-contrast, lightness-bounded HSL hash for international and regional carriers.
- **Route Corridor High / Low / Current Summary (Header):**
  - Add route market summary metrics to the modal and card headers for city-pair searches:
    - **Current Route Floor**: The lowest fare currently available across any airline.
    - **All-Time Route Low**: The absolute cheapest fare recorded across all historical checks for this route pair.
    - **All-Time Route High**: The highest recorded fare ceiling for this route pair.
    - **Visual Market Spread Bar**: A corridor gauge displaying where today's price sits relative to the historic low and high.
- **Carrier Breakdown Matrix (Below Graph):**
  - Display a structured competitive breakdown table directly beneath the price chart:
    - Airline name and branded color badge.
    - Best flight number and departure time for each airline (e.g., `B6 523 · Nonstop · 8:30 AM`).
    - Current lowest price offered by that airline.
    - Airline-specific all-time low and all-time high on that route.
    - Intraday price delta indicator showing if that carrier dropped, rose, or held steady.
- **Enriched Route Price Drop Notifications:**
  - Update route notification payloads to eliminate blank flight numbers and ambiguous alerts.
  - Clearly identify the leading airline and specific flight number that triggered the price drop.
  - Include an itemized summary of competing airline fares captured during the same query.
  - Direct deep-link to Google Flights matching the specific route, date, and cabin parameters.
- **Database & Parser Architecture Extensions:**
  - Update `serpapi.ts` and `searchapi.ts` route search parsers to retain the full itinerary payload rather than discarding non-minimum flights with `Math.min`.
  - Add `airline TEXT`, `flightNumber TEXT`, and `metadata TEXT` (JSON storing all competitor itineraries from that query) to the `price_history` table schema.

### Release v0.5.0
- Breakup monolithic files
    - FlightModal.tsx
    - SettingsForm.tsx
    - HistoryModal.tsx
    - PriceChart.tsx
- Duplicated Controller Logic: FlightCard.tsx & FlightCondensedView.tsx

### Release v0.5.2
- Mobile fixes