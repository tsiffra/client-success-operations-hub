import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const dbDir = join(rootDir, 'database');
export const dbPath = join(dbDir, 'support_portal.sqlite');

mkdirSync(dbDir, { recursive: true });

export function openDb() {
  return new DatabaseSync(dbPath);
}

export function initializeSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      business_type TEXT,
      tier TEXT,
      arr INTEGER,
      renewal_date TEXT,
      account_owner TEXT
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      company_id INTEGER,
      subject TEXT,
      body TEXT,
      answer TEXT,
      type TEXT,
      queue TEXT,
      priority TEXT,
      language TEXT,
      business_type TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      owner TEXT,
      internal_notes TEXT NOT NULL DEFAULT '',
      sla_due_at TEXT,
      created_at TEXT,
      updated_at TEXT,
      closed_at TEXT,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_tags (
      ticket_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (ticket_id, tag_id),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ticket_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      event_text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );
  `);

  addColumnIfMissing(db, 'tickets', 'company_id', 'INTEGER');
  addColumnIfMissing(db, 'tickets', 'owner', 'TEXT');
  addColumnIfMissing(db, 'tickets', 'sla_due_at', 'TEXT');
  addColumnIfMissing(db, 'companies', 'tier', 'TEXT');
  addColumnIfMissing(db, 'companies', 'arr', 'INTEGER');
  addColumnIfMissing(db, 'companies', 'renewal_date', 'TEXT');
  addColumnIfMissing(db, 'companies', 'account_owner', 'TEXT');

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets(company_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets(owner);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_queue ON tickets(queue);
    CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);
    CREATE INDEX IF NOT EXISTS idx_tickets_language ON tickets(language);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_sla_due_at ON tickets(sla_due_at);
    CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON ticket_events(ticket_id);
  `);
}

function addColumnIfMissing(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
  }
}
