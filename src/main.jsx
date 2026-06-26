import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'];

const navItems = [
  ['dashboard', 'Dashboard', '◆'],
  ['tickets', 'Tickets', '▣'],
  ['customers', 'Customers', '●'],
  ['analytics', 'Analytics', '▰'],
  ['about', 'About Project', 'ⓘ']
];

async function api(path, options) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  function openTicket(id) {
    setSelectedTicketId(id);
    setPage('ticket-detail');
  }

  function openCompany(id) {
    setSelectedCompanyId(id);
    setPage('company-detail');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Support Operations</p>
          <h1>Client Success Operations Hub</h1>
        </div>
        <nav>
          {navItems.map(([key, label, icon]) => (
            <button
              type="button"
              className={page === key ? 'active' : ''}
              aria-current={page === key ? 'page' : undefined}
              key={key}
              onClick={() => setPage(key)}
            >
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main>
        {page === 'dashboard' && <Dashboard />}
        {page === 'tickets' && <Tickets onOpenTicket={openTicket} />}
        {page === 'ticket-detail' && (
          <TicketDetail id={selectedTicketId} onBack={() => setPage('tickets')} />
        )}
        {page === 'customers' && <Customers onOpenCompany={openCompany} />}
        {page === 'company-detail' && (
          <CompanyDetail
            id={selectedCompanyId}
            onBack={() => setPage('customers')}
            onOpenTicket={openTicket}
          />
        )}
        {page === 'analytics' && <Analytics />}
        {page === 'about' && <About />}
      </main>
    </div>
  );
}

function useApi(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api(path)
      .then((result) => active && setData(result))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [path]);

  return { data, error, loading, setData };
}

function PageState({ loading, error }) {
  if (loading) {
    return (
      <div className="state-card" role="status" aria-live="polite">
        <div className="loader" />
        <strong>Loading data</strong>
        <p>Fetching the latest support operations view.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="state-card error-state" role="alert">
        <strong>Unable to load this view</strong>
        <p>{error}</p>
      </div>
    );
  }
  return null;
}

function Dashboard() {
  const { data, loading, error } = useApi('/api/dashboard');
  if (loading || error) return <PageState loading={loading} error={error} />;

  return (
    <section>
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Ticket volume, SLA exposure, and queue distribution for the support team."
      />
      <ActionCenter alerts={data.actionCenter} />
      <div className="metric-grid phase-two">
        <Metric label="Total tickets" value={data.totalTickets} tone="neutral" />
        <Metric label="High priority" value={data.highPriorityTickets} tone="blue" />
        <Metric label="Open tickets" value={data.openTickets} tone="blue" />
        <Metric label="Resolved tickets" value={data.resolvedTickets} tone="neutral" />
        <Metric label="Overdue" value={data.overdueTickets} tone="danger" />
        <Metric label="Due soon" value={data.dueSoonTickets} tone="warning" />
        <Metric label="Within SLA" value={data.withinSlaTickets} tone="success" />
      </div>
      <div className="split">
        <Breakdown title="Tickets by priority" rows={data.ticketsByPriority} />
        <Breakdown title="Tickets by SLA status" rows={data.ticketsBySlaStatus} />
      </div>
      <div className="single-chart">
        <Breakdown title="Tickets by owner" rows={data.ticketsByOwner} />
      </div>
      <div className="single-chart">
        <Breakdown title="Tickets by queue" rows={data.ticketsByQueue} />
      </div>
    </section>
  );
}

function Tickets({ onOpenTicket }) {
  const [filters, setFilters] = useState({
    priority: '',
    queue: '',
    type: '',
    language: '',
    status: '',
    owner: ''
  });
  const [search, setSearch] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [filters, search]);

  const { data, loading, error } = useApi(`/api/tickets${query ? `?${query}` : ''}`);
  if (loading || error) return <PageState loading={loading} error={error} />;

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section>
      <PageHeader
        eyebrow="Support workspace"
        title="Tickets"
        description="Search across ticket text, customer, tags, status, priority, and queue."
      />
      <div className="toolbar-panel">
        <label>
          Global search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tickets, companies, queues, priorities, statuses, or tags"
          />
        </label>
        <div className="filters">
          <Select label="Priority" value={filters.priority} options={data.filters.priorities} onChange={(value) => updateFilter('priority', value)} />
          <Select label="Queue" value={filters.queue} options={data.filters.queues} onChange={(value) => updateFilter('queue', value)} />
          <Select label="Type" value={filters.type} options={data.filters.types} onChange={(value) => updateFilter('type', value)} />
          <Select label="Language" value={filters.language} options={data.filters.languages} onChange={(value) => updateFilter('language', value)} />
          <Select label="Status" value={filters.status} options={data.filters.statuses} onChange={(value) => updateFilter('status', value)} />
          <Select label="Owner" value={filters.owner} options={data.filters.owners} onChange={(value) => updateFilter('owner', value)} />
        </div>
      </div>
      <TicketTable tickets={data.tickets} onOpenTicket={onOpenTicket} showCompany />
    </section>
  );
}

function TicketTable({ tickets, onOpenTicket, showCompany = false }) {
  if (!tickets.length) {
    return <EmptyState title="No tickets found" message="Try clearing a filter or searching for a different customer, queue, owner, or tag." />;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            {showCompany && <th>Company</th>}
            <th>Priority</th>
            <th>Queue</th>
            <th>Owner</th>
            <th>Status</th>
            <th>SLA</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>
                <strong>{ticket.subject}</strong>
                <span>External #{ticket.external_id} · {ticket.type} · {ticket.language}</span>
              </td>
              {showCompany && <td>{ticket.company_name}</td>}
              <td><Badge value={ticket.priority} /></td>
              <td>{ticket.queue}</td>
              <td>{ticket.owner}</td>
              <td><StatusBadge value={ticket.status} /></td>
              <td><SlaBadge value={ticket.sla_status} /></td>
              <td>
                <button type="button" className="row-action" onClick={() => onOpenTicket(ticket.id)}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketDetail({ id, onBack }) {
  const { data, loading, error, setData } = useApi(`/api/tickets/${id}`);
  const [status, setStatus] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setStatus(data.status);
      setInternalNotes(data.internal_notes || '');
    }
  }, [data]);

  if (!id) return <p className="muted">Select a ticket from the Tickets page.</p>;
  if (loading || error) return <PageState loading={loading} error={error} />;

  async function saveTicket() {
    setSaving(true);
    try {
      const updated = await api(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, internal_notes: internalNotes })
      });
      setData(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <button type="button" className="text-button" onClick={onBack}>← Back to tickets</button>
      <PageHeader
        eyebrow={`Ticket #${data.external_id}`}
        title={data.subject}
        description={`${data.company_name} · ${data.queue} · ${data.type} · ${data.language}`}
      />
      <div className="ticket-workspace">
        <div className="ticket-main">
          <article className="panel narrative-card">
            <p className="panel-kicker">Inbound request</p>
            <h2>Customer request</h2>
            <p>{data.body}</p>
          </article>
          <article className="panel narrative-card">
            <p className="panel-kicker">Suggested response</p>
            <h2>Support answer</h2>
            <p>{data.answer}</p>
          </article>
        </div>
        <aside className="panel side-panel">
          <h2>Ticket workspace</h2>
          <div className="badge-stack">
            <Badge value={data.priority} />
            <SlaBadge value={data.sla_status} />
            <StatusBadge value={data.status} />
          </div>
          <Fact label="Customer" value={data.company_name} />
          <Fact label="Ticket owner" value={data.owner} />
          <Fact label="Account owner" value={data.account_owner} />
          <Fact label="Tier" value={data.tier} />
          <Fact label="SLA due" value={formatDate(data.sla_due_at)} />
          <Fact label="Status" value={<StatusBadge value={data.status} />} />
          <div className="tag-row compact">
            {data.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {ticketStatuses.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Internal notes
            <textarea
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
              placeholder="Add triage notes, customer context, or implementation follow-up."
            />
          </label>
          <button type="button" className="primary-button" onClick={saveTicket} disabled={saving}>
            {saving ? 'Saving...' : 'Save ticket'}
          </button>
        </aside>
      </div>
      <div className="detail-grid">
        <Timeline events={data.events} />
        <article className="panel">
          <h2>Internal notes</h2>
          <p>{internalNotes || 'No internal notes yet.'}</p>
        </article>
      </div>
    </section>
  );
}

function Customers({ onOpenCompany }) {
  const { data, loading, error } = useApi('/api/companies');
  if (loading || error) return <PageState loading={loading} error={error} />;

  return (
    <section>
      <PageHeader
        eyebrow="Customer success"
        title="Customers"
        description="Company profiles generated from the imported support dataset with simple health scoring."
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Tier</th>
              <th>ARR</th>
              <th>Renewal</th>
              <th>Account owner</th>
              <th>Business type</th>
              <th>Total tickets</th>
              <th>Health</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.companies.map((company) => (
              <tr key={company.id}>
                <td>
                  <div className="account-cell">
                    <span className="company-avatar">{initials(company.name)}</span>
                    <div>
                      <strong>{company.name}</strong>
                      <span>{company.business_type}</span>
                    </div>
                  </div>
                </td>
                <td><TierBadge value={company.tier} /></td>
                <td><strong>{formatCurrency(company.arr)}</strong></td>
                <td>{formatDateOnly(company.renewal_date)}</td>
                <td>{company.account_owner}</td>
                <td>{company.business_type}</td>
                <td>{company.total_tickets}</td>
                <td>
                  <div className="health-cell">
                    <HealthBadge status={company.health_status} />
                    <span>{company.health_score}/100</span>
                  </div>
                </td>
                <td>
                  <button type="button" className="row-action" onClick={() => onOpenCompany(company.id)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CompanyDetail({ id, onBack, onOpenTicket }) {
  const { data, loading, error } = useApi(`/api/companies/${id}`);

  if (!id) return <p className="muted">Select a company from the Customers page.</p>;
  if (loading || error) return <PageState loading={loading} error={error} />;

  return (
    <section>
      <button type="button" className="text-button" onClick={onBack}>← Back to customers</button>
      <PageHeader
        eyebrow="Customer profile"
        title={data.company.name}
        description={`${data.company.tier} · ${formatCurrency(data.company.arr)} ARR · ${data.company.business_type}`}
      />
      <div className="metric-grid customer-summary">
        <Metric label="Health score" value={data.company.health_score} tone={data.company.health_status === 'Critical' ? 'danger' : data.company.health_status === 'At Risk' ? 'warning' : 'success'} />
        <Metric label="ARR" value={formatCurrency(data.company.arr)} />
        <Metric label="Renewal" value={formatDateOnly(data.company.renewal_date)} />
        <Metric label="Account owner" value={data.company.account_owner} />
        <Metric label="Total tickets" value={data.company.total_tickets} />
        <Metric label="High priority" value={data.company.high_priority_tickets} />
        <Metric label="Open tickets" value={data.company.open_tickets} />
        <Metric label="Overdue tickets" value={data.company.overdue_tickets} tone="danger" />
      </div>
      <div className="section-label">
        <HealthBadge status={data.company.health_status} />
        {data.company.renewal_due_soon && <span className="badge renewal">Renewal within 30 days</span>}
      </div>
      <div className="split">
        <article className="panel">
          <h2>Recommended next action</h2>
          <p>{data.company.recommended_next_action}</p>
        </article>
        <Breakdown title="Top issue categories" rows={data.topIssueCategories} />
      </div>
      <div className="single-chart">
        <h2 className="section-heading">Recent tickets</h2>
        <TicketTable tickets={data.recentTickets} onOpenTicket={onOpenTicket} />
      </div>
    </section>
  );
}

function Analytics() {
  const { data, loading, error } = useApi('/api/analytics');
  if (loading || error) return <PageState loading={loading} error={error} />;

  return (
    <section>
      <PageHeader
        eyebrow="Operations analytics"
        title="Analytics"
        description="CSS bar charts for ticket mix, queue demand, SLA exposure, and customer health."
      />
      <div className="analytics-grid">
        <Breakdown title="Tickets by priority" rows={data.byPriority} />
        <Breakdown title="Tickets by queue" rows={data.byQueue} />
        <Breakdown title="Tickets by SLA status" rows={data.bySlaStatus} />
        <Breakdown title="Tickets by customer health" rows={data.byCustomerHealth} />
      </div>
      <div className="analytics-grid secondary">
        <Breakdown title="Type" rows={data.byType} />
        <Breakdown title="Top tags" rows={data.topTags} />
      </div>
    </section>
  );
}

function About() {
  return (
    <section>
      <PageHeader
        eyebrow="Project context"
        title="About Project"
        description="A focused support operations portfolio app built from a CSV helpdesk dataset."
      />
      <div className="about-grid">
        <Info title="Business problem">
          Customer success and support operations teams need a clear view of customer risk, SLA exposure, urgent tickets, and recurring support patterns.
        </Info>
        <Info title="Dataset source">
          The app imports `data/helpdesk_customer_tickets.csv`, a local helpdesk dataset containing ticket subjects, bodies, answers, queues, priorities, languages, business types, and tags.
        </Info>
        <Info title="Data cleaning / transformation">
          Import logic parses multiline CSV rows, normalizes tag columns into a tag table, creates realistic company profiles, assigns account tiers, ARR, renewals, ticket owners, SLA due dates, and timeline events.
        </Info>
        <Info title="Database design">
          SQLite stores tickets, companies, tags, ticket_tags, and ticket_events. Tickets link to companies, owners, tags, account details, and events for an explainable support operations model.
        </Info>
        <Info title="API design">
          Express exposes focused endpoints for dashboards, tickets, ticket updates, analytics, companies, and customer-specific ticket lists.
        </Info>
        <Info title="AI-assisted development disclosure">
          This project was developed with AI assistance for scaffolding, implementation, and iteration. The code remains intentionally readable so each design choice can be explained.
        </Info>
        <Info title="What I learned">
          The project connects data import, schema design, support operations metrics, SLA logic, ownership, customer health scoring, account risk, and frontend workflow design in one local app.
        </Info>
        <Info title="Future improvements">
          Good next steps include authentication, user assignments, real SLA policies by customer tier, notes history, CSV upload, pagination, and richer reporting.
        </Info>
      </div>
    </section>
  );
}

function ActionCenter({ alerts }) {
  return (
    <section className="action-center">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Action Center</h2>
          <p>Prioritized alerts for urgent tickets, at-risk accounts, and upcoming follow-ups.</p>
        </div>
      </div>
      <div className="alert-grid">
        {alerts.map((alert) => (
          <article className={`alert-card ${alert.severity || 'info'}`} key={alert.label}>
            <span className="severity-label">{alert.severity || 'info'}</span>
            <strong>{Number(alert.count).toLocaleString()}</strong>
            <h3>{alert.label}</h3>
            <p>{alert.explanation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PageHeader({ eyebrow, title, description }) {
  return (
    <header className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  );
}

function Metric({ label, value, tone = '' }) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{displayValue}</strong>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Breakdown({ title, rows }) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <article className="panel">
      <h2>{title}</h2>
      {rows.length ? (
        <div className="breakdown">
          {rows.map((row) => (
            <div className="bar-row" key={row.label}>
              <div>
                <span>{formatLabel(row.label)}</span>
                <strong>{Number(row.value).toLocaleString()}</strong>
              </div>
              <div className="bar">
                <span style={{ width: `${(row.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted-inline">No data available yet.</p>
      )}
    </article>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Badge({ value }) {
  return <span className={`badge ${String(value).toLowerCase()}`}>{value}</span>;
}

function SlaBadge({ value }) {
  return <span className={`badge sla ${value}`}>{formatLabel(value)}</span>;
}

function StatusBadge({ value }) {
  return <span className={`badge status ${String(value).toLowerCase()}`}>{formatLabel(value)}</span>;
}

function TierBadge({ value }) {
  return <span className={`badge tier ${String(value).toLowerCase()}`}>{value}</span>;
}

function HealthBadge({ status }) {
  return <span className={`badge health ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>;
}

function Timeline({ events }) {
  return (
    <article className="panel">
      <h2>Ticket timeline</h2>
      <ol className="timeline">
        {events.map((event) => (
          <li key={event.id}>
            <strong>{event.event_text}</strong>
            <span>{formatDate(event.created_at)}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function Info({ title, children }) {
  return (
    <article className="panel">
      <h2>{title}</h2>
      <p>{children}</p>
    </article>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function initials(name) {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatLabel(value) {
  return String(value).replaceAll('_', ' ');
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatDateOnly(value) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

createRoot(document.getElementById('root')).render(<App />);
