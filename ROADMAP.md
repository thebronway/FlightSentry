# FlightSentry Roadmap

*Last updated: 2026-11-12*  
*Current Version: v0.8.2*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.8.3
- Data Sources can be one time or monthly, need to support both modes per data source.
- If selecting any miles (ex AA miles, must be oneworld, etc.) should be within airline alliance. Not hard stop, just warning message.
- Add more jitter/delay for fastflights, account for manual queries
- Old flights cleanup worth it? maybe keep 1 year, but user changeable in settings? performance implications? Maybe a cleanup button in settings? Okay with just keeping everything archived. 

### Release v0.8.4
-

### Release v0.8.5
-

### Release v0.8.6a: Brand Optimization
- go through and ensure that branding and theming is consistent across the entire app. Look at colors, look at modal size, look at everything. Deep dive and report back. What is different, what is not. And then we'll make a plan for the next release.

### Release v0.8.6: Brand Optimization Application

### Release v0.8.7: Mobile Optimization
- **Mobile Experience Optimization:**
  - Convert or confirm all modals to responsive full-height bottom-sheets on mobile viewports (use whatever flightmodal uses as a standard).
  - Standardize touch targets across all form inputs, toggles, tags, and action buttons.
  - Add touch-friendly everything across that app
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized
- Multiple phases so testing and changes are not massive.

### Release v0.8.8a: Research Only, Security and Best Practices Audit
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
- Make a plan for another ai for v0.8.8 for fixes, no fixes today. Be clear and concise.
- Double check results. It will be compared against another ai. 

### Release v0.8.8: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.8.9a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.
- I uploaded the current code base. This will be a seperate docker container.
- this separate docker container will have an API endpoint that can be accessed by the main app with an API key and all.
- we really need to think about scraping and rate limiting, etc.
- does the app need a UI? How will the user get their API key, and are there other settings that will be needed, if we will make a mini UI for lack of a better term, it should follow the exact theming of the current app.
- all you're doing today is making a plan for another AI, and they will make that container. You should add specific instructions so it pulls the same architecture as this app. I will set up a new github and everything. Should it just be called FlightSentry-Scraper?

### Release v0.8.9: Separate playwright container scraper implementation
- API Playwright hosted scrapper integration into the app as a free optional scraper

### Release v0.9.0: Production Prep
- Docker Compose Example

### Release v0.9.1: Dev API
- API monitor, script or function to test the apis, make sure all apis are returning the same result to verify api is still working.

### Release v0.9.2: Public API
- Expose API endpoint, for external apps to add, read flights (with api key authentication)

### Release v0.9.3
-

### Release v0.9.4
-

### Release v0.9.5
- Site Launch
    - User Guide
    - Quickstart Guide
    - API Guide
  
### Release v0.9.6
-

### Release v0.9.7
-

### Release v0.9.8
-

### Release v0.9.9
- README finalize

### Release v1.0.0
- GitHub, Docker, Railway and PikaPods Release

PikaPods: Non-technical users pick an app from their catalog and PikaPods spins up a private, isolated container with persistent storage, SSL, and automatic image updates starting around $1.80–$3.00/month (billed hourly from prepaid credit, with a $5 welcome credit for new users). Each user still gets their own private single-user FlightSentry instance and plugs in their own API keys, while PikaPods handles all servers, billing, and uptime. If you reach out to them (hello@pikapods.com) once FlightSentry is ready for a wider audience, they offer a developer agreement that pays 20% of the hosting revenue your app generates.

Railway: Self-serve—you can publish a 1-click Docker template with a persistent volume for SQLite without waiting for catalog approval.