# Apply Pass 5 — AIGrantWriter

**Date:** 2026-05-08
**Stack:** Node-Express + React. Postgres via `pg.Pool`. JWT bearer auth. `aiLimiter` middleware.
**Source audit:** `/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 15.

## Verified present
- 6 audit-recommended AI counterparts already implemented across pass 2 + 4: `proposal-outline-generator`, `gap-analysis`, `compliance-checker`, `match-grants` (funding-match), `measure-impact` (impact-metrics-generator), `impact-simulator`, `audit-prep`, `funder-relationship`.
- 12+ existing AI endpoints (`generate-proposal`, `improve-text`, `generate-summary`, `match-grants`, `review-proposal`, `generate-budget`, `measure-impact`, `analyze-deadlines`, `research-funder`).
- `callOpenRouter` already throws `NO_AI_KEY` -> 503 pattern in all routes.
- FE `AdvancedAITools.js` wires the pass-2 + pass-4 endpoints.

## Implemented this pass (3 new mechanical AI endpoints)
1. `POST /api/ai/peer-proposal-analyzer` — winning-pattern extractor from one or more peer proposals.
2. `POST /api/ai/multi-funder-strategy` — diversified funding portfolio strategy with target percentages and KPIs.
3. `POST /api/ai/funder-discovery` — agentic funder discovery report (archetypes + search strategies; explicit guardrail against fabricating named funders).

All three: `authenticateToken` + `aiLimiter`, persist to `ai_results`, 503-on-no-key.

### FE
- New page `frontend/src/pages/AIPortfolioTools.js` (3 tabs).
- Routed at `/ai-portfolio` in `App.js`.
- Uses existing `api` axios instance (JWT bearer attached via interceptor).

## Deferred / categorization
- NEEDS-PRODUCT-DECISION: real agentic funder discovery (continuous scanner) — needs scheduler + foundation directory data sources.
- NEEDS-CREDS: live MLS/Foundation Center / Candid / Instrumentl integrations.
- TOO-RISKY: scraping public peer proposals at scale (legal/ToS risk; current endpoint is paste-driven only).

## Smoke test
- `node --check backend/server.js` PASS.
- Backend boot not retested (no DB credential available in this environment); endpoint registration follows existing pattern verbatim.
- FE syntax: hand-validated; matches existing `react-markdown` and `api.post` patterns used in sibling pages.

## Cap respected
3 of 5 allowed mechanical items. Remaining custom-feature suggestions (agentic auto-discovery scanner, peer-proposal scraping pipeline) are NEEDS-PRODUCT-DECISION.
