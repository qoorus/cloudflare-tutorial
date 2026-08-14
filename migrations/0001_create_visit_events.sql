-- Non-sensitive metadata only. No transcripts, SOAP notes, or embeddings belong in this table.
CREATE TABLE visit_events (
  id TEXT PRIMARY KEY,
  patient_ref_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_visit_events_staff ON visit_events(staff_id);
CREATE INDEX idx_visit_events_scheduled_at ON visit_events(scheduled_at);
