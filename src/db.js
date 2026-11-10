const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dir = process.env.DATA_DIR || './data';
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, 'obscurity.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  guild_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
  PRIMARY KEY (guild_id, key)
);
CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL, owner_id TEXT NOT NULL,
  name TEXT NOT NULL, title TEXT, description TEXT DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'free', enabled INTEGER NOT NULL DEFAULT 1,
  source TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS access (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, script_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'whitelisted', hwid TEXT DEFAULT '',
  key_value TEXT DEFAULT '', expires_at TEXT DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, user_id, script_id),
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS blacklist (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id, user_id)
);
`);
module.exports = db;
