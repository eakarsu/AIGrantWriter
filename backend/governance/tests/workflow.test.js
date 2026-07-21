'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');

test('domain workflow accepts a reviewable, grounded case', () => {
  const evaluation = evaluate({
  opportunity: { id: 'opp-1', ruleVersion: '2026-4', deadline: '2099-12-31T23:59:59Z',
    eligibilityRules: [{ attribute: 'nonprofit', required: true }] },
  organization: { attributes: ['nonprofit'] },
  evidence: [{ id: 'ev-1', sourceRef: 'board-approved-plan:4', rightsBasis: 'owned',
    approvedBy: 'role:director', asOf: '2026-06-01' }],
  claims: [{ id: 'claim-1', text: 'Program serves the stated population.', evidenceIds: ['ev-1'] }],
  budget: [{ type: 'request', amount: 900 }, { type: 'match', amount: 100 }],
  budgetTotal: 1000, personalization: [{ sourceRef: 'crm:funder-1' }]
});
  assert.deepEqual(evaluation.errors, []);
  assert.equal(evaluation.result.decision, 'reviewable');
  assert.ok(Array.isArray(evaluation.assumptions));
  assert.equal(typeof evaluation.uncertainty, 'object');
});

test('domain workflow fails closed on unsafe or incomplete input', () => {
  const evaluation = evaluate({ opportunity: {}, organization: { attributes: [] }, evidence: [], claims: [{ id: 'c', text: 'unsupported', evidenceIds: [] }], budget: [], budgetTotal: 1 });
  assert.ok(evaluation.errors.length > 0);
  assert.notEqual(evaluation.result.decision, 'reviewable');
});
