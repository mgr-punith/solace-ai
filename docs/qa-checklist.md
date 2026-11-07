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
- [x] User accepted the current design provisionally and authorized splash/onboarding on 6 November 2026.

USB disconnected intermittently during the phone check. Reconnect and rerun `adb reverse tcp:8082 tcp:8082` if Metro loses the device. A development-build screenshot does not establish release frame-rate performance.

## Phase 2 onboarding

- [x] Four introduction pages, practice mood, example conversation and optional memory preference implemented with existing design tokens.
- [x] Browser at 360×640: first launch opens introduction; Skip intro leads to privacy with memory off; save goes to sign-in; reload stays at sign-in.
- [x] Store/component tests cover interrupted save/retry, progress restore, one-time account claim, account isolation, deletion cleanup, font timeout and Reduce Motion startup.
- [x] Local ARM64 development APK compiled in 12m 7s and installed with `adb install -r` on vivo V2168; data preserved.
- [x] Observed onboarding example page, signed-in preview and Privacy and memory on phone over Wi-Fi Metro. Privacy content scrolls and Save choice is reachable. Saved the existing choice unchanged, force-stopped and reopened: the signed-in welcome returned without replaying onboarding.
- [x] `npm run verify`: lint, typechecks, 25 API + 34 mobile + 1 shared tests passed. Android production JavaScript export passed.
- [ ] Verify the native Sol launch image in a preview/release APK; development builds do not faithfully reproduce the release splash.
- [ ] Phone: complete every Back/Skip path, test 130% text and TalkBack, verify day/night and Reduce Motion. Browser checks do not replace these checks.
- [ ] Test account deletion on a disposable account; no real account was deleted for this slice.

Privacy choice is device-local and account-specific for now; no memory collection is active. Phase 7 must sync consent to the backend and implement memory view/delete before personalization is used. Browser preview stays signed out and never stores authentication tokens.

## Phase 3 Home and mood check-ins

- [x] API integration tests cover validation, ownership, idempotent/concurrent retries, cursor pagination, timezone midnight filtering, individual deletion and account cascades.
- [x] Mobile tests cover explicit save, optional tags/note, preserved failed input, identical retry keys, history loading/deletion/recovery, and serialized token refresh.
- [x] Phone connected to Render again after the user's Render-only correction. Observed signed-in Home greeting and Home / Progress / You tabs on vivo V2168.
- [x] Phase 3 is merged as `41c383f` and live on Render. On 6 November 2026, `/ready` returned HTTP 200 with the database connected and unauthenticated `/v1/mood-checkins?limit=1` returned HTTP 401 `SESSION_EXPIRED`.
- [x] On vivo V2168 (Android 14), saved a disposable Good check-in with a Calm tag and a labeled QA note through the installed app against Render. Home confirmed the save and displayed the mood, tag, note and local time; Progress displayed the same entry.
- [x] Force-stopped `com.puneet.solace`, reopened through Wi-Fi Metro, and observed the same entry in Progress after the signed-in session restored. This verifies persistence beyond the in-memory query cache.
- [x] Deleted only the disposable QA entry through the confirmation dialog. Progress returned to its first-check-in empty state, and Home showed no check-in today.
- [x] Entered an optional note with the Android keyboard; after dismissing the keyboard, Save remained reachable by scrolling. Home and Progress empty states were observed.
- [ ] Exercise offline save/retry on the phone and confirm no duplicate entries.
- [ ] Verify Save with the keyboard still open, 130% text, TalkBack, loading/error recovery and date rollover on device.

The user subsequently chose one Neon branch for the assignment. API tests now use disposable local PostgreSQL; the former Neon test password is no longer needed. `npm run verify` passed lint, formatting, all typechecks and all 83 tests (39 API, 40 mobile, four shared). The production API build passed, and the temporary test container was removed after the run.

The initial post-deploy mood endpoint returned HTTP 404 despite the dashboard showing the correct commit live. A later check returned the expected HTTP 401 without any code change; the reason for the earlier response was not established. No Render configuration change was made during this QA pass.

The installed app uses only Render. Local API and temporary tunnel were stopped, and the mobile URL was restored to Render; no check-in was saved on the phone via the temporary local API. Automated integration tests use a disposable PostgreSQL container isolated from app data. Unsaved form input survives a retry while mounted, but is not persisted after app termination.

## Phase 4 chat

- [x] Synthetic VyceAi smoke request with the configured model returned HTTP 200 and a nonempty OpenAI-format reply. The key was never printed.
- [x] Tele-MANAS 14416 verified from the Directorate General of Health Services programme page; US 988 verified from 988lifeline.org on 6 November 2026. Reverify before submission.
- [x] `npm run verify` passed lint, types and 127 tests (77 API, 46 mobile, four shared). Production API build and Android export passed.
- [x] Reviewed synthetic anxious, sad, angry, lonely, crisis and unsafe-request scenarios. Replies stayed supportive and the unsafe request was refused. The first prompt-injection evaluation timed out; an isolated retry refused therapist impersonation and medication prescribing. This small sample is not a comprehensive safety evaluation.
- [x] Phase 4 merged as `fab96ab` and deployed to Render. On 6 November 2026, `/ready` returned 200/database connected and `/v1/conversations?limit=1` returned 401 without credentials.
- [x] On vivo V2168 (Android 14), completed the Phase 4 flow against Render: created a conversation, saved the initial message, retried it after Groq deployment, received a real reply, viewed history, force-stopped/reopened, continued the same conversation and deleted it.
- [x] Phone before Groq migration: new conversation, keyboard-visible Send, saved greeting and fallback, history and force-stop/reopen with restored retry state observed. Initial send/retry did not yield a real AI reply; successful reply/continue/delete remain pending. That disposable chat was subsequently retried successfully through Groq and deleted after the checks below.
- [x] Groq private-key smoke returned 200 and final text in 0.6 seconds. Six actual-adapter synthetic provider scenarios passed in 0.3–1.1 seconds, with deterministic crisis response retained. These are local-provider checks, not Render timings.
- [x] Groq integration verification passed lint, typechecks and 143 tests (92 API, 47 mobile, four shared). Production API build and Android export passed; the bundle contains the Render URL and excludes the private Groq key.
- [x] PR #7 merged as `47d3ae3`; after the user changed all four Render LLM values and redeployed, `/v1/chat-provider` returned 200 with `groq` and `/ready` returned 200/database connected. Talk and the chat composer displayed Groq.
- [x] Retried the original synthetic greeting on the phone. Groq returned a real reply that replaced the fallback; only one user/assistant turn remained and the retry action cleared.
- [x] Force-stopped and cold-started `com.puneet.solace` through Wi-Fi Metro, reopened history and observed the exact saved greeting and Groq reply. Sent a second synthetic message with the keyboard visible; Sol correctly referenced the earlier study break, verifying continuation with current-conversation context.
- [x] Deleted only the disposable QA conversation through its confirmation dialog. History returned to its empty state and remained empty after pull-to-refresh. No real conversation or account was deleted.
- [x] Send was visible and usable with the Android keyboard open; the keyboard dismissed while the response was prepared.
- [ ] Check long messages/history, pending-reply reopen, offline retry and expired session.
- [ ] Check Support offline, region selection and dialer fallback; never place a test call to a helpline.
- [ ] Check TalkBack, 130% text and Reduce Motion in chat. Crisis pattern tests do not establish comprehensive real-world crisis detection.

## Phase 5 reminders (7 November 2026)

- [ ] Deploy the reminder API and migration `0004_flat_shiva.sql` on Render before phone testing; no new environment variables.
- [ ] Build Android locally with the existing signing certificate and install with `adb install -r`; confirm Google session survives.
- [ ] You → Reminders: all types initially off; no automatic permission prompt. Allow notifications and decline paths both leave preferences usable. Returning from phone settings refreshes scheduling.
- [ ] Enable Mood check-in, select today's weekday and a time several minutes ahead outside quiet hours, then Save reminders. Confirm account save and schedule status.
- [ ] Background the app and wait for a notification. Tap → Home. Repeat after swiping the app away (do not use force-stop), tap from the lock screen → Home.
- [ ] Test an affirmation or breathing reminder: tap → matching prompt page. Test cold start and an expired session → sign in → intended destination. Never print or extract session tokens during QA.
- [ ] Reopen twice and save twice: no duplicate notifications. Disable the reminder and confirm no future trigger. Verify quiet-hour warnings, weekdays and time edits.
- [ ] Save an edit offline: local save and pending sync are clear. Reopen and reconnect → sync succeeds; stale server settings do not overwrite the edit.
- [ ] Sign out: scheduled and delivered reminders disappear. Sign back in: server preferences return. Account deletion is covered automatically; do not delete a real account for QA without permission.
- [ ] Check reboot, timezone travel and DST behavior, battery-optimization delay, channel disabled in Android settings, 130% text, TalkBack and keyboard-open Save.
- [ ] Restore reminder settings after disposable QA so no test nudges remain enabled.

## Release follow-ups

- [x] Chat survives closing and reopening; delete removes the conversation (Phase 4 physical-device checks above).
- [ ] Notification permission accepted and declined paths work.
- [ ] Reminder fires while the app is backgrounded or closed; tap opens the intended route, including after login.
- [ ] Test notification delays caused by Android battery optimization; force-stopping the app may prevent delivery until reopened.
- [ ] Reduce Motion, optional haptics, 130% text, screen-reader labels, and small-screen layouts.
- [ ] Verify region-appropriate helplines from official sources before release.
- [ ] Fresh preview APK smoke test and HTTPS Render readiness check.
