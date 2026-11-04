# FlightSentry Roadmap

*Last updated: 2026-11-04*  
*Current Version: v0.6.3*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.6.4
- Universal Settings Autosave
	- Remove individual provider save buttons; autosave every field on change or blur with a custom toast
	- Remove the save schedule button; autosave all cadence selections with a custom toast
	- Remove the save alert thresholds button; autosave threshold inputs with a custom toast
	- Change channel Save & Test buttons to standalone Test buttons that run against stored values, autosave all fields. 
- Global Surge Alert Defaults
	- Add global minimum price increase dollar and percent settings to the database and Notifications tab
	- Provide explicit global surge defaults to flight cards and modal inputs
- General Preferences & Currency Selector
	- Add a new General tab in Settings for instance-wide preferences
	- Add an app-wide currency selector dropdown
	- Format all currency outputs and pass the selected currency code upstream to search providers (and any text fields with $)
    - Show configured tz and time on new general page
    - Show app version from package on new page
    - Show support links on new page (from footer)
- Data Sources
    - when you type in a flight number on an already purchased flight, it does a free look up against some sort of API make sure the route is correct. I wanna add that log to the data sources page so we can see what's going on. If it fails, if it passes whatever, similar to that, just put it at the bottom of the page

### Release v0.6.5
- Flight Card
    - Remove Market Corridor from card, keepin history
- Save State
    - when you filter sort or view, and then you go to say settings, and then you come back to dashboard, it resets. I would like it to save the view in the session that you are in, or whatever best practices are
- Flight Modal, swap PNR and Deapture date postions
    - The free lookup for flight route based on number is not doing it on add. but if I go back to edit that flight, it does the validation. im guessing is beacuase there isnt a date yet?

### Release v0.6.6:
- Add a manual mode (no datasources), need to consider ui, dont want clutter
    - Points (as a currency)
        - Add the ability to add points currencies on the general page (like AAvantage miles and trueblue points)
    - when manual mode (no tracking), can also track in any currency $, pound, etc. 

### Release v0.6.7: Mobile Optimization
- Moible Optimization

### Release v0.6.8a: Research Only, Security and Best Practices Audit
- Look for hacks
- Look for non stable components
- Look for monolthic files
- Look for security issues
- Look for things that do not follow best practices 
- Look for missing/deprecated imports
- Look for duplicate components that should be reused instead
- Look for inconsistent theming or elements
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