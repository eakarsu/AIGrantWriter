'use strict';

const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const TENANT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/;
const SECRET_KEY_PATTERN = /(authorization|cookie|password|secret|token|api[-_]?key|private[-_]?key)/i;
const TRANSITIONS = Object.freeze({
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['erasure_pending'],
  rejected: ['erasure_pending'],
  erasure_pending: ['erased'],
  erased: []
});

function requestContext(user) {
  const actor = String(user && (user.id || user.sub) || '').trim();
  const tenant = String(user && (user.tenantId || user.tenant_id) || '').trim();
  const role = String(user && user.role || '').trim();
  if (!actor || !TENANT_PATTERN.test(tenant) || !role) return null;
  return { actor, tenant, role };
}

function validIdempotencyKey(value) {
  return typeof value === 'string' && KEY_PATTERN.test(value);
}

function containsSecret(value, depth = 0) {
  if (depth > 12 || value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some((item) => containsSecret(item, depth + 1));
  if (typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) =>
    SECRET_KEY_PATTERN.test(key) || containsSecret(child, depth + 1));
}

function validateProvenance(records) {
  if (!Array.isArray(records) || records.length === 0) return ['at least one provenance record is required'];
  const errors = [];
  records.forEach((record, index) => {
    if (!record || typeof record !== 'object') {
      errors.push(`provenance[${index}] must be an object`);
      return;
    }
    if (!String(record.sourceRef || '').trim()) errors.push(`provenance[${index}].sourceRef is required`);
    if (!String(record.rightsBasis || '').trim()) errors.push(`provenance[${index}].rightsBasis is required`);
    if (!record.capturedAt || Number.isNaN(Date.parse(record.capturedAt))) {
      errors.push(`provenance[${index}].capturedAt must be an ISO timestamp`);
    }
    if (record.sha256 && !/^[a-f0-9]{64}$/i.test(record.sha256)) {
      errors.push(`provenance[${index}].sha256 must be a SHA-256 digest`);
    }
  });
  if (containsSecret(records)) errors.push('provenance must not contain credentials or tokens');
  return errors;
}

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].includes(to));
}

function canApprove({ actor, role, creator, status, approverRoles }) {
  return status === 'submitted' && actor !== String(creator) && approverRoles.includes(role);
}

function deliveryResult(status, attempts) {
  if (status === 'delivered') return 'delivered';
  if (status !== 'failed') throw new Error('unsupported delivery result');
  return Number(attempts) + 1 >= 5 ? 'dead_letter' : 'failed';
}

module.exports = {
  TRANSITIONS,
  requestContext,
  validIdempotencyKey,
  containsSecret,
  validateProvenance,
  canTransition,
  canApprove,
  deliveryResult
};
