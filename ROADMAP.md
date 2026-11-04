# FlightSentry Roadmap

*Last updated: 2026-11-04*  
*Current Version: v0.6.4*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.6.5
- Flight Card
    - Remove Market Corridor from card, keep in history
    - Put airline bubble of current price record holder next to current price (in addion to it being above) on watched flights only
    - Booked Flights have the flight number as the title and the flight bubble, should we report the flight bubble?
- Save State
    - when you filter sort or view, and then you go to say settings, and then you come back to dashboard, it resets. I would like it to save the view in the session that you are in, or whatever best practices are
    - Also, if you collaspe the quota bar, it should stay collasped when you come back to the page 
- Flight Modal, swap PNR and Deapture date postions
    - The free lookup for flight route based on number is not doing it on add. but if I go back to edit that flight, it does the validation. im guessing is beacuase there isnt a date yet?
- Ideas for credit claimed, I dont like that phraseology, but I like that concept
- Settings autosave message, make the text larger

### Release v0.6.6:
- Points (as a currency)
    - Add the ability to add points currencies on the general page (like AAvantage miles and trueblue points). Only the configured points currencies should show up on the drop-down when you're adding a flight via points to reduce clutter. If points are selected, auto check the pause price checks (maybe rename disable flight checks for all)

### Release v0.6.7: Mobile Optimization
- Moible Optimization
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized

### Release v0.6.8a: Research Only, Security and Best Practices Audit
- Look for hacks
- Look for non stable components
- Look for monolthic files
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

### Release v0.6.8: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.6.9a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.
    - the goal here is to make a plan for a separate container called FlightSentry-Scrapper. Which eventually will be a data source. But this optional container will, you know, be a hefty guy because it would have to like load playwright and chromium and everything in between to go to the Google flights page and scrape it. That's why I want it separate from this container/build.

### Release v0.7.0: Separate playwright container scraper implementation
- API Playwright optional hosted scrapper integration.