// === Batch 04 Gaps & Frontend Mounts ===
// Gap feature: No proposal-style consistency enforcer across multi-author d

const express = require('express');
const router = express.Router();

let tableEnsured = false;
async function ensureTable(pool) {
  if (tableEnsured || !pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gap_features (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(120),
        input JSONB,
        output JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    tableEnsured = true;
  } catch (e) {}
}

router.post('/', async (req, res) => {
  const pool = req.app.get('pool') || req.app.locals.pool || null;
  await ensureTable(pool);
  try {
    const userInput = (req.body && req.body.input) || '';
    const ctx = (req.body && req.body.context) || {};

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const fallback = {
        feature: 'gap-no-proposal-style-consistency-enforcer-a',
        title: 'No proposal-style consistency enforcer across multi-author d',
        result: 'Configure OPENROUTER_API_KEY for live AI output. Stub returning echo.',
        input: userInput,
      };
      if (pool) { try { await pool.query('INSERT INTO gap_features (slug, input, output) VALUES ($1, $2, $3)', ['gap-no-proposal-style-consistency-enforcer-a', { input: userInput, ctx }, fallback]); } catch (e) {} }
      return res.json(fallback);
    }

    const prompt = `You are an expert assistant for the feature "${'No proposal-style consistency enforcer across multi-author d'}". Provide a structured, actionable response.\nUser input: ${userInput}\nContext: ${JSON.stringify(ctx)}`;
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const aiData = await aiRes.json();
    const content = (aiData && aiData.choices && aiData.choices[0] && aiData.choices[0].message && aiData.choices[0].message.content) || 'No response';
    const out = { feature: 'gap-no-proposal-style-consistency-enforcer-a', title: 'No proposal-style consistency enforcer across multi-author d', result: content };
    if (pool) { try { await pool.query('INSERT INTO gap_features (slug, input, output) VALUES ($1, $2, $3)', ['gap-no-proposal-style-consistency-enforcer-a', { input: userInput, ctx }, out]); } catch (e) {} }
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
