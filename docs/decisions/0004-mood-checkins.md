# Mood check-ins and date boundaries

Status: accepted for Phase 3.

Use the existing Drizzle 0.45 database client for mood/profile queries. The migration creates user-owned check-ins with a cascading foreign key, a user/time/id index, mood/note constraints and a unique (user, request ID) key. The shared contract validates every input; authentication precedes reads and writes. Creation is transactional, idempotent for identical retries and rejects changed content under an existing request ID.

The phone supplies an IANA timezone from Intl; the server validates it and stores it on the entry and profile. Today’s list uses the injected clock and PostgreSQL timezone boundaries. Progress displays saved timestamps in the phone’s current timezone. Shared tests cover midnight, timezone travel and repeated DST hours. Streak aggregation is deferred to Phase 6.

Use three functional tabs for this slice: Home, Progress and You. Explicit save supersedes the design’s earlier instant-save sketch. Persisted plaintext query cache is deliberately omitted for sensitive notes; in-memory cache keys include account ID. Feature requests share the session queue to avoid refresh-token replay and reject requests queued behind logout. Failed save input survives while mounted, with a stable retry key; app termination discards an unsaved draft.

Shared source exports use .ts imports and TypeScript’s rewriteRelativeImportExtensions so Expo/Jest resolve source and Node receives .js in compiled output. No extra mobile native dependency is required.

The user requires the installed local Android app to use only Render, never a local API or tunnel. Automated API integration tests still use the separate Neon test branch. New device flows wait for the feature branch to be merged/deployed on Render.
