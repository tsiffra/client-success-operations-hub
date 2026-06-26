# Data Model

The original CSV is a flat helpdesk ticket dataset. The app transforms it into a small relational support operations model.

## Source Data

The CSV includes:

- `id`
- `subject`
- `body`
- `answer`
- `type`
- `queue`
- `priority`
- `language`
- `business_type`
- `tag_1` through `tag_9`

The app imports `tag_1` through `tag_8` based on the MVP requirements.

## Transformed Model

### Ticket

A ticket represents one support request or incident. It keeps the original ticket content and adds operational fields:

- status
- support owner / assignee
- internal notes
- SLA due date
- lifecycle timestamps
- company relationship

### Company

The CSV does not include real customer accounts, so the importer generates realistic company names based on `business_type`.

Generated company records also include account fields that customer success teams normally use:

- tier: Free, Pro, or Enterprise
- ARR
- renewal date
- account owner

This lets the project demonstrate customer success workflows without pretending the CSV contained account data.

### Tags

CSV tag columns are normalized into:

- `tags`
- `ticket_tags`

This avoids repeated tag strings on every ticket and supports tag-based search.

### Timeline Events

Each imported ticket gets baseline events:

- Ticket created
- Routed to queue
- SLA assigned
- Assigned to support owner

PATCH updates add more events for status and note changes.

## Derived Fields

### SLA Status

SLA status is calculated by the API from `status` and `sla_due_at`.

Values:

- `resolved`
- `overdue`
- `due_soon`
- `within_sla`

### Health Score

Customer health starts at 100.

- subtract 10 for each open high priority ticket
- subtract 5 for each overdue ticket
- subtract 10 for Enterprise accounts
- subtract 5 for Pro accounts
- subtract 10 when renewal is within 30 days
- minimum score is 0

Labels:

- Healthy: 80-100
- At Risk: 50-79
- Critical: 0-49
