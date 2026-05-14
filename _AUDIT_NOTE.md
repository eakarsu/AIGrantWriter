# Audit Apply Notes — AIGrantWriter

## Source
`/Users/erolakarsu/projects/_AUDIT/reports/batch_04.md` section 15.

Note: audit reported "0 routes / 0 AI endpoints" but a substantial Express server already exists at `backend/server.js` with auth, dashboard, organizations, grants, proposals, templates, documents, deadlines, budgets, impact metrics and 12 AI endpoints. Audit appears to have run before backend wiring.

## Original Recommendations (AI Counterparts)
- `/proposal-outline-generator` — auto-generate proposal structure from funder requirements
- `/gap-analysis` — identify org's qualification gaps vs. funder requirements
- `/funding-match` — already present as `/api/ai/match-grants`
- `/impact-metrics-generator` — already present as `/api/ai/measure-impact`
- `/compliance-checker` — flag compliance gaps in proposal vs. funder requirements

## Implemented (this pass)
- `POST /api/ai/proposal-outline-generator` — generates structured proposal outline from funder requirements (+ optional org & project summary). Saves to ai_results.
- `POST /api/ai/gap-analysis` — gap analysis between organization profile and funder requirements; returns scored report.
- `POST /api/ai/compliance-checker` — audits proposal content against funder requirements; produces compliance scorecard.

All three use existing `callOpenRouter` and `saveAiResult` helpers, follow the same auth + `aiLimiter` middleware as the existing AI routes, and match style.

Syntax: `node --check` passes.

## Backlog (Custom Feature Suggestions)
1. Agentic funder discovery — continuous scanner of foundation directories / RFPs.
2. Proposal impact simulator — projected social impact modeling.
3. Peer proposal analyzer — analyze winning proposals for patterns.
4. Multi-funder strategy planner — recommend grant portfolio strategy.
5. Compliance + audit prep — quarterly/annual reporting automation.
6. Funder relationship management — track lifecycles, recommend follow-ups.

## Categorization
- MECHANICAL: 3 endpoints above (done).
- NEEDS-PRODUCT-DECISION: agentic discovery, peer-proposal scraping (data sourcing decisions).
- NEEDS-PRODUCT-DECISION + DATA-MODEL: portfolio planner (requires multi-grant model).

## Apply pass 3 (frontend)

LEFT-AS-IS — frontend already fully wired. `frontend/src/pages/AdvancedAITools.js` calls all three pass-2 endpoints (`POST /ai/proposal-outline-generator`, `POST /ai/gap-analysis`, `POST /ai/compliance-checker`) via the shared `api` client (JWT bearer in localStorage). Route mounted in `App.js` at `/advanced-ai` behind `ProtectedRoute`. Idempotence rule applied — no changes.

## Apply pass 4 (mechanical backlog)

Picked the three previously deferred backlog items that are MECHANICAL once we accept "free-text inputs + LLM" instead of building new domain models:

- `POST /api/ai/impact-simulator` — simulates social impact projections (beneficiaries, KPI ranges, sensitivity) from a project description. Uses existing `callOpenRouter`/`saveAiResult`/`authenticateToken`/`aiLimiter`.
- `POST /api/ai/audit-prep` — generates quarterly/annual reporting + audit-prep checklist for a reporting period (optionally tied to a grant/org).
- `POST /api/ai/funder-relationship` — builds a stewardship/cultivation plan for a named funder, including 30/60/90 day actions and red flags.

`callOpenRouter` updated to throw `NO_AI_KEY` when `OPENROUTER_API_KEY` is unset; all three new endpoints + the three pass-2 endpoints now respond `503` with a clear message in that case (instead of `500`).

Frontend `frontend/src/pages/AdvancedAITools.js` extended with three new tabs (Impact Simulator, Audit Prep, Funder Relations) wiring each new endpoint via the shared `api` client (JWT bearer). `getErrorMessage` now special-cases `503` for the "AI service not configured" message.

`node --check server.js` passes; `@babel/parser` (with JSX plugin) parses `AdvancedAITools.js` cleanly. No new deps; no `npm install`.

Backlog still deferred: agentic funder discovery (NEEDS-PRODUCT-DECISION on data sources), peer-proposal analyzer (NEEDS-PRODUCT-DECISION on data ingestion + IP), multi-funder portfolio planner (NEEDS-DATA-MODEL).
