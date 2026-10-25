# FlightSentry

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-v0.2.5-yellow.svg)
![Docker](https://img.shields.io/docker/pulls/thebronway/flightsentry?logo=docker)

### A self-hosted flight price tracker built with Next.js, Node.js, SQLite, and Docker.

This application monitors upcoming flight prices and alerts you when fares drop below your specified thresholds. It can utilize multiple data sources (SerpAPI, SearchApi.io and Fast-Flights), manages API quotas, and executes background checks on a smart schedule.

**GitHub:** [thebronway/FlightSentry](https://github.com/thebronway/FlightSentry) | [Report a Bug or Request a Feature](https://github.com/thebronway/FlightSentry/issues)  
**Docker Hub:** [thebronway/flightsentry](https://hub.docker.com/r/thebronway/flightsentry)  
**Roadmap:** See planned features in the [Project Roadmap](./ROADMAP.md).  
**Changelog:** Review past releases in the [Changelog](./CHANGELOG.md).  
**Support:** Find this useful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Features
* **Flight Price Tracking:** Track specific flight numbers or monitor general origin-to-destination routes. 
* **Basic / Non Basic:** Supports tracking flights by standard or basic economy fare tiers.
* **Price History:** View a historical log of all price checks and API responses for every tracked flight.
* **Custom Alerts:** Notifications via Webhook (Discord, Slack) or SMTP when prices drop by a target dollar amount or percentage.
* **Smart Scheduling:** Check frequency increases automatically as the departure date approaches. Define specific operating hours to limit API usage.
* **Data Sources:** Query SerpAPI, SearchApi.io, and Fast-Flights. Define monthly quotas and fallback strategy logic (sequential query or exhaust quota).

## Author
Check out my other projects at [brian.conway.im](https://brian.conway.im/).
Find this or any of my other projects useful or helpful? [Support my work (Buy me a coffee)](https://buymeacoffee.com/brianconway).

## Acknowledgments
This project was coded with AI assistance, but fully reviewed, tested, and approved by hand. See [AIACKNOWLEDGMENT.md](AIACKNOWLEDGMENT.md) for details.

*This software is provided "as is", without warranty of any kind, express or implied.*