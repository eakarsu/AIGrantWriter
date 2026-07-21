'use strict';
const express = require('express');
const {
  requestContext,
  validIdempotencyKey,
  containsSecret,
  validateProvenance
} = require('./policy');

function createGovernedRouter({ pool, auth, evaluate, workflowType, providers, approverRoles }) {
  const router = express.Router();
  const providerSet = new Set(providers);
  const approvalSet = new Set(approverRoles);

  function context(req) { return requestContext(req.user); }
  function idempotencyKey(req) {
    const value = req.get('Idempotency-Key');
    return validIdempotencyKey(value) ? value : null;
  }
  async function audit(client, ctx, caseId, eventType, details) {
    await client.query(
      'INSERT INTO governed_case_events(tenant_id,case_id,actor_id,event_type,details) VALUES($1,$2,$3,$4,$5)',
      [ctx.tenant, caseId, ctx.actor, eventType, details || {}]
    );
  }

  router.use(auth);
  router.use((req, res, next) => {
    if (!context(req)) return res.status(403).json({ error: 'token must include actor, tenant, and role claims' });
    next();
  });
  router.get('/', async (req, res, next) => {
    try {
      const ctx = context(req);
      const result = await pool.query(
        'SELECT * FROM governed_cases WHERE tenant_id=$1 AND workflow_type=$2 ORDER BY updated_at DESC LIMIT 100',
        [ctx.tenant, workflowType]
      );
      res.json(result.rows);
    } catch (error) { next(error); }
  });
  router.post('/', async (req, res, next) => {
    const ctx = context(req);
    const key = idempotencyKey(req);
    if (!key) return res.status(400).json({ error: 'Idempotency-Key is required (max 128 characters)' });
    const evaluation = evaluate(req.body.input || {});
    if (evaluation.errors.length) return res.status(422).json(evaluation);
    const provenanceErrors = validateProvenance(req.body.provenance);
    if (provenanceErrors.length) return res.status(422).json({ errors: provenanceErrors });
    if (containsSecret(req.body.input)) return res.status(422).json({ error: 'workflow input must not contain credentials or tokens' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        "INSERT INTO governed_cases(tenant_id,workflow_type,input,result,assumptions,uncertainty,provenance,created_by,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(tenant_id,idempotency_key) DO UPDATE SET updated_at=governed_cases.updated_at RETURNING *",
        [ctx.tenant, workflowType, req.body.input, evaluation.result, evaluation.assumptions, evaluation.uncertainty, req.body.provenance, ctx.actor, key]
      );
      await audit(client, ctx, result.rows[0].id, 'evaluated', { idempotencyKey: key });
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally { client.release(); }
  });
  router.get('/:id/export', async (req, res, next) => {
    try {
      const ctx = context(req);
      const result = await pool.query(
        'SELECT id,workflow_type,status,version,input,result,assumptions,uncertainty,provenance,created_at,updated_at FROM governed_cases WHERE id=$1 AND tenant_id=$2',
        [req.params.id, ctx.tenant]
      );
      if (!result.rowCount) return res.status(404).json({ error: 'not found' });
      res.json({ schemaVersion: 1, exportedAt: new Date().toISOString(), case: result.rows[0] });
    } catch (error) { next(error); }
  });
  router.get('/:id/events', async (req, res, next) => {
    try {
      const ctx = context(req);
      const owned = await pool.query(
        'SELECT id FROM governed_cases WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3',
        [req.params.id, ctx.tenant, workflowType]
      );
      if (!owned.rowCount) return res.status(404).json({ error: 'not found' });
      const result = await pool.query(
        'SELECT actor_id,event_type,details,created_at FROM governed_case_events WHERE tenant_id=$1 AND case_id=$2 ORDER BY id',
        [ctx.tenant, req.params.id]
      );
      res.json(result.rows);
    } catch (error) { next(error); }
  });
  router.post('/:id/submit', async (req, res, next) => {
    const client = await pool.connect();
    try {
      const ctx = context(req);
      await client.query('BEGIN');
      const result = await client.query(
        "UPDATE governed_cases SET status='submitted',version=version+1,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3 AND status='draft' AND version=$4 RETURNING *",
        [req.params.id, ctx.tenant, workflowType, Number(req.body.version)]
      );
      if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'missing, stale, or not draft' }); }
      await audit(client, ctx, req.params.id, 'submitted');
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
  });
  router.post('/:id/decision', async (req, res, next) => {
    const client = await pool.connect();
    try {
      const ctx = context(req);
      if (!approvalSet.has(ctx.role)) return res.status(403).json({ error: 'authorized independent approval role required' });
      if (!['approved','rejected'].includes(req.body.decision) || !String(req.body.note || '').trim()) {
        return res.status(422).json({ error: 'decision and note are required' });
      }
      await client.query('BEGIN');
      const result = await client.query(
        "UPDATE governed_cases SET status=$1,approved_by=$2,approval_note=$3,version=version+1,updated_at=NOW() WHERE id=$4 AND tenant_id=$5 AND workflow_type=$6 AND status='submitted' AND version=$7 AND created_by<>$2 RETURNING *",
        [req.body.decision, ctx.actor, req.body.note, req.params.id, ctx.tenant, workflowType, Number(req.body.version)]
      );
      if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'stale/not submitted, or independent approval failed' }); }
      await audit(client, ctx, req.params.id, req.body.decision, { note: String(req.body.note).slice(0, 1000) });
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
  });
  router.post('/:id/integrations', async (req, res, next) => {
    try {
      const ctx = context(req);
      const key = idempotencyKey(req);
      if (!key || !providerSet.has(req.body.provider)) return res.status(422).json({ error: 'allow-listed provider and Idempotency-Key are required' });
      if (!['export','delete','notify','synchronize'].includes(req.body.operation)) return res.status(422).json({ error: 'explicit supported operation is required' });
      if (containsSecret(req.body.payload)) return res.status(422).json({ error: 'outbox payload must not contain credentials or tokens' });
      const owned = await pool.query(
        "SELECT id FROM governed_cases WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3 AND (status='approved' OR (status='erasure_pending' AND $4='delete'))",
        [req.params.id, ctx.tenant, workflowType, req.body.operation]
      );
      if (!owned.rowCount) return res.status(409).json({ error: 'approved case required' });
      const result = await pool.query(
        "INSERT INTO integration_outbox(tenant_id,case_id,provider,operation,payload,idempotency_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(tenant_id,provider,idempotency_key) DO UPDATE SET updated_at=integration_outbox.updated_at RETURNING *",
        [ctx.tenant, req.params.id, req.body.provider, req.body.operation || 'export', req.body.payload || {}, key]
      );
      res.status(202).json(result.rows[0]);
    } catch (error) { next(error); }
  });
  router.post('/integrations/:outboxId/result', async (req, res, next) => {
    try {
      const ctx = context(req);
      if (!['integration_worker','admin'].includes(ctx.role)) return res.status(403).json({ error: 'integration worker role required' });
      if (!['delivered','failed'].includes(req.body.status)) return res.status(422).json({ error: 'status must be delivered or failed' });
      if (req.body.status === 'failed' && !String(req.body.error || '').trim()) return res.status(422).json({ error: 'failed delivery requires a bounded error description' });
      const result = await pool.query(
        "UPDATE integration_outbox SET status=CASE WHEN $1='delivered' THEN 'delivered' WHEN attempts+1>=5 THEN 'dead_letter' ELSE 'failed' END,attempts=attempts+1,last_error=CASE WHEN $1='failed' THEN $2 ELSE NULL END,next_attempt_at=NOW()+(INTERVAL '1 minute'*LEAST(60,POWER(2,attempts))),updated_at=NOW() WHERE id=$3 AND tenant_id=$4 AND status IN('queued','processing','failed') RETURNING *",
        [req.body.status, String(req.body.error || '').slice(0, 1000), req.params.outboxId, ctx.tenant]
      );
      if (!result.rowCount) return res.status(409).json({ error: 'outbox item is missing or terminal' });
      res.json(result.rows[0]);
    } catch (error) { next(error); }
  });
  router.post('/:id/erasure-request', async (req, res, next) => {
    const ctx = context(req);
    const key = idempotencyKey(req);
    if (!key || !String(req.body.reason || '').trim()) return res.status(422).json({ error: 'Idempotency-Key and reason are required' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        "UPDATE governed_cases SET status='erasure_pending',version=version+1,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3 AND status IN('approved','rejected') AND (created_by=$4 OR $5='admin') RETURNING *",
        [req.params.id, ctx.tenant, workflowType, ctx.actor, ctx.role]
      );
      if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'eligible owned case required' }); }
      await audit(client, ctx, req.params.id, 'erasure_requested', { reason: String(req.body.reason).slice(0, 500), idempotencyKey: key });
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
  });
  router.post('/:id/erasure-complete', async (req, res, next) => {
    const ctx = context(req);
    if (!['integration_worker','privacy_officer','data_owner','admin'].includes(ctx.role)) {
      return res.status(403).json({ error: 'authorized erasure verifier role required' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const evidence = await client.query(
        "SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='delivered')::int AS delivered FROM integration_outbox WHERE tenant_id=$1 AND case_id=$2 AND operation='delete'",
        [ctx.tenant, req.params.id]
      );
      const counts = evidence.rows[0];
      if (!counts || counts.total === 0 || counts.total !== counts.delivered) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'all deletion outbox records must have delivered evidence' });
      }
      const result = await client.query(
        "UPDATE governed_cases SET status='erased',input='{\"erased\":true}'::jsonb,result='{\"erased\":true}'::jsonb,assumptions='[]'::jsonb,uncertainty='{}'::jsonb,provenance='[]'::jsonb,version=version+1,updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND workflow_type=$3 AND status='erasure_pending' RETURNING id,status,version,updated_at",
        [req.params.id, ctx.tenant, workflowType]
      );
      if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'erasure-pending case required' }); }
      await audit(client, ctx, req.params.id, 'erasure_completed', { deletionReceipts: counts.delivered });
      await client.query('COMMIT');
      res.json(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); next(error); } finally { client.release(); }
  });
  return router;
}
module.exports = { createGovernedRouter };
