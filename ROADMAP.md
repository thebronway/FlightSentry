# FlightSentry Roadmap

*Last updated: 2026-11-05*  
*Current Version: v0.6.6*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.6.7
- Settings autosave message, make the text larger
- Save State
    - when you filter sort or view, and then you go to say settings, and then you come back to dashboard, it resets. I would like it to save the view in the session that you are in, or whatever best practices are
    - Also, if you collaspe the quota bar, it should stay collasped when you come back to the page 
- Ideas for credit claimed, I dont like that phraseology, but I like that concept

### Release v0.6.8
- Co-locations
    - Co-locations like (WAS for DCA,IAD,BWI and NYC for JFK,LGA,EWR) Need to be supported, as google flight supports them. make sure the apis do too. look how how this can get done

### Release v0.6.9:
- Points (as a currency) for watched and booked
    - Add the ability to add points currencies on the general page (like AAvantage miles and trueblue points). Only the configured points currencies should show up on the drop-down when you're adding a flight via points to reduce clutter. If points are selected, auto check the pause price checks (maybe rename disable flight checks for all). Need to consider how this will look in the UI. 

### Release v0.7.0
- How to handle continuing monitoring route if flight already purchased
    - For example, I buy an American Airlines flight for 6 PM for $300, and I log that as booked. And  I am fine departing anywhere after 4 PM on a non stop, those re my preferences. A week or two later, there's another American Airlines flight at 4 PM for $250 and an United flight for $200. I should also get those notifications. How can we handle that without mucking up the UI. It should still be able to monitor that route if it's within the specs of the flight profile. In addition, it should support co-locations, even if the purchased flight  is only to one location or from one location in that co-location. This will only be if you do route monitoring, but like, I feel like you should be able to add route monitoring to a purchased flight. We need a way to set preferences. I know the flight is already monitored. it monitors that route, but I don't care about nonstop flights on frontier. I want direct flights, not redeyes on Delta or American, sort of thing after 4pm sort of thing.

### Release v0.7.1: Mobile Optimization
- Moible Optimization
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized

### Release v0.7.2a: Research Only, Security and Best Practices Audit
- Look for hacks
- Look for non stable components
- Look for monolthic files / lack of folder organization
- Look for security issues
- Look for things that do not follow best practices 
- Look for missing/deprecated imports
- Look for duplicate components that should be reused instead
- Look for inconsistent theming or elements
- Look to clean up database alters, no one has old database, clean up to make it better
- Old flights cleanup worth it? maybe keep 1 year, but user changeable in settings? performance implications? 
- Every item should be its own phase, and then when developing a plan, reference previous findings
- Make a plan for another ai for v0.6.8 for fixes, no fixes today. Be clear and concise.
    - Double check results

### Release v0.7.2: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.7.3a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.

### Release v0.7.3: Separate playwright container scraper implementation
- API Playwright optional hosted scrapper integration.

### Release v0.8.8: API

### Release v0.9.0: Production Prep
- Docker Compose Example

### Release v0.9.5
- Site Launch
    - User Guide
    - Quickstart Guide

### Release v1.0.0
- Production Release