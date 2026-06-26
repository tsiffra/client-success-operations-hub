# Architecture

Client Success Operations Hub is a local full-stack app for support operations workflows.

## Runtime Shape

- React + Vite serves the browser UI.
- Express exposes JSON API endpoints under `/api`.
- SQLite stores imported and transformed support data.
- The CSV importer rebuilds the local database from `data/helpdesk_customer_tickets.csv`.

## Frontend

The frontend is intentionally simple and lives mainly in `src/main.jsx`.

Primary views:

- Dashboard
- Tickets
- Ticket Detail
- Customers
- Customer Detail
- Analytics
- About Project

The UI uses CSS bar components instead of a charting library so the analytics remain easy to understand and modify.

## Backend

The backend lives in `server/index.js`.

It handles:

- Ticket filtering and search
- Dashboard metrics
- Analytics aggregations
- Company profile summaries
- Ticket updates and timeline events

Business rules that should be easy to explain in an interview live in `server/domain.js`:

- allowed ticket statuses
- SLA status calculation
- customer health scoring
- renewal risk checks
- recommended next action logic
- chart grouping helpers

## Database

The database schema is initialized in `server/db.js`.

The importer in `server/importCsv.js` creates demo-ready operational data:

- Companies are generated from business type.
- CSV tags are normalized into a many-to-many tag model.
- SLA due dates are assigned.
- Timeline events are seeded.

## Local Development Flow

1. Run `npm run import` to rebuild SQLite from the CSV.
2. Run `npm run dev` for Vite and Express together.
3. Use `http://127.0.0.1:5173/` for the app.

## Verification Flow

The repository includes a lightweight API smoke test for reviewer confidence.

1. Run `npm run import`.
2. Run `npm run server`.
3. In another terminal, run `npm run smoke`.

The smoke test checks health, dashboard, Action Center, owner filtering, global search, ticket detail, PATCH updates, analytics, companies, and customer detail.
