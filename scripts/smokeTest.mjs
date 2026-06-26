const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3001';

async function getJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function patchJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const health = await getJson('/api/health');
  assert(health.status === 'ok', 'Health endpoint did not return ok');
  assert(health.tickets > 0, 'Expected imported tickets');
  assert(health.companies > 0, 'Expected generated companies');

  const dashboard = await getJson('/api/dashboard');
  assert(dashboard.actionCenter?.length === 4, 'Expected four Action Center alerts');
  assert(dashboard.ticketsByOwner?.length > 0, 'Expected ticket owner breakdown');

  const owner = dashboard.ticketsByOwner[0].label;
  const tickets = await getJson(`/api/tickets?owner=${encodeURIComponent(owner)}`);
  assert(tickets.tickets.length > 0, 'Expected tickets for owner filter');
  assert(tickets.tickets.every((ticket) => ticket.owner === owner), 'Owner filter returned another owner');

  const search = await getJson(`/api/tickets?search=${encodeURIComponent(owner)}`);
  assert(search.tickets.length > 0, 'Expected global search to match owner');

  const ticket = await getJson(`/api/tickets/${tickets.tickets[0].id}`);
  assert(ticket.events.length >= 4, 'Expected imported ticket timeline events');
  assert(ticket.company_name, 'Expected ticket company name');

  const updated = await patchJson(`/api/tickets/${ticket.id}`, {
    status: 'in_progress',
    internal_notes: 'Smoke test note'
  });
  assert(updated.status === 'in_progress', 'Expected PATCH status update');
  assert(updated.events.some((event) => event.event_text === 'Internal note updated'), 'Expected note timeline event');

  const analytics = await getJson('/api/analytics');
  assert(analytics.byPriority.length > 0, 'Expected priority analytics');
  assert(analytics.byCustomerHealth.length > 0, 'Expected customer health analytics');

  const companies = await getJson('/api/companies');
  assert(companies.companies.length > 0, 'Expected companies');

  const company = await getJson(`/api/companies/${companies.companies[0].id}`);
  assert(company.company.recommended_next_action, 'Expected recommended next action');
  assert(company.recentTickets.length > 0, 'Expected recent tickets');
  assert(company.topIssueCategories.length > 0, 'Expected top issue categories');

  console.log('Smoke test passed');
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
