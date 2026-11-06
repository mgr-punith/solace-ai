# Device-local onboarding preference

Status: accepted for Phase 2, 6 November 2026.

The introduction needs resumable progress and an optional memory choice before Google sign-in. AI memory is not implemented yet, so Phase 2 does not add unused backend profile fields or claim that personalization is active.

Use one versioned SecureStore document: installation-wide introduction progress, choices keyed by authenticated user ID, and a pending signed-out choice. The next account claims that pending choice once. A failed claim blocks entry until retry; switching accounts never displays another account’s choice. Existing account choices win over a later pending choice. Corrupt data grants no consent. Writes must finish before navigation reports success.

Deletion clears the account’s local choice before the API deletion; a local failure blocks deletion with a retry. If the API then fails, the account remains and can retry deletion or choose a preference again. No tokens or conversation content are stored in this document. Browser preview uses localStorage for introduction only and stays signed out.

Phase 7 must migrate consent to the backend, keep opt-in off when unknown, and provide memory view/delete before any personalization pipeline reads it. Android uninstall clears SecureStore; iOS Keychain can survive uninstall. Copy describes the current device-local scope honestly.
