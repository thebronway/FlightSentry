# FlightSentry Roadmap

*Last updated: 2026-11-09*  
*Current Version: v0.7.5*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.7.6: Logic and API fix
- All 4 APIs need verification that they are programed correctly to work with the features of this app. You need to identify all the available features and then you need to go and look up the documentation for each API, you are not allowed to guess, you are not allowed to assume, you are not allowed to do anything else except go look up the exact documentation to make sure the features are compatible. If they're not compatible, we can discuss. If they are compatible, make sure they are programed correctly. Fast flights is always broken. It's not getting captured or rate limited. It's saying sold out on all fucking flights, no matter what combination I do.
- there's  logic issue because if I do a route, I watch a route and I do WAS to NYC on oneworld, then just monitors a random AA flight from DCA to JFK. Why is it switching to route?
- go through the logic of every single possibility for searching and make sure it's programed correctly. You must go slow and methodically.
- this is just a bug fix release, except for I wanna make the logs more accurate for the APIs and the data sources. Everything I just wanna make everything more accurate and I need to verify that if the log says it's sold out, it's actually sold out. The logs error messages need to be precise and specific and maybe more verbose

### Release v0.7.7: Flight Card / Condensed Redesign / Refresh
- Manual Mode Badge
  - What if the top badge is always watching or booked, and an addtional badge directly below for like paused, manual, auto (need better wording)
- No Drops badge
- Stylize route / flight
  - Put locations in bubbles and put flight name and number a bubble with the airline color
- Flight Card
  - Rethink the layout of the card and what is needed and what is not
  - If the actions buttons remain the same on the, the history button needs a left align,, and the pause button needs a right align, the rest stay as is. 
- I dont like the bell < price dot > price to show when youll be notified, it looks weird
- When booking with points, by is the currency a badge in the middle and not next tot he price
- Route to Flight Converter or Route to flight and route converter. basically like picking a perferred flight to watch

### Release v0.7.8
- Flight Modal
  - Thoughts on removing speificy route details manualually when just watching or booking a flight? Or maybe just removing co-lcoation option for when watching or booking a flight (and leaving it when the route option is added)
- Data Sources
  - Add a way to manually log a used query, for example, if I use an api manually for soemthing else or whatever, I need to update that count somehow, so it activetly reflect the correct api upsage left. It will be done from the data soruces page
- Quota ribbon
  - When expanded, when a bar gets to 75% full, make it yellow, 90% make it red
  - When collasaped (make collasped the default), make the first number xxx / total, yellow at 75% used and 90% make it red.

### Release v0.7.9: Mobile Optimization
- **Mobile Experience Optimization:**
  - Convert or confirm all modals to responsive full-height bottom-sheets on mobile viewports (use whatever flightmodal uses as a standard).
  - Standardize touch targets across all form inputs, toggles, tags, and action buttons.
  - Add touch-friendly crosshair scrubbing on the Price History chart with viewport-bounded tooltips.
  - Add touch-friendly everything across that app
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized

### Release v0.8.0a: Research Only, Security and Best Practices Audit
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

### Release v0.8.0: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.8.1a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.

### Release v0.8.1: Separate playwright container scraper implementation
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