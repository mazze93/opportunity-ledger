CREATE TABLE roles (id TEXT PRIMARY KEY, title TEXT NOT NULL, company TEXT NOT NULL, url TEXT NOT NULL UNIQUE, location TEXT NOT NULL, mode TEXT NOT NULL, tracks TEXT NOT NULL, published_at TEXT, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, source_board TEXT NOT NULL, evidence TEXT NOT NULL, missing_since TEXT, closure TEXT NOT NULL DEFAULT 'listed');
--> statement-breakpoint
CREATE TABLE reviews (role_id TEXT PRIMARY KEY REFERENCES roles(id), status TEXT NOT NULL DEFAULT 'needs review', stage TEXT NOT NULL DEFAULT 'not started', applied_at TEXT, followup_at TEXT, notes TEXT NOT NULL DEFAULT '', draft TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE events (id TEXT PRIMARY KEY, role_id TEXT NOT NULL, actor TEXT NOT NULL, at TEXT NOT NULL, payload TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE feed_runs (id TEXT PRIMARY KEY, board TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT NOT NULL, status TEXT NOT NULL, count INTEGER NOT NULL, error TEXT, raw_sha256 TEXT);
--> statement-breakpoint
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX roles_board ON roles(source_board);
--> statement-breakpoint
CREATE INDEX feed_runs_board ON feed_runs(board, finished_at);
