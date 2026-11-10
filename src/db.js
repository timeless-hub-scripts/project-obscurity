const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const dir = process.env.DATA_DIR || './data';
fs.mkdirSync(dir, { recursive: true });
const db = new Database(path.join(dir, 'obscurity.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS settings (guild_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (guild_id,key));
CREATE TABLE IF NOT EXISTS scripts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '', code TEXT DEFAULT '', owner_id TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0, panel_title TEXT DEFAULT 'OBSCURITY • Customer Panel', panel_description TEXT DEFAULT '', price TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id,name)
);
CREATE TABLE IF NOT EXISTS access (
  guild_id TEXT NOT NULL, user_id TEXT NOT NULL, script_id INTEGER NOT NULL, expires_at TEXT DEFAULT '', hwid TEXT DEFAULT '', key_value TEXT DEFAULT '', added_by TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (guild_id,user_id,script_id), FOREIGN KEY(script_id) REFERENCES scripts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS blacklist (guild_id TEXT NOT NULL, user_id TEXT NOT NULL, reason TEXT DEFAULT '', actor_id TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(guild_id,user_id));
CREATE TABLE IF NOT EXISTS keys (key TEXT PRIMARY KEY, guild_id TEXT NOT NULL, script_id INTEGER NOT NULL, duration_days INTEGER NOT NULL, uses_left INTEGER, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, revoked INTEGER NOT NULL DEFAULT 0, FOREIGN KEY(script_id) REFERENCES scripts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS redemptions (key TEXT NOT NULL, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, redeemed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(key,user_id));
CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT, action TEXT NOT NULL, actor_id TEXT, details TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);

function addColumn(table, column, definition) {
  const exists = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === column);
  if (!exists) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
// Migrate the original starter database in place.
addColumn('scripts', 'published', 'INTEGER NOT NULL DEFAULT 0');
addColumn('scripts', 'panel_title', "TEXT DEFAULT 'OBSCURITY • Customer Panel'");
addColumn('scripts', 'panel_description', "TEXT DEFAULT ''");
addColumn('scripts', 'price', "TEXT DEFAULT ''");
addColumn('access', 'added_by', "TEXT DEFAULT ''");
addColumn('blacklist', 'actor_id', "TEXT DEFAULT ''");

module.exports = db;
