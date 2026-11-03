# FlightSentry Changelog

*Last updated: 2026-11-03*  
*Current Version: v0.6.0*

## Changelog

### Release v0.6.0
- Added recurring monthly quota reset day selector (1st–31st) with automatic date calculation and shorter month clamping.
- Added departure time window filters (earliest and latest departure) with 15-minute stepper increments.
- Added "Exclude Redeye Flights" search filter to eliminate overnight departures.
- Added price increase tracking and surge alert notifications for prospective flights with custom dollar and percentage thresholds.
- Added in-place "Convert to Booked" action to transition watched flights to booked status while retaining all historical price data.
- Refined dashboard card layout and market corridor gauge padding to maintain balanced vertical spacing across multi-badge flights.

### Release v0.5.8: Bug Fixes
- Bug Fix: Synchronized Pause All and Resume All buttons with individual provider pause toggles.
- Bug Fix: Fixed cadence dropdown displaying "Do not check (Paused)" when set to unlisted intervals.
- Bug Fix: Fixed timezone bug preventing flight creation for the current day after 8:00 PM local time.
- Bug Fix: Replaced generic Fast-Flights error logs with specific failure reasons and prevented scraper errors from blocking provider failover.
- Bug Fix: Fixed SearchApi.io parameter mappings for cabin class and included airlines to resolve HTTP 400 errors during rotation.
- Bug Fix: Removed manual Save Strategy button and enabled autosave on dropdown selection.

### Release v0.5.6
- Installed `tzdata` in Alpine Docker container to ensure correct local timezone resolution.
- Added custom chevron indicator with right padding to scheduling and strategy select dropdowns.
- Re-architected Quota Ribbon grid to adapt dynamically to 2, 3, 4, 5, and 6 active data sources.
- Streamlined Fast-Flights scraper settings by removing redundant save buttons and adding autosave with confirmation toasts.
- Refined dashboard warning banner to replace "Configure Settings" with an immediate "Unpause All" action when automation is paused.
- Computed real-time minimum dollar and percentage drop alert thresholds on the flight edit modal.
- Added balanced right-aligned alert threshold targets to dashboard flight cards and condensed rows.
- Aligned Route Market Corridor calculations to strictly reflect tracked price history.
- Added persistent diagnostic query logging and log inspection modal per data source.
- Updated footer attribution link copy.

### Release v0.5.4
- Rounded all currency amounts across the application to whole dollars (no cents).
- Replaced global save button with granular saves per provider, routing strategy, schedule, and alert thresholds.
- Streamlined notification channel cards to a single "Save & Test" action.
- Added in-app unsaved changes modal guarding tab switches and dashboard navigation.
- Removed operating hours in favor of daily check start time with 24-hour schedule preview.
- Standardized schedule cadence selectors to curated dropdowns with a pause option.
- Added data source badges to price history check logs.
- Added independent quota reset dates for metered API providers.
- Made upper region of flight cards and condensed rows clickable to open history.
- Added direct Google Flights links to flight cards and condensed rows.
- Disabled flight creation when data sources are unconfigured, paused, or live lookup fails.
- Footer Updates

### Release v0.5.2
- Updated DataSourcesTab provider cards to match Query Routing Strategy background styling.
- Added right padding to Query Routing Strategy dropdown selector.
- Replaced priority order chevrons with bordered button controls.
- Expanded FlightModal container width to max-w-4xl and aligned departure date, fare restrictions, and cabin class into a 3-column row.
- Updated TrackingGoalSection and AlertThresholdsSection containers to match settings card styling.
- Removed manual Initial Baseline Price input in favor of automated live fare detection on save.
- Added client-side and server-side validation blocking departure dates in the past.
- Added Google Flights deep-link buttons to HistoryModal header and individual price check rows.
- Replaced RouteCorridorSummary rainbow bar with continuous range gradient and circular indicator marker.
- Replaced Active and Expired flight statuses with Upcoming and Past across database schema, scheduler, validation, and UI.
- Added collapsible Past Flights section to dashboard to group departed flights.
- Disabled automated background checks and manual check API triggers for past flights.
- Removed citation artifacts across settings tabs and flight modal components.

### Release v0.5.0
- Breakup monolithic files
    - FlightModal.tsx
    - SettingsForm.tsx
    - HistoryModal.tsx
    - PriceChart.tsx
    - apprise.ts
    - routeIntelligence.ts
- Removed duplicated logic in FlightCard.tsx and FlightCondensedView.tsx

### Release v0.4.5
- Added multi-carrier price trend plotting to PriceChart for route searches.
- Added carrier filter pill bar above chart with individual airline toggles.
- Added synchronized crosshair scrubber displaying unified price comparisons across operating carriers on hover.
- Added dedicated brand color palette for DL, AA, UA, B6, WN, AS, and F9 with lightness-bounded HSL fallback.
- Added Route Corridor summary header displaying Current Route Floor, All-Time Low, All-Time High, and market spread gauge.
- Added compact Route Corridor spread gauge to dashboard flight cards.
- Added Carrier Breakdown Matrix table below price chart displaying best flight schedule, current lowest fare, historical range, and check delta.
- Enriched price drop notifications with winning airline code, flight number, competing fare breakdown, and Google Flights deep-link.
- Extended price_history table schema and migrations with airline, flightNumber, metadata, and sourceUsed columns.
- Updated SerpAPI, SearchApi.io, HasData, and Fast-Flights parsers to retain all returned itineraries in check metadata.

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