// Funder relationship CRM with AI-recommended follow-up timing.
// Audit: batch_04.md / AIGrantWriter / Custom Feature Suggestions #6
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

async function callOpenRouter(prompt, maxTokens = 2500) {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'AI Grant Writer - Funder CRM'
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

// Bootstrap table
pool.query(`CREATE TABLE IF NOT EXISTS funder_interactions (
  id SERIAL PRIMARY KEY, user_id INTEGER, funder_id INTEGER, channel TEXT,
  summary TEXT, sentiment TEXT, occurred_at TIMESTAMPTZ DEFAULT NOW()
)`).catch(() => {});

// POST /api/funder-crm/log { funder_id, channel, summary, sentiment? }
router.post('/log', async (req, res) => {
  try {
    const { funder_id, channel, summary, sentiment } = req.body || {};
    if (!funder_id || !channel) return res.status(400).json({ error: 'funder_id and channel required' });
    const r = await pool.query(
      `INSERT INTO funder_interactions (user_id, funder_id, channel, summary, sentiment)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, occurred_at`,
      [req.user.id, funder_id, channel, summary || null, sentiment || null]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funder-crm/funder/:id
router.get('/funder/:id', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM funder_interactions WHERE user_id = $1 AND funder_id = $2
       ORDER BY occurred_at DESC LIMIT 50`,
      [req.user.id, req.params.id]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funder-crm/recommend-followup { funder_id }
router.post('/recommend-followup', async (req, res) => {
  try {
    const { funder_id } = req.body || {};
    if (!funder_id) return res.status(400).json({ error: 'funder_id required' });

    const interactions = await pool.query(
      `SELECT * FROM funder_interactions WHERE user_id = $1 AND funder_id = $2 ORDER BY occurred_at DESC LIMIT 20`,
      [req.user.id, funder_id]
    );

    const prompt = `You are a major-gift cultivation strategist. Given a history of funder interactions, recommend
the next follow-up's channel, timing, and message anchor. Return STRICT JSON:
{
  "summary": "...",
  "next_followup": { "days_from_today": 0, "channel": "email|call|in_person|event|letter", "message_anchor": "string", "tone": "string" },
  "warm_up_steps": ["..."],
  "warning_signs": ["..."],
  "disclaimer": "Cultivation guidance; relationship steward retains final call."
}

Interactions: ${JSON.stringify(interactions.rows)}`;

    const raw = await callOpenRouter(prompt);
    res.json({ funder_id, interaction_count: interactions.rows.length, recommendation: parseJSON(raw) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
