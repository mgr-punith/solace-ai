# Manual QA

Only check items after observing them. Automated checks are run with `npm run verify`.

## Phase 0

- [x] Install the EAS Android development build on the real phone (cloud and local ARM64 APKs; vivo V2168, Android 14).
- [x] App opens from a fresh launch without a red error screen.
- [x] “Check connection” reaches the running API over HTTPS and shows “Connected. Solace is ready.”
- [ ] Airplane mode shows a recoverable message; reconnecting and retrying succeeds.
- [ ] Day and dark mode remain readable.
- [ ] Large text does not clip; controls stay clear of system bars.
- [ ] No secrets are included in the EAS upload or mobile bundle.

## Phase 1

- [x] Signed-in welcome screen is visible on the real Android phone.
- [x] Session stays signed in after closing and reopening the app through USB Metro.
- [ ] Observe the native Google account-picker flow on a real device.
- [ ] Confirm access-token refresh on the device.
- [ ] Sign out and sign back in on the device.
- [ ] Confirm account deletion on a disposable test account with the user's approval.

## Phase 2 design preview

- [x] SDK compatibility: Expo Doctor passed all 20 checks after deduplicating Worklets to SDK 58's 0.13.0.
- [x] Local development APK built and installed with `adb install -r` on vivo V2168 (Android 14); native compilation took 17m 15s.
- [x] App opened from USB Metro on port 8082 and reached session restoration. After USB protocol errors, the user confirmed the installed app opens through Wi-Fi Metro at `http://192.168.1.4:8082`.
- [x] Browser preview rendered day/night sky, Sol, mood choices and breathing; checked a 360×640 viewport and system Reduce Motion.
- [x] Android production JavaScript export completed.
- [x] Automated contrast check covers every local minute; mobile tests cover unsaved preview mood, system Reduce Motion, haptics preference and foreground cleanup.
- [x] Verified the installed `com.puneet.solace` app attached to Wi-Fi Metro, preserved the signed-in name, and rendered Sol with a selected mood on vivo V2168.
- [x] Confirmed Fast Refresh over Wi-Fi: the saved mood-layout change appeared on vivo without reinstalling; all mood labels now fit. A 19.94-second device recording is saved at `/tmp/solace-preview.mp4`.
- [ ] Check all four Sol states, time slider, day/night, large text and Reduce Motion on the phone; record about 20 seconds for design review.
- [ ] Measure release/preview performance on the phone before accepting the Skia performance gate.
- [ ] User reviews the preview before splash/onboarding implementation.

USB disconnected intermittently during the phone check. Reconnect and rerun `adb reverse tcp:8082 tcp:8082` if Metro loses the device. A development-build screenshot does not establish release frame-rate performance.

## Later phases

- [ ] Chat survives closing and reopening; delete removes the conversation.
- [ ] Notification permission accepted and declined paths work.
- [ ] Reminder fires while the app is backgrounded or closed; tap opens the intended route, including after login.
- [ ] Test notification delays caused by Android battery optimization; force-stopping the app may prevent delivery until reopened.
- [ ] Reduce Motion, optional haptics, 130% text, screen-reader labels, and small-screen layouts.
- [ ] Verify region-appropriate helplines from official sources before release.
- [ ] Fresh preview APK smoke test and HTTPS Render readiness check.
