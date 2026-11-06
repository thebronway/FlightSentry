# FlightSentry Changelog

*Last updated: 2026-11-06*  
*Current Version: v0.7.3*

## Changelog

### Release v0.7.3
- Added opt-in "Also Monitor Route Alternatives" dual flight and route tracking for watched and booked flights.
- Added alternative route scope selector for airport co-locations (exact airport vs. metro/regional clusters).
- Added watched-to-booked route adoption with quick-select options from lowest monitored flights.
- Added "Overlay Route Floor" toggle in Price History to overlay market floor and competitor trends on demand.
- Updated alert notifications to feature primary flight benchmarks with a compact secondary route alternatives table.
- Fixed flight number parser stripping digits on multi-digit flight numbers (e.g. AA 830).
- Fixed background settings polling resetting flight modal state during active user input.

### Release v0.7.2
- Added layover airport codes, column sorting, and expand/collapse to Carrier Breakdown.
- Compacted Price Chart hover tooltips to single-line summaries to eliminate clipping.
- Added operating carrier badges and lowest-price carrier indicators to Condensed View.
- Fixed tooltip boundary clamping, z-index clipping, and single-airport co-location badges.

### Release v0.7.1
- Added Search Preferences tab in Settings for instance-wide flight search defaults.
- Added instance defaults for cabin class, fare tier, max stops, redeye filtering, and airline inclusions/exclusions.
- Auto-populated new flight tracking modals from global search defaults.
- Added max stored itineraries setting (6–24) and carrier diversity engine toggle.
- Implemented carrier diversity algorithm guaranteeing at least 1 lowest fare per operating airline on route checks.
- Updated Carrier Breakdown Matrix with intermediate layover airport display, multi-departure inspection, and table sorting.
- Streamlined Price Chart hover scrubber to compact per-airline summaries with departure counts.
- Centered airline badge hover tooltips across cards, tables, and modal headers.
- Fixed single-destination airport co-location badge display in the Price History header.

### Release v0.7.0
- Application-wide domain terminology alignment: Watching and Booked
- Eliminated legacy references to "Planning to Book", "Upcoming", and "Active" in filter chips, modal titles, and status tooltips.
- Cleaned up database flight status enums with automatic migration transitioning legacy upcoming/active records to Watching or Booked.
- Added domain status indicator badges to the price history modal header.
- Updated flight creation, edit, and conversion modals to clearly reflect Watching and Booked workflows.

### Release v0.6.9
- Added points and award mileage currency tracking (e.g., AAvantage miles, TrueBlue points) for watched and booked flights.
- Added points currencies management on the General settings tab with quick-add presets and autosave.
- Filtered flight creation, editing, and convert-to-booked currency dropdowns to configured points currencies.
- Automatically disabled automated search checks for points flights to prevent unnecessary queries and conserve API quotas.
- Added integer points formatting (`pts`), coin badges, and disabled check states across dashboard cards, condensed view, and price history modals.

### Release v0.6.8
- Added support for IATA Metropolitan Area Codes (WAS, NYC, CHI, LON, PAR, TYO, etc.) and regional clusters (DFW/DAL, MIA/FLL/PBI/DJT, LAX basin, SFO bay).
- Added explicit opt-in buttons in the flight modal to switch to metro codes or include regional sister airports.
- Automatically expanded metro codes to constituent physical airport codes for upstream search providers (HasData, SerpApi, SearchApi, Fast-Flights).
- Captured physical leg origin and destination across search providers, displaying exact routes on the Carrier Breakdown Matrix, check logs, and chart tooltips.
- Converted Best Flight & Schedule in the Carrier Breakdown Matrix to a stacked 2-line layout to prevent column clipping.
- Expanded Flight Modal and History Modal maximum widths to 6xl on desktop displays.
- Added visibility-aware background polling and tab-focus synchronization across dashboard cards, quotas, and the History Modal.

### Release v0.6.7
- Enlarged settings autosave toast notification with status icons and enhanced visibility.
- Replaced generic autosave toasts with specific field and action messages across all settings tabs.
- Replaced hardcoded dollar symbols with active configured currency in alerts, modals, and toasts.
- Preserved dashboard filter, sort, and view layout in session storage across page navigation.
- Preserved Quota Ribbon collapsed state across visits via local storage.
- Replaced "Credit Claimed" phraseology with "Rebook Savings" across cards, modals, history logs, and alerts.

### Release v0.6.6
- Swapped PNR and departure date positions on booked flight modal.
- Moved departure date to top section of flight modal across all search modes.
- Added departure date parameter to route lookup telemetry and schedule auto-detection.
- Shortened fare restriction dropdown labels to "Standard (No Basic)" and "Basic / Unbundled".
- Adjusted fare restriction and cabin class container widths to prevent label clipping.

### Release v0.6.5
- Removed Market Corridor gauge from dashboard flight cards (retained in price history modal).
- Added current lowest price carrier bubble next to current price on watched flight cards.
- Removed redundant carrier bubble from header on booked flight cards.
- Replaced browser tooltips with custom instant tooltips on flight card and condensed view action buttons.

### Release v0.6.4
- Universal Settings Autosave: Removed manual save buttons; automatically persist updates on blur, change, or Enter key with immediate toast feedback.
- Decoupled Notification Testing: Replaced combined "Save & Test" actions with standalone "Test" triggers.
- Global Surge Alert Defaults: Added global minimum price increase dollar and percentage settings to database schema, migrations, and Notifications tab, inherited by flight cards, condensed view, and flight modal inputs.
- General Preferences Tab: Added a dedicated General tab in Settings displaying the instance currency selector, configured Docker container timezone, live local clock, application version, and developer links.
- App-Wide Currency Selector: Added support for 15+ world currencies (USD, EUR, GBP, CAD, AUD, JPY, etc.), formatting all prices and graphs with the active currency symbol, with safety warnings for existing flights and upstream currency passing to SerpAPI, SearchApi.io, HasData, and Fast-Flights.
- Flight Route Lookup Telemetry: Instrumented zero-quota route lookups to record queries in datasource_logs and added a live route lookup activity feed at the bottom of the Data Sources tab.

### Release v0.6.3
- Added flight stops search preference dropdown (Any, Nonstop, 1 stop or fewer, 2+ stops or fewer) with database migration and provider parameter passing.
- Enforced post-query itinerary filtering by maximum stops across SerpAPI, SearchApi.io, HasData, and Fast-Flights.
- Added stops indicator badges (Nonstop, ≤ 1 Stop, ≤ 2 Stops) to dashboard flight cards and condensed rows.
- Replaced comma-separated airline text inputs with interactive chip tag input supporting space, comma, and Enter triggers.
- Created centralized airline theme system (src/utils/airlineThemes.ts) with brand colors, names, and catchall aliases (e.g. SW, JB, Delta).
- Replaced native OS delay tooltips with instant (<150ms) CSS hover tooltips across flight cards, condensed view, and history modal.
- Fixed missing flight number input on booked flights and enforced required flight number validation.
- Hid irrelevant route search preferences (departure times, redeye, stops) and airline inclusion/exclusion filters when tracking goal is Booked.
- Fixed initial live price search skipping on booked flight creation.
- Added "Price Paid" source label for booking milestones and convert-to-booked history entries.
- Added in-place rebooking credit tracking, recording rebook milestones in price history and displaying credit claimed badges on cards and history logs.

### Release v0.6.2
- Redesigned Quota Ribbon into a collapsible 2-column grid with single-line provider entries and odd-item spanning.
- Added combined metered and unlimited query tallies to the collapsed Quota Ribbon header.
- Added dashboard filter toggles for All, Watching, and Booked flights with count badges.
- Standardized dashboard toolbar element heights.
- Applied distinct border accents and badges for Watching vs. Booked flights across card and condensed views.
- Ported cabin class, fare tier, redeye, and tracking direction badges to the condensed view.
- Added row click navigation to price history on condensed view rows through the status column.
- Replaced native browser confirm alerts with an in-app deletion confirmation modal.
- Assigned unique colors and descriptive tooltips to card action buttons.
- Replaced external link icon with the Google Flights logo across flight cards, condensed view, and history modal.
- Replaced single cheapest airline text on route cards with colored carrier bubble pills for operating airlines.
- Positioned Fast-Flights permanently at the bottom in a dedicated unmetered section and removed priority rank and reorder controls.
- Fixed Track Flight button remaining disabled after clicking Unpause All until manual page refresh.

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