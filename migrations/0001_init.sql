PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  source_id TEXT NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location_mode TEXT NOT NULL CHECK(location_mode IN ('remote', 'hybrid', 'onsite', 'unknown')),
  canonical_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed', 'unknown')),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  UNIQUE(provider, source_id)
);

CREATE TABLE IF NOT EXISTS observations (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  raw_sha256 TEXT NOT NULL,
  canonical_sha256 TEXT NOT NULL,
  raw_payload_ref TEXT NOT NULL,
  raw_json_pointer TEXT NOT NULL,
  source_url TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  normalizer_version TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  etag TEXT,
  last_modified TEXT,
  UNIQUE(opportunity_id, raw_sha256, canonical_sha256, normalizer_version)
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  observation_id TEXT NOT NULL REFERENCES observations(id),
  policy_id TEXT NOT NULL,
  policy_version INTEGER NOT NULL,
  policy_sha256 TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  disposition TEXT NOT NULL CHECK(disposition IN ('reject', 'candidate', 'unknown')),
  score REAL,
  explanation_json TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  UNIQUE(observation_id, policy_sha256, engine_version)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_rank ON evaluations(disposition, score DESC);
CREATE INDEX IF NOT EXISTS idx_observations_opportunity ON observations(opportunity_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_raw ON observations(raw_sha256);
