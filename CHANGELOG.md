# FlightSentry Changelog

*Last updated: 2026-10-25*  
*Current Version: v0.1.5*

## Changelog
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