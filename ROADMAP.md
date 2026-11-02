# FlightSentry Roadmap

*Last updated: 2026-11-02*  
*Current Version: v0.5.2*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.5.6:
- Docker not passing correct local time to container, verify with commands.
- Schedule dropdown arrows need right padding
- Quota Reset should be day of the month dropdown?
- Compute min $ and % drop alerts on edit page
    - take current price and subtrack value to show when it will alert
    - Add to flight card somewhere, consider good ui/ux
- Add a log button to each data source that shows the last queries and if they succeeded or failed (and why they failed espcially for fast flights)
- market cooridor not matching up
- Why is there a save for fast flights scrapper. checkboxes to enable and arrows should autosave (and get that green status message when they do)
- All data sources are currently paused (Global Pause is active). Configure Settings → error message. Configure Settings → should only be if no data sources or out of api tokens, when pasued Configure Settings → should not be there, maybe change to unpause all
- change quota ribbon
    - if 3, 1x3 (current)
    - if 6, 1x3 and then 1x3 (current)
    - if 2, 1x2 (current)
    - if 4, 1x2 and then 1x2 (new) (current is 1x3 and then 1 by itself on bottom)
    - if 5, do 1x3 and then 1x2 (I know there isnt 5 data sources currently, but one day maybe)
- Footer - want to replace brian.conway.im with something that says like this is the developer's website, come look at more apps, but in like 2 to 3 words instead of just showing the link, I think right?

### Release v0.5.8:
- Points tracking (manual) mode for a flight
- Money tracking (manual) mode for a flight
- Currency Selector, for app wide - does google flights support (and all data sources support that?) if not do not add
- other free scrappers to add?

### Release v0.6.0: Security and Best Practices Audit

### Release v0.6.2:
- Old flights cleanup worth it? keep 1 year, but user changeable in settings? performance implications? 

### Release v0.6.4: Mobile Optimization