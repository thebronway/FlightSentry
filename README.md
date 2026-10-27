# FlightSentry

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.5.0-blue.svg)
![Docker](https://img.shields.io/docker/pulls/thebronway/flightsentry?logo=docker)

### A self-hosted flight price tracker that monitors flight prices and sends alerts when fares drop.
Built with Next.js, Node.js, SQLite, and Docker.

> **Note:** This app is in active devleopment, features and functionalities will vary.

FlightSentry tracks prices for specific flight numbers or entire routes and sends alerts when fares drop. It connects to multiple flight search data sources / APIs, pools free query allowances, and checks prices on an automated schedule designed to preserve API usage.

**GitHub:** [thebronway/FlightSentry](https://github.com/thebronway/FlightSentry) | [Report a Bug or Request a Feature](https://github.com/thebronway/FlightSentry/issues)  
**Docker Hub:** [thebronway/flightsentry](https://hub.docker.com/r/thebronway/flightsentry)  
**Roadmap:** See planned features in the [Project Roadmap](./ROADMAP.md).  
**Changelog:** Review past releases in the [Changelog](./CHANGELOG.md).  
**Support:** Find this useful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Features
- **Route & Flight Tracking:** Monitor general city-pair routes or track specific airline carrier codes and flight numbers with route auto-detection and mismatch guidance alerts.
- **Tracking Goals:** Support for prospective fare monitoring ("Planning to Book") and post-purchase rebooking credit drop tracking ("Already Booked") with booking confirmation (PNR) logging.
- **Cabin Class & Restrictions:** Support for Economy, Premium Economy, Business, and First Class, with options to filter out or include Basic fares.
- **Interactive Price Graphs:** Multi-airline and single-flight trend charts with carrier filter toggles, tooltips, benchmark lines, and route corridor gauges.
- **Dashboard Views:** Toggle between full-card and condensed table views, with sorting by departure date, price, or route.
- **Custom Price Drop Alerts:** Automated alerts via Discord Webhook, Slack Webhook, Generic Webhook, or SMTP Email with independent channel toggles, isolated testing, and custom dollar or percentage drop thresholds.
- **Smart Scheduling:** Preserves API tokens by dynamically scaling check frequency based on departure date—flights closer to departure are checked more frequently, while distant flights are polled on longer intervals.
- **Multi-Strategy Query Routing:** Pool quotas across active providers using an atomic SQLite Round-Robin rotation, dynamically route queries via Balanced Usage (% quota consumed), or fail over using Exhaust Quota priority, with unmetered scrapers prioritized first.

## Data Sources
FlightSentry connects to multiple flight search APIs and scraping engines to pull live flight fares. Several providers offer free plans (typically around 100 free searches per month). FlightSentry strings these services together—either rotating requests, balancing quota consumption, or failing over when a quota is exhausted—to give you maximum coverage without requiring a paid subscription.

While unmetered scrapers like Fast-Flights are supported without an API key, relying on a scraper as your sole data source is not recommended. When it works, it works great, but scrapers are volatile and subject to anti-bot blocks or CAPTCHAs. Pairing an unmetered scraper with at least one official API provider ensures reliable, uninterrupted price tracking when scraper requests fail.

### Current Supported Data Sources
- **[SerpAPI](https://serpapi.com/):** Provides 100 free searches per month.
- **[SearchApi.io](https://www.searchapi.io/):** Provides 100 free searches per month with cabin tier and airline filter support.
- **[HasData](https://hasdata.com/):** Google Flights scraper API with structured returns, airline filtering, and rate-limit detection.
- **[Fast-Flights](https://github.com/thebronway/FlightSentry):** Unmetered scraper executed first with randomized jitter delay (requires a home or residential internet connection).

### Future Supported Data Sources
- TBD

## Author
Check out my other projects at [brian.conway.im](https://brian.conway.im/).
Find this or any of my other projects useful or helpful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Acknowledgments
This project was coded with AI assistance, but fully reviewed, tested, and approved by hand. See [AIACKNOWLEDGMENT.md](AIACKNOWLEDGMENT.md) for details.

*This software is provided "as is", without warranty of any kind, express or implied.*