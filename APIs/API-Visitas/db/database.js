const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'visits.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      api_key TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      page TEXT DEFAULT '',
      ip TEXT,
      country TEXT DEFAULT '',
      region TEXT DEFAULT '',
      city TEXT DEFAULT '',
      lat REAL,
      lon REAL,
      isp TEXT DEFAULT '',
      browser TEXT DEFAULT '',
      os TEXT DEFAULT '',
      device TEXT DEFAULT '',
      referrer TEXT DEFAULT '',
      visitor_hash TEXT,
      is_bot INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE INDEX IF NOT EXISTS idx_visits_project ON visits(project_id);
    CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
    CREATE INDEX IF NOT EXISTS idx_visits_hash ON visits(visitor_hash);
    CREATE INDEX IF NOT EXISTS idx_visits_bot ON visits(is_bot);

    -- Ensure default projects exist
    INSERT OR IGNORE INTO projects (name) VALUES ('default');
  `);
}

function getProjectId(name) {
  const db = getDb();
  const row = db.prepare('SELECT id FROM projects WHERE name = ?').get(name);
  if (row) return row.id;
  const info = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
  return info.lastInsertRowid;
}

function insertVisit({ projectId, page, ip, country, region, city, lat, lon, isp, browser, os, device, referrer, visitorHash, isBot }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO visits (project_id, page, ip, country, region, city, lat, lon, isp, browser, os, device, referrer, visitor_hash, is_bot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(projectId, page, ip, country, region, city, lat, lon, isp, browser, os, device, referrer, visitorHash, isBot ? 1 : 0);
}

module.exports = { getDb, getProjectId, insertVisit };
