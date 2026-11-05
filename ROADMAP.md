# FlightSentry Roadmap

*Last updated: 2026-11-05*  
*Current Version: v0.6.6*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.6.8
- Co-locations
    - Co-locations like (WAS for DCA,IAD,BWI and NYC for JFK,LGA,EWR) Need to be supported, as google flight supports them. make sure the apis do too. look how how this can get done. co-locations shouldnt change, so should we maintain a list of co locations? or just use googles code for co-locations. Lets slow down adn think this through.
- What happens with a flight card or history modal if the price check happens automatticaly, will it update? or do you need to refersh. 

### Release v0.6.9:
- Points (as a currency) for watched and booked
    - Add the ability to add points currencies on the general page (like AAvantage miles and trueblue points). Only the configured points currencies should show up on the drop-down when you're adding a flight via points to reduce clutter. If points are selected, auto check the pause price checks (maybe rename disable flight checks for all). Need to consider how this will look in the UI. 

### Release v0.7.0
- How to handle continuing monitoring a booked or watching
    - Right now in an email, if monitoring a specifc flight (booked or watching), and there is a price drop it will send an alert and it will show other flights on that route. I want to change that feature, when monitoing a specific flight, it should allow the ability to also monitor the route, if selected, dropdown addtional options (add colocation for origin and or destination, stop, time (depart/arrive), airline inclustions, exclusions, redeye) use cabin and fare from flight. if converting, copy all relevant data over and watch route and enable by deafult. (when just tracking flight, disbale route tracking, user has to opt in, and then extra options should be shown). update emails, include flight tracked on top, route on bottom. include on history graph, with the ability to hide route and just see the tracked flight (default is route is hidden). 
- Make sure terminology booked and watching is used accross the app.

### Release v0.7.1: Mobile Optimization
- Moible Optimization
- go through every modal and page and determine its mobile compatibility and make a plan for making things more mobile friendly/optimized

### Release v0.7.2a: Research Only, Security and Best Practices Audit
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