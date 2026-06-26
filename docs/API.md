# API

Base URL during local development:

```text
http://127.0.0.1:3001
```

Through Vite proxy:

```text
http://127.0.0.1:5173/api
```

### GET /api/health

Returns a lightweight health check for local verification.

Includes:

- API status
- app name
- imported ticket count
- generated company count

This endpoint is used by `npm run smoke`.

## Dashboard

### GET /api/dashboard

Returns operational totals and dashboard chart data.

Includes:

- total tickets
- high priority tickets
- open tickets
- resolved tickets
- overdue tickets
- due soon tickets
- within SLA tickets
- Action Center alerts
- tickets by priority
- tickets by queue
- tickets by owner
- tickets by SLA status

## Tickets

### GET /api/tickets

Returns up to 250 tickets plus filter option values.

Supported query params:

- `priority`
- `queue`
- `type`
- `language`
- `status`
- `owner`
- `company_id`
- `search`

The `search` parameter checks:

- subject
- body
- queue
- priority
- status
- owner
- company name
- tags

### GET /api/tickets/:id

Returns one ticket with:

- company name
- account tier, ARR, renewal date, and account owner
- tags
- calculated SLA status
- timeline events

### PATCH /api/tickets/:id

Updates:

- `status`
- `internal_notes`

When status changes, the API creates a timeline event:

```text
Status changed from X to Y
```

When internal notes change, the API creates a timeline event:

```text
Internal note updated
```

## Analytics

### GET /api/analytics

Returns chart-ready arrays for:

- tickets by priority
- tickets by queue
- tickets by SLA status
- tickets by customer health
- tickets by type
- tickets by language
- tickets by business type
- tickets by status
- top tags

## Companies

### GET /api/companies

Returns customer/company profiles with:

- company name
- business type
- tier
- ARR
- renewal date
- account owner
- total tickets
- high priority tickets
- open tickets
- overdue tickets
- health score
- health status

### GET /api/companies/:id

Returns one company profile, its related tickets, recent tickets, top issue categories, and a recommended next action.
