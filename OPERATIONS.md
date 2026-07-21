# Governed grant lifecycle

This repository now contains a durable, tenant-scoped control plane for one narrow workflow. It does not assert production readiness or replace the older prototype routes.

## Domain workflow

Versioned opportunity eligibility/deadline rules, organizational attributes, approved evidence and rights, cited narrative claims, reconciled request/match budgets and grounded personalization.

The evaluator checks deadlines, eligibility, citation coverage and budget totals without generating claims. CRM/portal/document/accounting/calendar/email/research adapters, funder rule monitoring, submission receipts, e-signature, licensed research and authorized/professional validation remain blocked externally.

## API and state

The governed endpoint is mounted below `/api/governed-*` in the application entry point. Every request requires a signed token with explicit `id` (or `sub`), `tenantId`, and `role` claims. Missing tenant claims fail closed; tenant identity is never inferred from a user ID.

Creation requires an `Idempotency-Key` and at least one provenance object with `sourceRef`, `rightsBasis`, and `capturedAt`. The state path is `draft -> submitted -> approved|rejected`; optimistic versions reject stale changes and the creator cannot approve their own case. Approved work may enqueue only allow-listed provider operations. Payloads containing credential-like fields are rejected. Workers may record delivered/failed results; failures back off and dead-letter after five recorded attempts.

Audit events are tenant-bound and append-only in the migration. Integration work is an outbox record only: no provider call occurs in the web request and no adapter is represented as available. Connector cursors and accepted/seen counts have durable checkpoint storage for future workers.

Erasure is two-phase. An owner/admin requests erasure, deletion work is queued per applicable provider, and an authorized verifier can redact the case only after every deletion outbox record has a delivered receipt. No physical provider deletion is claimed.

## Safe local lifecycle

1. Copy `.env.example` to the ignored `.env`; set a unique JWT secret of at least 32 characters and database configuration.
2. Run `./start.sh check`. It validates configuration shape only; it does not verify credentials or connectivity.
3. Install locked dependencies as a separate, reviewed action.
4. Export `DATABASE_URL` and run `ALLOW_SCHEMA_MIGRATION=true ./start.sh migrate` only during an approved maintenance window.
5. Run `./start.sh start` to start already-installed components. The launcher does not install, seed, create a database, or kill unrelated port owners, and stops only its own child processes.

Automatic schema initialization is disabled unless `AUTO_INIT_SCHEMA=true`. Destructive demo seeds are quarantined behind `ALLOW_DEMO_SEED=true` and refuse production mode.

## Verification and deployment boundary

`node --test */governance/tests/*.test.js` (using the applicable `backend` or `server` directory) runs dependency-free domain, contract, authorization, integration-failure, migration, and lifecycle tests. CI also syntax-checks the workflow modules, host entry point, and launcher.

Before any deployment, supply and validate external adapters, secret management, encryption and retention controls, database backup/restore, worker leasing/signatures, monitoring, accessibility, load/concurrency behavior, and domain-owner review. No credentials, licensed datasets, provider accounts, hardware, managed infrastructure, or legal/medical/financial/professional validation are included.
