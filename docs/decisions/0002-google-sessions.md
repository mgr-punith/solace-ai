# 0002 — Google identity and revocable Solace sessions

> Testing update: the separate Neon test branch policy below was superseded by [ADR 0005](0005-single-neon-branch.md) on 6 November 2026. Automated tests now use disposable local PostgreSQL.

Google's verified `sub` identifies the account. Its ID token is verified on the API with the Web client's audience, signature and expiry checks, and an explicit `email_verified` requirement. Google profile data is never used before verification.

The API signs HS256 access tokens with a 15-minute lifetime and generates 256-bit opaque refresh tokens. Refresh tokens use a separate server key for HMAC-SHA256 storage; only their digests reach PostgreSQL. A session row lets the API immediately reject access after logout or refresh-token replay. Rotation locks the session row, inserts the replacement token, and revokes the previous one atomically. Reusing a spent token revokes its whole session. Account deletion cascades sessions and refresh tokens.

Mobile stores the full token pair in one SecureStore item. Session operations serialize to avoid concurrent refresh replay. Startup verifies the current user; an expired token refreshes once. Network failures preserve stored credentials and show a retry state. Server-confirmed logout and deletion clear credentials and query cache. A storage failure revokes the newly issued session rather than treating unsaved credentials as durable.

Auth responses use `Cache-Control: no-store`. Google network verification has an 8-second timeout and no automatic retry. Google is mocked in automated tests; PostgreSQL integration uses only the isolated Neon test branch. The first UI is functional with foundation tokens; full onboarding and visual design follow in Phase 2.
