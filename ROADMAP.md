# FlightSentry Roadmap

*Last updated: 2026-11-04*  
*Current Version: v0.6.2*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.6.3
- Flight Stops Search Option
	- Add a stops selection input to the flight modal (Any, Nonstop, 1 stop or fewer, 2+ stops or fewer)
	- Pass stops parameters to search providers and enforce post-query itinerary filtering
- Interactive Airline Tagging
	- Replace comma-separated airline text inputs with interactive chip/bubble tag inputs
	- Automatically match typed carrier codes on space or comma, display the airline name, and apply brand colors
        - Use current airline brand color schemes on the history page, make a global airline theme file maybe?. 
- Flight Modal
    - Bugfix: Already booked is broken, cant add the flight number anymore (also does the other free data source still search the route correctly?) Also it doesnt search on adding which may be bacause I am assuming that I cant currently add a flight number.  
- History Modal
    - When buying a flight should be like Price Paid or something as the source
- Hover takes a few seconds on first airline load on flight card and on actions like search and history, like hovering over AA, it takes 5 seconds for American to show up, but if you move away and come back it loads instantly. Need a better implementation strategy.

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
- Save State
    - when you filter sort or view, and then you go to say settings, and then you come back to dashboard, it resets. I would like it to save the view in the session that you are in, or whatever best practices are

### Release v0.6.5:
- Add a manual mode (no datasources), need to consider ui, dont want clutter, if i need to delete db, lets do it
    - Points (as a currency)
        - Add the ability to add points currencies on the general page (like AAvantage miles and trueblue points)
    - when manual mode (no tracking), can also track in any currency $, pound, etc. 

### Release v0.6.6: Mobile Optimization
- Moible Optimization

### Release v0.6.7a: Research Only, Security and Best Practices Audit
- Look for hacks
- Look for non stable components
- Look for monolthic files
- Look for security issues
- Look for things that do not follow best practices 
- Look for missing/deprecated imports
- Look for duplicate components that should be reused instead
- Old flights cleanup worth it? maybe keep 1 year, but user changeable in settings? performance implications? 
- Every item should be its own phase, and then when developing a plan, reference previous findings

- Make a plan for another ai for v0.6.7 for fixes, no fixes today. Be clear and concise.
    - Double check results


### Release v0.6.7: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.6.8a: Separate playwright container scraper plan
- Playwright for optional hosted scrapper, seperate container.

### Release v0.6.8: Separate playwright container scraper implementation
- Playwright for optional hosted scrapper, seperate container.