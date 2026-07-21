BEGIN;
CREATE TABLE IF NOT EXISTS governed_cases (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_type TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN('draft','submitted','approved','rejected','erasure_pending','erased')),
 version INTEGER NOT NULL DEFAULT 1, input JSONB NOT NULL, result JSONB NOT NULL,
 assumptions JSONB NOT NULL DEFAULT '[]'::jsonb, uncertainty JSONB NOT NULL DEFAULT '{}'::jsonb,
 provenance JSONB NOT NULL DEFAULT '[]'::jsonb, created_by TEXT NOT NULL, approved_by TEXT,
 approval_note TEXT, idempotency_key TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,idempotency_key),
 UNIQUE(tenant_id,id)
);
CREATE TABLE IF NOT EXISTS governed_case_events (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL,
 case_id BIGINT NOT NULL,
 actor_id TEXT NOT NULL, event_type TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(tenant_id,case_id) REFERENCES governed_cases(tenant_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS integration_outbox (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL,
 case_id BIGINT,
 provider TEXT NOT NULL, operation TEXT NOT NULL, payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN('queued','processing','delivered','failed','dead_letter')),
 attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, idempotency_key TEXT NOT NULL,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tenant_id,provider,idempotency_key),
 FOREIGN KEY(tenant_id,case_id) REFERENCES governed_cases(tenant_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS connector_checkpoints (
 tenant_id TEXT NOT NULL, provider TEXT NOT NULL, cursor_value TEXT,
 last_success_at TIMESTAMPTZ, last_failure_at TIMESTAMPTZ, last_error TEXT,
 records_seen BIGINT NOT NULL DEFAULT 0, records_accepted BIGINT NOT NULL DEFAULT 0,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(tenant_id,provider),
 CHECK(records_seen >= 0 AND records_accepted >= 0 AND records_accepted <= records_seen)
);
CREATE INDEX IF NOT EXISTS governed_cases_scope_idx ON governed_cases(tenant_id,workflow_type,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS governed_events_case_idx ON governed_case_events(tenant_id,case_id,created_at);
CREATE INDEX IF NOT EXISTS integration_outbox_ready_idx ON integration_outbox(status,next_attempt_at);
CREATE OR REPLACE FUNCTION reject_governed_event_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'governed_case_events is append-only'; END $$;
DROP TRIGGER IF EXISTS governed_events_append_only ON governed_case_events;
CREATE TRIGGER governed_events_append_only
BEFORE UPDATE OR DELETE ON governed_case_events
FOR EACH ROW EXECUTE FUNCTION reject_governed_event_mutation();
COMMIT;
