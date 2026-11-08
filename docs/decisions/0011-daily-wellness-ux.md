# Daily wellness suggestions and completion

9 November 2026

The user requested a persisted appearance choice, lasting affirmation read status, playful check-ins and daily wellness recommendations. Login investigation and physical-phone testing are deferred until the updated build is ready.

`GET /v1/wellness/today` returns the authenticated user's local date, timezone, check-in flag, breathing count and distinct affirmation IDs read that day. One aggregate query reads existing indexed mood/activity tables with IANA calendar bounds. It excludes private notes and rejects client-supplied account IDs. No migration or new persistent cache is needed. Mobile queries are keyed by user, date and timezone and invalidate after an activity or check-in changes. A failed request stays an error; it never implies an empty day.

Affirmation read state comes from those saved activities. The client immediately shows a confirmed read while the status refreshes, then restores it from the server on reopening. An explicit read uses a stable date/affirmation/timezone request key so a repeated tap or lost-response retry can use the existing API's idempotency. Failed saves retain their original words and request across midnight; the returned server timestamp determines the day credited. Reading and favoriting stay independent. Older clients' existing read records are recognized by the daily query, even though their request keys were random.

Daily recommendations are shared, curated rules using only today's latest mood score and selected tags. Notes, conversation history and cross-chat memory are excluded. Each suggestion includes a reason, a short duration and an action into the existing breathing, affirmation or editable-chat-draft flow. Completed activities stay available behind unfinished choices. The two daily moments count participation, equally for every mood, and fold suggestions away after completion. There is no diagnosis, prescription, clinical screening or claim that an activity improved someone's health. No LLM call or consent change is required.

Appearance is a device preference, stored under its own SecureStore key on Android. Selection is immediate; a failed write restores the prior saved selection and provides Retry. Auto retains the established local-time sky. The development preview has a separate transient override so leaving it cannot erase the real preference. Native session storage is unchanged.

Verification covers API ownership, validation, retry identity, local midnight and timezone changes; shared suggestion ordering and completion; mobile appearance persistence, recovery, read/reopen and draft handoffs. Browser captures use real components with synthetic data and mocked navigation. They do not verify Android layout, haptics, native Back or motion performance. Those checks remain in the QA checklist for the next phone session.
