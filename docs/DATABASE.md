# Database

The app uses SQLite through Node's built-in `node:sqlite` module. The database file is created at:

```text
database/support_portal.sqlite
```

## Tables

### companies

Stores generated customer/company profiles.

Columns:

- `id`
- `name`
- `business_type`
- `tier`
- `arr`
- `renewal_date`
- `account_owner`

### tickets

Stores support tickets imported from the CSV plus operational fields added by the app.

Columns:

- `id`
- `external_id`
- `company_id`
- `subject`
- `body`
- `answer`
- `type`
- `queue`
- `priority`
- `language`
- `business_type`
- `status`
- `owner`
- `internal_notes`
- `sla_due_at`
- `created_at`
- `updated_at`
- `closed_at`

### tags

Stores unique tag names normalized from CSV columns `tag_1` through `tag_8`.

Columns:

- `id`
- `name`

### ticket_tags

Join table connecting tickets to tags.

Columns:

- `ticket_id`
- `tag_id`

### ticket_events

Stores the ticket timeline.

Columns:

- `id`
- `ticket_id`
- `event_text`
- `created_at`

## Import Behavior

`npm run import` clears the current imported data and rebuilds it from the CSV. It also resets SQLite autoincrement counters so local demo IDs stay predictable.

The import creates:

- Ticket records
- Company records
- Tags and ticket-tag links
- SLA due dates
- Support ticket owners
- Account tier, ARR, renewal date, and account owner fields
- Initial timeline events

## Indexes

Indexes exist for common filters:

- `company_id`
- `owner`
- `priority`
- `queue`
- `type`
- `language`
- `status`
- `sla_due_at`
- `ticket_events.ticket_id`
