# Decisions

## Keep Authentication Out

Authentication was intentionally not added. The current goal is a portfolio-ready operations MVP, not a production security model.

Adding login later would make sense after the core support workflows are stable.

## Use SQLite

SQLite keeps the app easy to run locally:

- no external database server
- simple import flow
- real relational schema
- enough power for dashboard and analytics queries

## Generate Companies During Import

The CSV contains `business_type` but not company accounts. Instead of hard-coding fake UI-only customers, the importer creates company records and links tickets to them.

This makes customer profiles real database records while staying honest about the source data.

## Generate Account Depth During Import

The source CSV does not include SaaS account information such as tier, ARR, renewal date, or account owner.

Those fields are generated deterministically during import so the app can demonstrate realistic Customer Success workflows:

- Enterprise accounts carry more health risk.
- Renewal timing can influence health score.
- ARR and tier help explain why some customers need faster attention.
- Account owner creates a clear customer success counterpart to ticket owner.

## Generate Ticket Owners During Import

Ticket ownership is generated during import instead of requiring login or manual assignment.

This keeps Phase 3 simple while making the support queue feel operational: tickets have accountable owners, the dashboard can show owner workload, and the ticket list can filter by assignee.

## Calculate SLA Status in the API

The database stores `sla_due_at`, but the API calculates `sla_status`.

Reason:

- SLA status changes over time.
- A ticket that is within SLA today may be overdue tomorrow.
- Calculating it avoids stale stored status values.

## Keep Health Score Explainable

Health score is intentionally rule-based:

- open high-priority tickets
- overdue tickets
- customer tier
- upcoming renewal

This is more useful for interviews than an opaque model because every score can be explained from visible account and ticket data.

## Use CSS Bar Charts

The project uses existing CSS bar components instead of chart libraries.

Reason:

- fewer dependencies
- easier to explain
- enough visual value for portfolio use
- keeps the frontend beginner/intermediate readable

## Keep Files Simple

The app keeps most frontend code in `src/main.jsx` and API code in `server/index.js`.

For a larger production app, these would be split into modules. For this portfolio MVP, fewer files make the flow easier to inspect and explain.
