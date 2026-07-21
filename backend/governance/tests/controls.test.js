'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  requestContext,
  validIdempotencyKey,
  containsSecret,
  validateProvenance,
  canTransition,
  canApprove,
  deliveryResult
} = require('../policy');

const runtimeRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(runtimeRoot, '..');

test('authorization contract requires explicit tenant and independent approver', () => {
  assert.equal(requestContext({ id: 'u1', role: 'admin' }), null);
  assert.deepEqual(requestContext({ id: 'u1', tenantId: 'tenant-a', role: 'reviewer' }),
    { actor: 'u1', tenant: 'tenant-a', role: 'reviewer' });
  assert.equal(canApprove({ actor: 'u1', creator: 'u1', role: 'reviewer',
    status: 'submitted', approverRoles: ['reviewer'] }), false);
  assert.equal(canApprove({ actor: 'u2', creator: 'u1', role: 'reviewer',
    status: 'submitted', approverRoles: ['reviewer'] }), true);
});

test('contract validation rejects ambiguous keys, secrets, and weak provenance', () => {
  assert.equal(validIdempotencyKey('case:2026:0001'), true);
  assert.equal(validIdempotencyKey('short'), false);
  assert.equal(containsSecret({ nested: { apiKey: 'must-not-enter-payload' } }), true);
  assert.deepEqual(validateProvenance([{
    sourceRef: 'record:1', rightsBasis: 'owned', capturedAt: '2026-07-18T00:00:00Z',
    sha256: 'd'.repeat(64)
  }]), []);
  assert.ok(validateProvenance([{ sourceRef: 'record:1', token: 'x' }]).length > 0);
});

test('integration failure policy is bounded and dead-letters deterministically', () => {
  assert.equal(deliveryResult('delivered', 0), 'delivered');
  assert.equal(deliveryResult('failed', 0), 'failed');
  assert.equal(deliveryResult('failed', 4), 'dead_letter');
  assert.throws(() => deliveryResult('unknown', 0));
});

test('end-to-end lifecycle permits only draft, review, approval, and erasure sequence', () => {
  const sequence = ['draft', 'submitted', 'approved', 'erasure_pending', 'erased'];
  for (let i = 0; i < sequence.length - 1; i += 1) {
    assert.equal(canTransition(sequence[i], sequence[i + 1]), true);
  }
  assert.equal(canTransition('draft', 'approved'), false);
  assert.equal(canTransition('erased', 'draft'), false);
});

test('migration contract preserves tenant boundaries, append-only audit, and connector state', () => {
  const sql = fs.readFileSync(path.join(runtimeRoot, 'migrations', '001_governed_workflows.sql'), 'utf8');
  assert.match(sql, /FOREIGN KEY\(tenant_id,case_id\)/);
  assert.match(sql, /connector_checkpoints/);
  assert.match(sql, /governed_events_append_only/);
  assert.match(sql, /UNIQUE\(tenant_id,idempotency_key\)/);
});

test('route and lifecycle contract stay mounted and non-destructive', () => {
  const hostPath = ['server.js', 'index.js'].map((name) => path.join(runtimeRoot, name))
    .find((candidate) => fs.existsSync(candidate));
  const host = fs.readFileSync(hostPath, 'utf8');
  const router = fs.readFileSync(path.join(runtimeRoot, 'governance', 'router.js'), 'utf8');
  const launcher = fs.readFileSync(path.join(projectRoot, 'start.sh'), 'utf8');
  assert.match(host, /require\('\.\/governance'\)/);
  assert.match(router, /tenant_id=\$2/);
  assert.match(router, /created_by<>\$2/);
  assert.doesNotMatch(launcher, /kill\s+-9|npm install|seed\.js|createdb/);
  assert.match(launcher, /ALLOW_SCHEMA_MIGRATION/);
});
