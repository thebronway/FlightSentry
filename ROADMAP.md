# Calendar-App Roadmap

*Last updated: 2026-10-26*  
*Current Version: v0.4.0*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

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
- Add what data source was used on the history table. 

### Release v0.5.0
- Breakup monolithic files
    - FlightModal.tsx
    - SettingsForm.tsx
    - HistoryModal.tsx
    - PriceChart.tsx
- Duplicated Controller Logic: FlightCard.tsx & FlightCondensedView.tsx

### Release v0.5.2
- Mobile fixes
- Settings Page
    - API sources need to have the correct highlight like Query Routing Strategy
    - Query Routing Strategy dropdown arrowneeds more right padding
    - Up and down arrows should be buttons (like have a visable button border)
- Flight Modal
    - Make Wider as its super crowded, give the UI a little more space