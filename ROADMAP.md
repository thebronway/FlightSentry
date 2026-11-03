# FlightSentry Roadmap

*Last updated: 2026-11-02*  
*Current Version: v0.5.6*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.5.8: Bug fixes
- Pause logic
    - If you click pause all, all the pause buttons should switch to pause
    - If you click resume all, all the buttons should switch to resume
    - If you click pause all, and you manually un pause one, it should go back to pause all
- Final Stretch ui bug, see screenshot, its currently set to 11 hours, but it says do not check, paused
- tz bug, tz is now set properly, time in the container is 8p, why cant I add flights for today (is it going off of utc?)
- Fastflights bug, logs say: API request failed or returned invalid response format <what does that mean?>, need a better error message
- Remove save strategy button, and make Query Routing Strategy an autosave

### Release v0.6.0:
- Points tracking (manual) mode for a flight
- Money tracking (manual) mode for a flight
- Currency Selector, for app wide - does google flights support (and all data sources support that?) if not do not add
- other free scrappers to add?
- Quota Reset should be day of the month dropdown?
- Cant add a flight after 8pm

### Release v0.6.2: Security and Best Practices Audit

### Release v0.6.4:
- Old flights cleanup worth it? keep 1 year, but user changeable in settings? performance implications? 

### Release v0.6.6: Mobile Optimization

### Release v0.6.8:
- Time of Day
- No Redeye ()
- Price Incrase (add to notfications and to flight modals)

### Release v0.7.0:
- Playwright for hosted scrapper