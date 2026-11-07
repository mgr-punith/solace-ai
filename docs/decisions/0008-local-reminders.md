# ADR 0008: Local recurring reminders with account sync

## Decision

Phase 5 uses SDK 58 `expo-notifications` and one recurring weekly trigger per enabled type and selected weekday (at most 35 triggers). One 24-hour time per type is supported in this slice. All five types start disabled. The default quiet window is 22:00–08:00; matching reminder times are skipped, with a visible explanation. Times follow the phone's local timezone, including after travel. Affirmations vary by weekday.

Android's `bestEffort` delivery uses inexact alarms without exact-alarm permission. We do not request push tokens, exact alarms or background task execution. The module restores stored schedules on boot. Permission is requested only after the user presses **Allow notifications**, after creating the Android channel. Notifications use no sound or vibration and private lock-screen visibility; users can change channel settings in Android.

`GET /v1/reminders` returns the authenticated user's settings or disabled defaults. `PUT /v1/reminders` replaces the entire bounded settings document. There is no unbounded list or pagination. A UUID-keyed `reminder_preferences` row has a unique user foreign key with deletion cascade. Zod validates every field, including time, timezone, distinct weekday values and exactly one entry per type. Custom text is capped at 120 characters and is never logged.

The phone caches one account's preferences and a pending-sync flag in SecureStore. Save first persists locally, then reconciles schedules and attempts account sync. Failed sync keeps the pending change for retry on foreground, restart or the explicit retry action. Unsynced device changes win on the next sync; otherwise the latest account copy wins. The server is last-write-wins across devices. Changes made on another device take effect here when this app next opens, not immediately in the background.

Reconciliation is serialized: cancel old schedules, check permission, then recreate only permitted reminders. Partial scheduling failure removes newly created schedules. User changes invalidate in-flight network operations so stale responses cannot restore another account's cache. Sign-out, session expiry and account deletion clear schedules, delivered notifications and the device cache; cleanup does not wait on the auth network queue. An expired session retains an already tapped destination through login; intentional sign-out clears it.

Notification routes are allowlisted. Mood opens Home; other types open a simple reminder page with the relevant prompt and working Home/Talk actions. Phase 6 will supply full breathing and affirmation features. Cold-start and live responses are deduplicated; routing waits for authentication and onboarding.

## Limits and verification

Android battery policy may delay delivery. Quiet hours filter the requested trigger time; the operating system can deliver an earlier delayed notification inside that window. Force-stop suppresses notifications until reopening; swiping away is the relevant closed-app test. Daylight-saving gaps and device reboots require real-device checks; weekly native triggers avoid UTC-offset arithmetic in JavaScript. No claim is made that notification delivery is exact.

Automated tests cover account isolation, validation, idempotent persistence, account-deletion cascade, scheduling, overnight quiet hours, denied permission, partial failure cleanup, offline edits, restart, account switch, stale sync, permission UI and cold-start/live response handling. Physical delivery and tap behavior are recorded separately in the QA checklist. A new local development APK is required, using the existing Google-registered signing key and `adb install -r`.

## Sources checked 7 November 2026

- [Expo SDK 58 notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/): weekly triggers, Android channels, permissions, delivery, boot restore and notification responses.
- Installed Expo SDK 58 package declarations and Android `ExpoSchedulingDelegate`: without exact-alarm permission, Android uses `setAndAllowWhileIdle`.
