# FlightSentry Roadmap

*Last updated: 2026-11-02*  
*Current Version: v0.5.2*

## Overview
This document tracks planned improvements, enhancements, and technical debt for FlightSentry

## Release Roadmap

### Release v0.5.4: UX Fixes
- All amounts seems to be rounded to the nearest dollar from google flights, if so, we should not show cents anywhere
- No more save all settings
    - Every api key should have a save, and if you navigate away, it should prompt you 
    - Scehdule can just have a Save Button for the whole page, and if you navigate away, it should prompt you 
    - Notifcations should have a save button for the min dollar and % alert, it doesnt need a save all setting, , and if you navigate away, it should prompt you 
    - There should be a better ui for saving the settings, not using the brower popup
- Scheduling operating hours
- When are checks done?
    - Users should be able to set what time of day checks start, no start / end hours
    - Each one (far our, standard, final) should have it own candence. And if less than 12, when a user types in one number it should compute and show the next
- Add what data source was used on the history table. 
- No data sources configured or all paused? No add flight. If fails to look up across all data sources, no add flight. create appropriate error messages for each.
- Dashboard Flight Card (expanded and slim) Add Google Flights Link
    - I think history is the most important here, maybe make the top 1/2 or 2/3 clickable to the history. need ideas for better ui/ux. 
- APIs need a set reset date for api quota, and the ui needs to keep track of that. 

### Release v0.5.4:
- Mobile optimization

### Release v0.5.6:
- Points tracking (manual)
- Dollar tracking (manual)
- Currency Selector

### Release v0.5.8: Security and Best Practices Audit

### Release v0.6.0:
- Old flights cleanup 