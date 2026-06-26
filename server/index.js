import express from 'express';
import {
  allowedStatuses,
  countBy,
  healthLabel,
  healthScore,
  isHighPriority,
  isOpenStatus,
  isRenewalSoon,
  isResolvedStatus,
  recommendedNextAction,
  slaStatus
} from './domain.js';
import { initializeSchema, openDb } from './db.js';

const app = express();
const port = process.env.PORT || 3001;
const db = openDb();
initializeSchema(db);

app.use(express.json());

const ticketSelect = `
  SELECT tickets.id, tickets.external_id, tickets.company_id, companies.name AS company_name,
    companies.tier, companies.arr, companies.renewal_date, companies.account_owner,
    tickets.subject, tickets.body, tickets.answer, tickets.type, tickets.queue,
    tickets.priority, tickets.language, tickets.business_type, tickets.status,
    tickets.owner, tickets.internal_notes, tickets.sla_due_at, tickets.created_at, tickets.updated_at,
    tickets.closed_at
  FROM tickets
  LEFT JOIN companies ON companies.id = tickets.company_id
`;

function rowsBy(field) {
  return db.prepare(`
    SELECT ${field} AS label, COUNT(*) AS value
    FROM tickets
    WHERE ${field} IS NOT NULL AND ${field} != ''
    GROUP BY ${field}
    ORDER BY value DESC, label ASC
  `).all();
}

function getTags(ticketId) {
  return db.prepare(`
    SELECT tags.name
    FROM tags
    JOIN ticket_tags ON ticket_tags.tag_id = tags.id
    WHERE ticket_tags.ticket_id = ?
    ORDER BY tags.name
  `).all(ticketId).map((tag) => tag.name);
}

function attachComputedFields(ticket) {
  if (!ticket) return null;
  return {
    ...ticket,
    sla_status: slaStatus(ticket),
    tags: getTags(ticket.id)
  };
}

function allTicketsForMetrics() {
  return db.prepare(`${ticketSelect}`).all().map(attachComputedFields);
}

function companiesWithHealth() {
  const companies = db.prepare(`
    SELECT companies.id, companies.name, companies.business_type, companies.tier,
      companies.arr, companies.renewal_date, companies.account_owner,
      COUNT(tickets.id) AS total_tickets,
      SUM(CASE WHEN lower(tickets.priority) IN ('high', 'critical') THEN 1 ELSE 0 END) AS high_priority_tickets,
      SUM(CASE WHEN tickets.status IN ('open', 'in_progress') THEN 1 ELSE 0 END) AS open_tickets,
      SUM(CASE WHEN tickets.status IN ('open', 'in_progress')
        AND lower(tickets.priority) IN ('high', 'critical') THEN 1 ELSE 0 END) AS open_high_priority
    FROM companies
    LEFT JOIN tickets ON tickets.company_id = companies.id
    GROUP BY companies.id
    ORDER BY companies.name
  `).all();

  const overdueByCompany = new Map();
  for (const ticket of allTicketsForMetrics()) {
    if (ticket.sla_status === 'overdue') {
      overdueByCompany.set(ticket.company_id, (overdueByCompany.get(ticket.company_id) || 0) + 1);
    }
  }

  return companies.map((company) => {
    const overdueTickets = overdueByCompany.get(company.id) || 0;
    const score = healthScore({ ...company, overdue_tickets: overdueTickets });
    return {
      ...company,
      total_tickets: Number(company.total_tickets || 0),
      high_priority_tickets: Number(company.high_priority_tickets || 0),
      open_tickets: Number(company.open_tickets || 0),
      overdue_tickets: overdueTickets,
      renewal_due_soon: isRenewalSoon(company.renewal_date),
      health_score: score,
      health_status: healthLabel(score)
    };
  });
}

app.get('/api/tickets', (req, res) => {
  const allowedFilters = ['priority', 'queue', 'type', 'language', 'status', 'owner'];
  const clauses = [];
  const params = [];

  for (const filter of allowedFilters) {
    if (req.query[filter]) {
      clauses.push(`tickets.${filter} = ?`);
      params.push(req.query[filter]);
    }
  }

  if (req.query.company_id) {
    clauses.push('tickets.company_id = ?');
    params.push(req.query.company_id);
  }

  if (req.query.search) {
    const search = `%${String(req.query.search).trim()}%`;
    clauses.push(`(
      tickets.subject LIKE ?
      OR tickets.body LIKE ?
      OR tickets.queue LIKE ?
      OR tickets.priority LIKE ?
      OR tickets.status LIKE ?
      OR tickets.owner LIKE ?
      OR companies.name LIKE ?
      OR EXISTS (
        SELECT 1
        FROM ticket_tags
        JOIN tags ON tags.id = ticket_tags.tag_id
        WHERE ticket_tags.ticket_id = tickets.id AND tags.name LIKE ?
      )
    )`);
    params.push(search, search, search, search, search, search, search, search);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const tickets = db.prepare(`
    ${ticketSelect}
    ${where}
    ORDER BY tickets.id DESC
    LIMIT 250
  `).all(...params).map(attachComputedFields);

  res.json({
    tickets,
    filters: {
      priorities: rowsBy('priority').map((row) => row.label),
      queues: rowsBy('queue').map((row) => row.label),
      types: rowsBy('type').map((row) => row.label),
      languages: rowsBy('language').map((row) => row.label),
      statuses: rowsBy('status').map((row) => row.label),
      owners: rowsBy('owner').map((row) => row.label)
    }
  });
});

app.get('/api/tickets/:id', (req, res) => {
  const ticket = db.prepare(`${ticketSelect} WHERE tickets.id = ?`).get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const events = db.prepare(`
    SELECT id, event_text, created_at
    FROM ticket_events
    WHERE ticket_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(req.params.id);

  return res.json({ ...attachComputedFields(ticket), events });
});

app.patch('/api/tickets/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });

  const status = typeof req.body.status === 'string' ? req.body.status : existing.status;
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status',
      allowedStatuses
    });
  }

  const internalNotes = typeof req.body.internal_notes === 'string'
    ? req.body.internal_notes
    : existing.internal_notes;
  const now = new Date().toISOString();
  const closedAt = isResolvedStatus(status)
    ? existing.closed_at || now
    : null;

  db.prepare(`
    UPDATE tickets
    SET status = ?, internal_notes = ?, updated_at = ?, closed_at = ?
    WHERE id = ?
  `).run(status, internalNotes, now, closedAt, req.params.id);

  const insertEvent = db.prepare('INSERT INTO ticket_events (ticket_id, event_text, created_at) VALUES (?, ?, ?)');
  if (status !== existing.status) {
    insertEvent.run(req.params.id, `Status changed from ${existing.status} to ${status}`, now);
  }
  if (internalNotes !== existing.internal_notes) {
    insertEvent.run(req.params.id, 'Internal note updated', now);
  }

  const updated = db.prepare(`${ticketSelect} WHERE tickets.id = ?`).get(req.params.id);
  const events = db.prepare(`
    SELECT id, event_text, created_at
    FROM ticket_events
    WHERE ticket_id = ?
    ORDER BY created_at ASC, id ASC
  `).all(req.params.id);

  return res.json({ ...attachComputedFields(updated), events });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Client Success Operations Hub',
    tickets: db.prepare('SELECT COUNT(*) AS count FROM tickets').get().count,
    companies: db.prepare('SELECT COUNT(*) AS count FROM companies').get().count
  });
});

app.get('/api/dashboard', (_req, res) => {
  const tickets = allTicketsForMetrics();
  const total = tickets.length;
  const highPriority = tickets.filter((ticket) => isHighPriority(ticket.priority)).length;
  const open = tickets.filter((ticket) => isOpenStatus(ticket.status)).length;
  const resolved = tickets.filter((ticket) => isResolvedStatus(ticket.status)).length;

  res.json({
    totalTickets: total,
    highPriorityTickets: highPriority,
    openTickets: open,
    resolvedTickets: resolved,
    overdueTickets: tickets.filter((ticket) => ticket.sla_status === 'overdue').length,
    dueSoonTickets: tickets.filter((ticket) => ticket.sla_status === 'due_soon').length,
    withinSlaTickets: tickets.filter((ticket) => ticket.sla_status === 'within_sla').length,
    actionCenter: [
      {
        label: 'Overdue high-priority tickets',
        count: tickets.filter((ticket) => ticket.sla_status === 'overdue' && isHighPriority(ticket.priority)).length,
        explanation: 'Urgent customer-impacting work is already outside SLA.',
        severity: 'danger'
      },
      {
        label: 'Critical customers',
        count: companiesWithHealth().filter((company) => company.health_status === 'Critical').length,
        explanation: 'Accounts with high support risk based on open priority work, SLA misses, tier, and renewal timing.',
        severity: 'danger'
      },
      {
        label: 'Due soon SLA tickets',
        count: tickets.filter((ticket) => ticket.sla_status === 'due_soon').length,
        explanation: 'Tickets that need action in the next 24 hours.',
        severity: 'warning'
      },
      {
        label: 'Unresolved high-priority tickets',
        count: tickets.filter((ticket) => isHighPriority(ticket.priority) && !isResolvedStatus(ticket.status)).length,
        explanation: 'High-priority tickets still open or in progress.',
        severity: 'info'
      }
    ],
    ticketsByPriority: rowsBy('priority'),
    ticketsByQueue: rowsBy('queue'),
    ticketsByOwner: rowsBy('owner'),
    ticketsBySlaStatus: countBy(tickets, 'sla_status')
  });
});

app.get('/api/analytics', (_req, res) => {
  const tickets = allTicketsForMetrics();
  const companies = companiesWithHealth();

  res.json({
    byPriority: rowsBy('priority'),
    byQueue: rowsBy('queue'),
    bySlaStatus: countBy(tickets, 'sla_status'),
    byCustomerHealth: countBy(companies, 'health_status'),
    byType: rowsBy('type'),
    byLanguage: rowsBy('language'),
    byBusinessType: rowsBy('business_type'),
    byStatus: rowsBy('status'),
    topTags: db.prepare(`
      SELECT tags.name AS label, COUNT(*) AS value
      FROM tags
      JOIN ticket_tags ON ticket_tags.tag_id = tags.id
      GROUP BY tags.id
      ORDER BY value DESC, label ASC
      LIMIT 20
    `).all()
  });
});

app.get('/api/companies', (_req, res) => {
  res.json({ companies: companiesWithHealth() });
});

app.get('/api/companies/:id', (req, res) => {
  const company = companiesWithHealth().find((item) => item.id === Number(req.params.id));
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const tickets = db.prepare(`
    ${ticketSelect}
    WHERE tickets.company_id = ?
    ORDER BY tickets.id DESC
  `).all(req.params.id).map(attachComputedFields);

  const topIssueCategories = db.prepare(`
    SELECT tags.name AS label, COUNT(*) AS value
    FROM tags
    JOIN ticket_tags ON ticket_tags.tag_id = tags.id
    JOIN tickets ON tickets.id = ticket_tags.ticket_id
    WHERE tickets.company_id = ?
    GROUP BY tags.id
    ORDER BY value DESC, label ASC
    LIMIT 5
  `).all(req.params.id);

  return res.json({
    company: {
      ...company,
      recommended_next_action: recommendedNextAction(company)
    },
    tickets,
    recentTickets: tickets.slice(0, 8),
    topIssueCategories
  });
});

app.listen(port, () => {
  console.log(`API server running at http://127.0.0.1:${port}`);
});
