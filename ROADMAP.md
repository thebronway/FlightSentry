# FlightSentry Roadmap

*Last updated: 2026-11-10*  
*Current Version: v0.7.6*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.7.7: Flight Card / Condensed Redesign / Refresh
- Manual Mode Badge
  - What if the top badge is always watching or booked, and an addtional badge directly below for like paused, manual, auto (need better wording)
- No Drops badge
- Stylize route / flight
  - Put locations in bubbles and put flight name and number a bubble with the airline color
- Rethink the layout of both flight card and condenseed and what is needed and what is not
  - Flight card: If the actions buttons remain the same on the, the history button needs a left align,, and the pause button needs a right align, the rest stay as is. On condenced the right 4 icons need a right align. 
- I dont like the bell < price dot > price to show when youll be notified, it looks weird, but we need to display that
- When booking with points, by is the currency a badge in the middle and not next tot he price
- Route to Flight Converter or Route to flight and route converter. basically like picking a perferred flight to watch
- When applicable, give me options

### Release v0.7.8
- Flight Modal
  - Thoughts on removing speificy route details manualually when just watching or booking a flight? Or maybe just removing co-lcoation option for when watching or booking a flight (and leaving it when the route option is added)
- Data Sources
  - Add a way to manually log a used query, for example, if I use an api manually for soemthing else or whatever, I need to update that count somehow, so it activetly reflect the correct api upsage left. It will be done from the data soruces page
  - When opening logs for a data source, the background is faded, but the top 1/4 inch is not
- Quota ribbon
  - When expanded, when a bar gets to 75% full, make it yellow, 95% make it red
  - When collasaped (make collasped the default), make the first number xxx / total, yellow at 75% used and 95% make it red.
- if all data sources are paused or not configured, the user should still be able to add a flight, but only in manual mode, so always allow the add flight button, but if all data sources are paused or not configured when they go to track the flight or route, that should be great out if manual mode is not selected with the appropriate messaging.
- Banners
  - Update banner > look at the raw changlog github blob or whatever, and if version is less than what the max version in the doc is, show a banner with there is an update available. Link to github release notes, docker and a dissmiss for 24 hrs, and a dismiss forever. check should be done every 24 hrs. update availble links on the app version page

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
- Every above item should be its own phase, and then when developing a plan, reference previous findings
- Make a plan for another ai for v0.8.0 for fixes, no fixes today. Be clear and concise.
- Double check results. It will be compared against another ai. 

### Release v0.8.0: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.8.1a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.
- I uploaded the current code base. This will be a seperate docker container.
- this separate docker container will have an API endpoint that can be accessed by the main app with an API key and all.
- we really need to think about scraping and rate limiting, etc.
- does the app need a UI? How will the user get their API key, and are there other settings that will be needed, if we will make a mini UI for lack of a better term, it should follow the exact theming of the current app.
- all you're doing today is making a plan for another AI, and they will make that container. You should add specific instructions so it pulls the same architecture as this app. I will set up a new github and everything. Should it just be called FlightSentry-Scraper?

### Release v0.8.1: Separate playwright container scraper implementation
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

### Release v1.0.0
- Production Release