# Client Success Operations Hub

A resume-quality full-stack support operations app built from a real helpdesk-style CSV dataset. The project turns raw customer support tickets into a polished B2B SaaS workflow with dashboards, SLA tracking, ticket detail workspaces, customer health scoring, and account-level views.

The app is intentionally local and easy to explain: React powers the interface, Express exposes the API, and SQLite stores the cleaned operational data.

## Screenshots

Screenshot placeholders are tracked in [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md).

Recommended captures:

- Dashboard
- Tickets
- Ticket Detail
- Customers
- Customer Detail
- Analytics
- About Project

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: SQLite through Node's built-in `node:sqlite`
- Styling: plain CSS, no external UI component library
- Data import: custom CSV parser for multiline ticket bodies and answers

## Dataset Source

The app imports:

```text
data/helpdesk_customer_tickets.csv
```

The CSV came from a Kaggle helpdesk/customer tickets dataset downloaded locally for this project. It includes ticket subjects, customer message bodies, support answers, ticket type, queue, priority, language, business type, and multiple tag columns.

During import, the app adds realistic operational fields that the source data does not include, such as status, owner, SLA due date, created/updated timestamps, customer accounts, ARR, renewal dates, and timeline events.

## Features

- CSV-to-SQLite import flow
- Normalized schema for tickets, companies, tags, ticket-tag joins, and ticket events
- Executive dashboard with total, open, resolved, overdue, due soon, and within-SLA KPIs
- Action Center that highlights what needs attention today
- Ticket table with filters for priority, queue, type, language, status, owner, and global search
- Ticket detail workspace with customer request, support answer, metadata, status editing, internal notes, badges, and timeline
- Customer records with initials badge, tier, ARR, renewal date, account owner, ticket totals, and health score
- Customer detail page with account summary, recommended next action, issue categories, and recent tickets
- Analytics page with CSS-based bar charts
- About page explaining the business problem, dataset, schema, API, and AI-assisted development disclosure

## Architecture Summary

```text
client-success-portal/
  data/
    helpdesk_customer_tickets.csv
  database/
    support_portal.sqlite
  server/
    db.js
    domain.js
    importCsv.js
    index.js
  src/
    main.jsx
    styles.css
  docs/
    ARCHITECTURE.md
    API.md
    DATA_MODEL.md
    DATABASE.md
    DECISIONS.md
    FUTURE_IMPROVEMENTS.md
    READINESS_REVIEW.md
    SCREENSHOTS.md
```

The backend owns data import, schema creation, domain rules, dashboard metrics, ticket APIs, analytics APIs, and customer APIs. The frontend consumes those endpoints and presents the information as a SaaS-style support operations portal.

## Setup Instructions

Install dependencies:

```bash
npm install
```

Import the CSV into SQLite:

```bash
npm run import
```

Run the app locally:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

Build for production:

```bash
npm run build
```

Run only the API server:

```bash
npm run server
```

Run the API smoke test while `npm run server` is running:

```bash
npm run smoke
```

## API Endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/analytics`
- `GET /api/tickets`
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`
- `GET /api/companies`
- `GET /api/companies/:id`

See [docs/READINESS_REVIEW.md](docs/READINESS_REVIEW.md) for current strengths, known tradeoffs, and what would come next for production hardening.

## Resume Bullets

- Built a full-stack SaaS-style support operations portal using React, Vite, Express, and SQLite.
- Transformed a raw helpdesk CSV dataset into a normalized relational data model for tickets, companies, tags, and timeline events.
- Implemented dashboard KPIs, SLA risk tracking, ticket search/filtering, editable internal notes, status updates, customer health scoring, ARR, renewal risk, and account owner workflows.
- Designed a polished B2B SaaS interface with Action Center alerts, account records, ticket detail workspaces, empty/loading/error states, and CSS-based analytics charts.

## Interview Explanation

This project shows how raw support data can become an operational product. The source CSV had useful ticket content, but it did not include the workflow fields a SaaS support team would need. I added practical fields during import, including ownership, status, SLA due dates, company profiles, account tiers, ARR, renewals, and timeline events.

The database is normalized so tickets, companies, tags, and events are stored cleanly. The Express API exposes focused endpoints for dashboards, analytics, tickets, ticket updates, and customer profiles. The React frontend presents the data like a real customer success and support operations tool.

In an interview, I would describe this as more than a CRUD app: it includes data cleaning, schema design, API design, analytics, workflow modeling, and UI/UX polish for a realistic B2B SaaS demo.

## AI-Assisted Development Disclosure

This project was developed with AI assistance for scaffolding, implementation, debugging, documentation, and UI iteration. I reviewed the code and kept the architecture beginner/intermediate readable so the data model, API routes, frontend components, and design decisions can be explained clearly.

## Future Improvements

- Authentication and role-based access
- Pagination and saved filters
- Real SLA policies by customer tier and priority
- More detailed internal notes history
- CSV upload from the UI
- Exportable reports
- Automated tests
