# FlightSentry Roadmap

*Last updated: 2026-11-09*  
*Current Version: v0.7.4*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.7.5: Flight Modal Redesign
- First look at the codebase and current features. 
- **Modular Modal Redesign:**
  - Ground-up redesign of the flight modal incorporating all finalized capabilities (Points vs. Cash, Watching vs. Booked, Route vs. Flight Number, Dual Route Monitoring, Search Preference Overrides, and Manual Logging).
  - Organize into clean visual sections
  - thoughts? give honest opinion
    - three main options
      - Watching a route: user just enters route info, can covert if purchased.
      - Wacting a flight: flight required, route optional via checkbox, then shows route options, can covert if purchased.
      - booked: flight required, route optional via checkbox, then shows route options
    - We need to log when the user booked a flight, deafault to today, but also allow dates in the past. 
  - Decompose monolithic state into isolated, single-responsibility sub-components. Make sure a correct folders strcuture is used, files can be moved
  - Points bookings should not have Price Alerts, notifications, etc. and Disable flight price checks should be checked and greyed out. 
  - Figure out how to incorporte manual mode (from the prevous release.)
- **Mobile Experience Optimization:**
  - Make sure the redesign includes a mobile optimization for the modal.
- **Component Cleanup:**
  - Make no hacks, no missing/deprecated/no longer used imports and that all best practices are followed. 
  - warning if they leave the tab or clcik the x with unsaved changes.
- make a plan with options when needed AND ONLY IF NEEDED. we will discuss first. 

### Release v0.7.6: Flight Card / Condensed Redesign / Refresh
- Manual Mode
- No Drops badge

### Release v0.7.7: API audit
- Fast Flights is broken, always showing sold old. need to look up actual documention and fix it. double check all api offical docuementation. DO NOT GUESS. Look up each one.

### Release v0.7.8: Mobile Optimization
- **Mobile Experience Optimization:**
  - Convert Flight Modal, Convert Modal, and History Modal to responsive full-height bottom-sheets on mobile viewports (<640px).
  - Standardize touch targets (minimum 44x44px) across all form inputs, toggles, tags, and action buttons.
  - Add touch-friendly crosshair scrubbing on the Price History chart with viewport-bounded tooltips.
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized

### Release v0.7.9a: Research Only, Security and Best Practices Audit
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

### Release v0.7.9: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.8.0a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.

### Release v0.8.0: Separate playwright container scraper implementation
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