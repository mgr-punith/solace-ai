# 0005: One Neon branch with disposable PostgreSQL tests

Date: 2026-11-06
Status: accepted (explicit user instruction)

## Context

The user wants a single Neon branch for this assignment. Requiring another hosted branch and a test password caused unnecessary setup work. Existing authentication and mood tests exercise SQL transactions, concurrent retries, authorization and delete cascades; those checks remain necessary.

## Decision

Render and the installed app keep using the existing Neon branch. Vitest global setup automatically starts the official PostgreSQL 17 Alpine image using an available Podman or Docker runtime. PostgreSQL data is temporary, its host port binds only to `127.0.0.1`, and each run gets a random database name and password. Teardown removes the container and its volumes after success or test failure; startup failures also trigger cleanup. A force-killed test runner can leave a container behind; remove only the specific `solace-test-<uuid>` container if that happens.

The test helper accepts only validated settings supplied through Vitest's `provide`/`inject` API. It never loads `.env` or falls back to `DATABASE_URL`, `DATABASE_URL_DIRECT` or legacy `DATABASE_URL_TEST`. Runtime PostgreSQL connections continue to require TLS; only the loopback test helper disables TLS. The existing migrations and SQL repository assertions run unchanged.

Remove `DATABASE_URL_TEST` from required examples, Render configuration and CI. GitHub Actions uses the same disposable database and no database secret. Old hosted branches, secrets and environment values are not deleted automatically; they are simply unused.

## Consequences

`npm run verify` and `npm test` require Podman or Docker, plus internet access for the first image download. No test database needs ongoing management, and concurrent CI runs cannot share app data. The tests cover PostgreSQL behavior, not Neon's hosting, TLS or cold starts; `db:check` and the real-device Render QA remain the deployment checks. No local API or tunnel is used by the installed app.
