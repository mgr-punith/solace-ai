# Manual QA

Only check items after observing them. Automated checks are run with `npm run verify`.

## Phase 0

- [ ] Install the EAS Android development build on the real phone.
- [ ] App opens from a fresh launch without a red error screen.
- [ ] “Check connection” reaches the running API over HTTPS and shows “Connected. Solace is ready.”
- [ ] Airplane mode shows a recoverable message; reconnecting and retrying succeeds.
- [ ] Day and dark mode remain readable.
- [ ] Large text does not clip; controls stay clear of system bars.
- [ ] No secrets are included in the EAS upload or mobile bundle.

## Later phases

- [ ] Google sign-in, session restoration, refresh, logout, and account deletion on a real device.
- [ ] Chat survives closing and reopening; delete removes the conversation.
- [ ] Notification permission accepted and declined paths work.
- [ ] Reminder fires while the app is backgrounded or closed; tap opens the intended route, including after login.
- [ ] Test notification delays caused by Android battery optimization; force-stopping the app may prevent delivery until reopened.
- [ ] Reduce Motion, optional haptics, 130% text, screen-reader labels, and small-screen layouts.
- [ ] Verify region-appropriate helplines from official sources before release.
- [ ] Fresh preview APK smoke test and HTTPS Render readiness check.
