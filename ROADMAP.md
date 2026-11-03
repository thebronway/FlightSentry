# FlightSentry Roadmap

*Last updated: 2026-11-03*  
*Current Version: v0.6.0*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.6.2:
- Compact Quota Ribbon
    - Flatten each provider entry into a single line (Name, Usage, Reset Date, Pause/Resume)
	- Remove the subtitle description text completely
	- Enforce a strict 2-column grid layout; span the final card full width if the provider count is odd
- Dashboard Filtering & Card Distinction
	- Add dashboard filter toggle options for All Flights, Watching, and Booked
	- Apply distinct visual styles to flight cards based on tracking mode (Watching vs Booked)
    - Add badges on Flight Card to condensed view
- Card Actions & Modal Dialogs
	- Assign unique colors and descriptive tooltips to every action icon on flight cards
	- Replace the native browser alert with a custom-styled in-app deletion confirmation modal
- Route Airline Carrier Bubbles
	- Remove the single cheapest airline text on route cards
	- Display colored carrier bubble pills for all operating airlines returned in query results
- Data Sources Priority Reorganization
	- Remove priority rank numbers and reorder arrow buttons from Fast-Flights
	- Position Fast-Flights permanently at the bottom with a clear visual section break from metered APIs
- Bug Fixes
	- Fix Track Flight button remaining disabled after using Unpause All until a manual page refresh

### Release v0.6.4
- Universal Settings Autosave
	- Remove individual provider save buttons; autosave every field on change or blur with a custom toast
	- Remove the save schedule button; autosave all cadence selections with a custom toast
	- Remove the save thresholds button; autosave threshold inputs with a custom toast
	- Change channel Save & Test buttons to standalone Test buttons that run against stored values
- Global Surge Alert Defaults
	- Add global minimum price increase dollar and percent settings to the database and Notifications tab
	- Provide explicit global surge defaults to flight cards and modal inputs
- General Preferences & Currency Selector
	- Add a new General tab in Settings for instance-wide preferences
	- Add an app-wide currency selector dropdown
	- Format all currency outputs and pass the selected currency code upstream to search providers
- Flight Stops Search Option
	- Add a stops selection input to the flight modal (Any, Nonstop, 1 stop or fewer, 2+ stops)
	- Pass stops parameters to search providers and enforce post-query itinerary filtering
- Interactive Airline Tagging
	- Replace comma-separated airline text inputs with interactive chip/bubble tag inputs
	- Automatically match typed carrier codes on space or comma, display the airline name, and apply brand colors

### Release v0.6.4a: Research Only, Security and Best Practices Audit
- Look for hacks
- Look for non stable components
- Look for monolthic files
- Look for security issues
- Look for things that do not follow best practices 
- Look for missing/deprecated imports
- Old flights cleanup worth it? keep 1 year, but user changeable in settings? performance implications? 
- Make a plan for 0.6.4 for fixes, no fixes today

### Release v0.6.4: Security and Best Practices Application
- Security and Best Practices Application

### Release v0.6.5:
- Add a manual mode (no datasources), need to consider ui, dont want clutter, if i need to delete db, lets do it
    - Points (as a currency)
        - Add a settings page to add points currencies setups
    - Money tracking (manual) mode for a flight

### Release v0.6.6: Mobile Optimization
- Moible Optimization

### Release v0.6.7:
- Playwright for optional hosted scrapper