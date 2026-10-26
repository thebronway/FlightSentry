# FlightSentry Changelog

*Last updated: 2026-10-26*  
*Current Version: v0.4.0*

## Changelog

### Release v0.4.0
- Merged Provider Priority Order ranking list and configuration cards into a single unified stack of reorderable cards.
- Implemented fixed rank positions with visual disabled states, skipping inactive providers at runtime without shifting rankings.
- Added HasData external flight search provider with cabin tier, airline filtering, and rate-limit detection.
- Prioritized active unmetered scraper providers before metered APIs regardless of active routing strategy.
- Added randomized jitter delays to scraping providers to mitigate anti-bot and CAPTCHA rate limits.
- Added disclaimer banners for unmetered scrapers regarding residential connection requirements.
- Implemented SQLite-backed persistent atomic pointer for Round-Robin rotation across worker and web containers.
- Added "Balanced Usage" routing strategy directing queries to the active provider with the lowest percentage of quota consumed.
- Retained "Exhaust Quota" priority failover strategy.
- Added contextual guidance blurb and static strategy descriptions to Data Sources settings.
- Added debounced flight route lookup on carrier code and flight number input using zero-quota public aviation schedules.
- Added confirmation alert when origin and destination are auto-populated from schedule lookup.
- Added mismatch warning alert when manually typed airport pairs differ from schedule lookup results with 1-click adoption.
- Maintained editable airport code inputs to support seasonal and charter route changes.
- Added modular notification cards for Discord Webhook, Slack Webhook, Generic Webhook, and SMTP Email.
- Added independent enable toggles per notification channel that preserve stored credentials when toggled off.
- Added isolated "Save" and "Save & Test" actions per channel, replacing global notification tests with single-channel validation.

### Release v0.3.5
- Added separate tracking goals for flights: "Planning to Book" (prospective fare tracking) and "Already Booked" (purchase price and rebooking credit drop tracking).
- Added purchase price and booking confirmation (PNR) tracking with specialized rebooking credit alert notifications.
- Added per-flight alert threshold overrides for dollar and percentage drop alerts.
- Added  checkboxes in the flight modal for pausing automated price checks and muting notifications.
- Reorganized flight modal layout placing Fare Restrictions and Cabin Class onto a dedicated row to prevent label clipping.
- Added locked search mode indicator when editing existing flights to preserve historical tracking integrity.
- Added dynamic inheritance placeholders in the flight modal pulling current global defaults for cadences and drop thresholds.
- Updated price history graphs and intraday logs to plot against purchase price benchmarks when present.
- Added real-time quota ribbon synchronization across manual price checks and flight creations without requiring page reloads.
- Added responsive mobile navigation hiding text labels on smaller screens to maximize viewport space.
- Realigned Settings page header outside the container bounding box to match Dashboard layout.
- Reorganized Query Routing Strategy onto its own full-width row with dedicated explanatory subtext.
- Renamed execution order priority to Provider Priority Order with chevron up/down controls.
- Added contextual inheritance banners across Scheduling and Notifications settings tabs.
- Defaulted all external search APIs to unchecked (disabled) for fresh database initializations.

### Release v0.3.0
- Replaced search mode radio buttons with clickable cards in the flight modal.
- Equalized input and select dropdown heights across the flight modal.
- Renamed Baseline Price to Initial Price and added automated price lookup.
- Added separate controls for Fare Restrictions and Cabin Class.
- Removed Target Alert Price field.
- Fixed state reset bug carrying over dates and schedule metrics between modal opens.
- Displayed airline inclusion and exclusion filters on flight cards and condensed rows.
- Updated flight card typography to display route or flight number above departure date.
- Added flight edit button to cards and condensed view.
- Added toggle between Card View and Condensed Table View.
- Added dashboard sort options defaulting to soonest departure date.
- Refactored quota ribbon to auto-fit active sources and added per-source pause buttons.
- Renamed global automation pause button.
- Updated manual price checks to reschedule the flight queue immediately.
- Replaced history flyout drawer with a centered modal.
- Added SVG price history graph with baseline reference line and hover tooltips.
- Added intraday price delta and timestamp grouping to price history.

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