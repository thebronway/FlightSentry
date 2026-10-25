# FlightSentry Changelog

*Last updated: 2026-10-25*  
*Current Version: v0.2.5*

## Changelog

### Release v0.2.5
- Enforced dark mode and removed the theme toggle button from navigation.   
- Replaced gray and indigo colors with a custom gunmetal and slate palette.   
- Restyled buttons, cards, and quota bars, and widened the settings page.

### Release v0.2.0
- Added logo to the application header.
- Updated header title font to monospace and set site-wide accent color to Slate (#64748b).
- Added footer displaying the version from package.json linked to the changelog.
- Added footer links with icons for personal website, GitHub, Docker Hub, and Buy Me a Coffee.
- Implemented SerpAPI data source for route searches and flight number tracking.
- Implemented SearchApi.io data source with cabin tier and airline filter support.
- Implemented Fast-Flights data source.
- Implemented round-robin rotation across active data sources.
- Updated Settings fallback strategy option to Round-Robin.
- Updated flight modal to require origin and destination IATA codes for all search modes.
- Added console logging for query routing, API responses, and flight matching.

### Release v0.1.5
- Redesigned the Settings page into a multi-tab layout (Data Sources, Scheduling, Notifications).
- Added independent enable toggles, API keys, and monthly quotas for SerpAPI, SearchAPI, and Fast-Flights.
- Implemented fallback strategy modes (Sequential Query vs. Exhaust Quota) and a custom execution priority list.
- Added dynamic quota tracking ribbons to the main dashboard for all enabled data sources.
- Replaced the external Apprise container with a native Node.js notification dispatcher.
- Added native SMTP email and Webhook (Discord, Slack) configuration fields to Settings.
- Added a global notification enable/disable toggle to Settings.
- Added a dedicated mute toggle for individual flights within the tracking modal.
- Added a test notification button to validate SMTP and Webhook configurations directly from the UI.