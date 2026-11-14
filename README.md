# FlightSentry

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.8.5-blue.svg)
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
- **Search Preferences:** Filter itineraries by departure time windows (earliest/latest in 15-minute increments) and exclude overnight redeye flights.
- **Price Surge & Drop Alerts:** Monitor price drops, price increases, or both for prospective flights with custom dollar or percentage alert thresholds.
- **Convert to Booked:** 1-click in-place transition from watching to booked status that preserves historical price trends and switches tracking to rebooking drop credits.
- **Custom Price Alerts:** Automated drop and surge alerts via Discord Webhook, Slack Webhook, Generic Webhook, or SMTP Email with independent channel toggles, isolated testing, and custom thresholds.
- **Quota Modes & Resets:** Configure monthly recurring quota resets by day of the month (1st–31st) or one-time credit pools per API provider.
- **Smart Scheduling:** Preserves API tokens by dynamically scaling check frequency based on departure date—flights closer to departure are checked more frequently, while distant flights are polled on longer intervals.
- **Multi-Strategy Query Routing:** Pool quotas across active providers using Round-Robin rotation, Balanced Usage (% quota consumed), or Exhaust Quota priority, with optional scraper-first prioritization.

## Data Sources
FlightSentry connects to multiple flight search APIs and a self-hosted scraper service to pull live flight fares. Several API providers offer free tiers (typically around 100 searches per month). FlightSentry rotates requests, balances quota usage, or fails over across configured sources to maintain price tracking coverage.

Pairing `FlightSentry-Scraper` with at least one API provider ensures uninterrupted price checks when the scraper is paused, in cooldown, or at its hourly/daily limit.

### Current Supported Data Sources
- **[SerpAPI](https://serpapi.com/):** Provides 250 free searches per month.
- **[SearchApi.io](https://www.searchapi.io/):** Provides 100 free searches.
- **[FlightSentry-Scraper](https://github.com/thebronway/FlightSentry):** Self-hosted Google Flights scraper service with API key authentication and rolling hourly/daily limits.

### Future Supported Data Sources
- TBD

## Author
Check out my other projects at [brian.conway.im](https://brian.conway.im/).
Find this or any of my other projects useful or helpful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Acknowledgments
This project was coded with AI assistance, but fully reviewed, tested, and approved by hand. See [AIACKNOWLEDGMENT.md](AIACKNOWLEDGMENT.md) for details.

*This software is provided "as is", without warranty of any kind, express or implied.*