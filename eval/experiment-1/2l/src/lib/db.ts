import Database from 'better-sqlite3';
import path from 'path';

// Use in-memory database for tests, file-based for production
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
const dbPath = isTest ? ':memory:' : (process.env.DATABASE_PATH || path.join(process.cwd(), 'bookmarks.db'));
const db = new Database(dbPath);

// Enable WAL mode for better concurrency (only for file-based databases)
if (!isTest) {
  db.pragma('journal_mode = WAL');
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookmark_tags (
    bookmark_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (bookmark_id, tag_id),
    FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
  CREATE INDEX IF NOT EXISTS idx_bookmarks_title ON bookmarks(title);
  CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
`);

export default db;
