// Multi-funder strategy planner diversifying across large grants, federal,
// foundation, and corporate.
// Audit: batch_04.md / AIGrantWriter / Custom Feature Suggestions #4
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'grant_writer'
});

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const h = req.headers.authorization;
  const token = h && h.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'grant-writer-secret');
    next();
  } catch { return res.status(403).json({ error: 'Invalid token' }); }
};
router.use(authenticateToken);

async function callOpenRouter(prompt, maxTokens = 3000) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'AI Grant Writer - Multi-Funder Strategy'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4, max_tokens: maxTokens
    })
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message || 'AI failed');
  return d.choices[0].message.content;
}

function parseJSON(t) { try { const m = t.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {} return { notes: t }; }

// POST /api/multi-funder-strategy/plan { org_id?, total_target_usd, horizon_months? }
router.post('/plan', async (req, res) => {
  try {
    const { org_id, total_target_usd, horizon_months = 12 } = req.body || {};
    if (!total_target_usd) return res.status(400).json({ error: 'total_target_usd required' });

    let org = null;
    let activeGrants = { rows: [] };
    let funders = { rows: [] };
    try {
      const r = await pool.query(`SELECT * FROM organizations WHERE id = $1 AND user_id = $2`, [org_id || 0, req.user.id]);
      org = r.rows[0] || null;
    } catch (_) {}
    try {
      activeGrants = await pool.query(
        `SELECT id, name, amount, status, deadline FROM grants WHERE user_id = $1 ORDER BY deadline ASC LIMIT 30`,
        [req.user.id]
      );
    } catch (_) {}
    try {
      funders = await pool.query(
        `SELECT id, name, type, typical_award_usd FROM funders WHERE user_id = $1 LIMIT 50`,
        [req.user.id]
      );
    } catch (_) {}

    const prompt = `You are a nonprofit funding diversification strategist. Build a multi-funder strategy across
federal, foundation, corporate, individual major-gift, and program-specific channels. Return STRICT JSON:
{
  "summary": "...",
  "portfolio_allocation": [
    { "channel": "federal|foundation|corporate|individual_major|program_specific", "target_amount_usd": 0, "target_pct": 0, "rationale": "string" }
  ],
  "priority_funders": [{ "funder_name_or_id": "string", "channel": "string", "fit_score_0_100": 0, "estimated_award_usd": 0, "rationale": "string" }],
  "diversification_score_0_100": 0,
  "concentration_risks": ["..."],
  "quarter_by_quarter_plan": [{ "quarter": 1, "actions": ["..."], "expected_inflow_usd": 0 }],
  "disclaimer": "Strategic plan; refine with development director."
}

Organization: ${JSON.stringify(org)}
Total target USD: ${total_target_usd}
Horizon months: ${horizon_months}
Active grants (sample): ${JSON.stringify(activeGrants.rows.slice(0, 15))}
Known funders (sample): ${JSON.stringify(funders.rows.slice(0, 15))}`;

    const raw = await callOpenRouter(prompt);
    res.json({ org_id: org_id || null, total_target_usd, horizon_months, plan: parseJSON(raw) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, amount, status, deadline FROM grants WHERE user_id = $1 ORDER BY deadline ASC LIMIT 50`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
