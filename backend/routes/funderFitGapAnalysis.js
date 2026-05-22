const express = require('express');

const router = express.Router();

function analyze(input = {}) {
  const proposal = input.proposal || {
    focus_area: 'youth workforce development',
    geography: 'regional',
    requested_amount: 175000,
    evaluation_plan: 'draft',
    audited_financials: false,
    match_funding_pct: 12,
  };
  const funder = input.funder || {
    focus_area: 'workforce and economic mobility',
    geography: 'statewide',
    max_award: 150000,
    requires_audit: true,
    match_required_pct: 20,
  };
  const gaps = [
    ...(proposal.requested_amount > funder.max_award ? [`Request exceeds max award by ${proposal.requested_amount - funder.max_award}`] : []),
    ...(!proposal.audited_financials && funder.requires_audit ? ['Audited financials required before submission'] : []),
    ...(proposal.match_funding_pct < funder.match_required_pct ? [`Match funding short by ${funder.match_required_pct - proposal.match_funding_pct}%`] : []),
    ...(proposal.evaluation_plan === 'draft' ? ['Evaluation plan needs outcomes, data source, and baseline'] : []),
  ];
  return {
    proposal,
    funder,
    fit_score: Math.max(20, 100 - gaps.length * 18),
    readiness: gaps.length > 2 ? 'material_gaps' : gaps.length ? 'minor_gaps' : 'ready',
    gaps,
    rewrite_priorities: ['align geography language', 'tighten measurable outcomes', 'right-size budget request'],
  };
}

router.get('/', (req, res) => res.json(analyze()));
router.post('/analyze', (req, res) => res.json(analyze(req.body || {})));

module.exports = router;
