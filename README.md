# Client Success Operations Hub

A local full-stack app for working through customer support tickets. It imports a helpdesk CSV into SQLite, adds a small amount of account and workflow data, and presents the result as a customer success operations dashboard.

## Features

- Dashboard with ticket totals, SLA status, owner workload, and an action center
- Ticket list with filters for priority, queue, type, language, status, owner, company, and search
- Ticket detail view with customer message, support answer, status updates, internal notes, tags, and timeline events
- Customer list with ARR, tier, renewal date, account owner, health score, and ticket counts
- Customer detail pages with recent tickets, issue categories, and a suggested next action
- Analytics view with simple chart summaries
- CSV import flow that rebuilds the local SQLite database

## Tech Stack

- React + Vite
- Node.js + Express
- SQLite using Node's built-in `node:sqlite`
- Plain CSS

API details are in [docs/API.md](docs/API.md).

## Running Locally

This project requires Node.js 24 or newer.

```bash
npm install
npm run import
npm run dev
```

Then open:

```text
http://127.0.0.1:5173/
```

Other useful commands:

```bash
npm run build
npm run server
npm run smoke
```

Run `npm run smoke` in a separate terminal while `npm run server` is running.

## Dataset

The app imports:

```text
data/helpdesk_customer_tickets.csv
```

The CSV is a helpdesk/customer tickets dataset downloaded from Kaggle for local project use. It includes ticket subjects, message bodies, support answers, ticket type, queue, priority, language, business type, and tags.

The source data does not include full SaaS account records, so the importer adds demo fields such as company, owner, status, SLA due date, ARR, renewal date, and timeline events. Those generated fields make the app easier to explore without changing the original ticket content.

## Screenshots

Screenshot notes are tracked in [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

Recommended captures:

- Dashboard
- Tickets
- Ticket Detail
- Customers
- Customer Detail
- Analytics

## Future Improvements

- Authentication and role-based access
- Pagination and saved filters
- More realistic SLA rules by customer tier and priority
- Note history with authors and timestamps
- Email notifications
- CSV upload from the UI
- Exportable reports
- Automated tests

AI tools were used during development for scaffolding, debugging, and documentation cleanup. I reviewed and adjusted the code and docs throughout the project.
