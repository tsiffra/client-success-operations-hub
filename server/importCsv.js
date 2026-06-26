import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isHighPriority, isResolvedStatus } from './domain.js';
import { initializeSchema, openDb } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'data', 'helpdesk_customer_tickets.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizePriority(priority) {
  return priority?.trim() || 'Unknown';
}

function initialStatus(priority, index) {
  const normalized = priority.toLowerCase();
  if (normalized === 'critical') return 'open';
  if (normalized === 'high') return index % 3 === 0 ? 'in_progress' : 'open';
  if (normalized === 'medium') return index % 4 === 0 ? 'resolved' : 'open';
  return index % 2 === 0 ? 'resolved' : 'closed';
}

function isoDate(daysAgo) {
  const date = new Date(Date.UTC(2026, 0, 1));
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString();
}

const companyNamesByBusinessType = {
  'Tech Online Store': [
    'Northstar Digital Market',
    'BluePeak Devices',
    'Vertex Online Retail',
    'CloudCart Electronics',
    'Summit Gadget Supply'
  ],
  'IT Services': [
    'BrightLayer IT',
    'CoreBridge Systems',
    'NexGen Managed Services',
    'SignalPoint Technology',
    'Ironwood Infrastructure'
  ],
  'Software Development Company': [
    'CodeHarbor Labs',
    'SprintForge Software',
    'Stackline Product Studio',
    'LaunchPad Engineering',
    'OrbitWorks Apps'
  ],
  'IT Consulting Firm': [
    'Cedar Strategy Group',
    'Praxis Technology Advisors',
    'Beacon Implementation Partners',
    'HelioTech Consulting',
    'Meridian Systems Advisory'
  ]
};

const supportOwners = [
  'Maya Chen',
  'Jordan Patel',
  'Avery Brooks',
  'Sofia Ramirez',
  'Ethan Wright',
  'Nina Okafor'
];

const accountOwners = [
  'Priya Shah',
  'Marcus Lee',
  'Elena Torres',
  'Daniel Kim',
  'Rachel Adams'
];

function companyNameFor(businessType, index) {
  const names = companyNamesByBusinessType[businessType] || ['Acme Customer Group'];
  return names[index % names.length];
}

function companyProfileFor(businessType, companyName) {
  const seed = [...companyName].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const tier = seed % 5 === 0 ? 'Enterprise' : seed % 3 === 0 ? 'Free' : 'Pro';
  const baseArr = tier === 'Enterprise' ? 120000 : tier === 'Pro' ? 24000 : 0;
  const arr = tier === 'Free' ? 0 : baseArr + (seed % 12) * (tier === 'Enterprise' ? 15000 : 2500);
  const renewalDate = renewalDateFor(seed);

  return {
    tier,
    arr,
    renewalDate,
    accountOwner: accountOwners[seed % accountOwners.length],
    businessType
  };
}

function renewalDateFor(seed) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + ((seed % 120) - 20));
  return date.toISOString();
}

function supportOwnerFor(queue, index) {
  const seed = queue.length + index;
  return supportOwners[seed % supportOwners.length];
}

function slaDueAt(status, priority, index) {
  if (isResolvedStatus(status)) {
    return addHours(isoDate(index % 180), isHighPriority(priority) ? 8 : 24);
  }

  const now = new Date();
  const pattern = index % 5;
  if (pattern === 0) return addHours(now.toISOString(), -6);
  if (pattern === 1) return addHours(now.toISOString(), 8);
  if (isHighPriority(priority) && pattern === 2) return addHours(now.toISOString(), -2);
  return addHours(now.toISOString(), isHighPriority(priority) ? 18 : 48);
}

function addHours(value, hours) {
  const date = new Date(value);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function importTickets() {
  const db = openDb();
  initializeSchema(db);
  db.exec(`
    DELETE FROM ticket_events;
    DELETE FROM ticket_tags;
    DELETE FROM tags;
    DELETE FROM tickets;
    DELETE FROM companies;
    DELETE FROM sqlite_sequence WHERE name IN ('ticket_events', 'tags', 'tickets', 'companies');
  `);

  const rows = parseCsv(readFileSync(csvPath, 'utf8'));
  const headers = rows.shift();
  const indexByHeader = Object.fromEntries(headers.map((header, index) => [header, index]));

  const insertTicket = db.prepare(`
    INSERT INTO tickets (
      external_id, company_id, subject, body, answer, type, queue, priority, language,
      business_type, status, owner, internal_notes, sla_due_at, created_at, updated_at, closed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertCompany = db.prepare(`
    INSERT OR IGNORE INTO companies (name, business_type, tier, arr, renewal_date, account_owner)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const selectCompany = db.prepare('SELECT id FROM companies WHERE name = ?');
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const selectTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const insertTicketTag = db.prepare('INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
  const insertEvent = db.prepare('INSERT INTO ticket_events (ticket_id, event_text, created_at) VALUES (?, ?, ?)');

  db.exec('BEGIN TRANSACTION;');
  try {
    rows.forEach((row, index) => {
      const get = (name) => row[indexByHeader[name]]?.trim() || '';
      const priority = normalizePriority(get('priority'));
      const status = initialStatus(priority, index);
      const createdAt = isoDate(index % 180);
      const closedAt = isResolvedStatus(status) ? isoDate((index % 180) - 2) : null;
      const businessType = get('business_type');
      const queue = get('queue');
      const companyName = companyNameFor(businessType, index);
      const companyProfile = companyProfileFor(businessType, companyName);
      insertCompany.run(
        companyName,
        businessType,
        companyProfile.tier,
        companyProfile.arr,
        companyProfile.renewalDate,
        companyProfile.accountOwner
      );
      const companyId = selectCompany.get(companyName).id;
      const dueAt = slaDueAt(status, priority, index);
      const owner = supportOwnerFor(queue, index);

      const result = insertTicket.run(
        get('id'),
        companyId,
        get('subject'),
        get('body'),
        get('answer'),
        get('type'),
        queue,
        priority,
        get('language'),
        businessType,
        status,
        owner,
        '',
        dueAt,
        createdAt,
        closedAt || createdAt,
        closedAt
      );

      const ticketId = Number(result.lastInsertRowid);
      for (let tagIndex = 1; tagIndex <= 8; tagIndex += 1) {
        const tag = get(`tag_${tagIndex}`);
        if (!tag) continue;
        insertTag.run(tag);
        const tagRow = selectTag.get(tag);
        insertTicketTag.run(ticketId, tagRow.id);
      }

      insertEvent.run(ticketId, 'Ticket created', createdAt);
      insertEvent.run(ticketId, `Routed to ${queue}`, addHours(createdAt, 1));
      insertEvent.run(ticketId, 'SLA assigned', addHours(createdAt, 2));
      insertEvent.run(ticketId, `Assigned to ${owner}`, addHours(createdAt, 3));
    });
    db.exec('COMMIT;');
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
  const count = db.prepare('SELECT COUNT(*) AS count FROM tickets').get().count;
  db.close();
  console.log(`Imported ${count} tickets into SQLite.`);
}

importTickets();
