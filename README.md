# FlightSentry

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.3.5-yellow.svg)
![Docker](https://img.shields.io/docker/pulls/thebronway/flightsentry?logo=docker)

### A self-hosted flight price tracker that monitors flight prices and sends alerts when fares drop.
Built with Next.js, Node.js, SQLite, and Docker.

> **Note:** This app is in active devleopment, features and functionalities will vary.

FlightSentry tracks prices for specific flight numbers or entire routes and sends alerts when fares drop. It connects to multiple flight search APIs, pools free query allowances, and checks prices on an automated schedule designed to preserve API usage.

**GitHub:** [thebronway/FlightSentry](https://github.com/thebronway/FlightSentry) | [Report a Bug or Request a Feature](https://github.com/thebronway/FlightSentry/issues)  
**Docker Hub:** [thebronway/flightsentry](https://hub.docker.com/r/thebronway/flightsentry)  
**Roadmap:** See planned features in the [Project Roadmap](./ROADMAP.md).  
**Changelog:** Review past releases in the [Changelog](./CHANGELOG.md).  
**Support:** Find this useful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Features
- **Route & Flight Tracking:** Monitor general city-pair routes or track specific airline carrier codes and flight numbers.
- **Cabin Class & Restrictions:** Support for Economy, Premium Economy, Business, and First Class, with options to filter out or include Basic fares.
- **Interactive Price Graphs:** View price history as a trend chart, with baseline reference lines, and intraday price spread tracking.
- **Dashboard Views:** Toggle between full-card and condensed table views, with sorting by departure date, price, or route.
- **Custom Price Drop Alerts:** Automated alerts via Discord, Slack, or SMTP email when prices drop below your set dollar or percentage thresholds.
- **Smart Scheduling:** Preserves API tokens by dynamically scaling check frequency based on departure date—flights closer to departure are checked more frequently, while distant flights are polled on longer intervals.
- **Quota Pooling:** Define monthly limits, pause data sources individually, and choose between Round-Robin rotation or Exhaust Quota failover.

## Data Sources
FlightSentry requires at least one external search service to pull live flight fares. Several providers offer free plans (typically around 100 free searches per month). FlightSentry strings these services together—either rotating requests or failing over when a quota is exhausted—to give you maximum coverage without requiring a paid subscription.

### Current Supported Data Sources
- **[SerpAPI](https://serpapi.com/):** Provides 100 free searches per month.
- **[SearchApi.io](https://www.searchapi.io/):** Provides 100 free searches per month.

### Future Supported Data Sources
- TBD

## Author
Check out my other projects at [brian.conway.im](https://brian.conway.im/).
Find this or any of my other projects useful or helpful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Acknowledgments
This project was coded with AI assistance, but fully reviewed, tested, and approved by hand. See [AIACKNOWLEDGMENT.md](AIACKNOWLEDGMENT.md) for details.

*This software is provided "as is", without warranty of any kind, express or implied.*