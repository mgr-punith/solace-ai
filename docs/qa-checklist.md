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
- [ ] On phone: new conversation → send → reply → history → force-stop/reopen → continue → delete disposable conversation.
- [x] Phone before Groq migration: new conversation, keyboard-visible Send, saved greeting and fallback, history and force-stop/reopen with restored retry state observed. Initial send/retry did not yield a real AI reply; successful reply/continue/delete remain pending. The single disposable QA chat is retained for post-deploy retry.
- [x] Groq private-key smoke returned 200 and final text in 0.6 seconds. Six actual-adapter synthetic provider scenarios passed in 0.3–1.1 seconds, with deterministic crisis response retained. These are local-provider checks, not Render timings.
- [x] Groq integration verification passed lint, typechecks and 143 tests (92 API, 47 mobile, four shared). Production API build and Android export passed; the bundle contains the Render URL and excludes the private Groq key.
- [ ] Deploy Groq-compatible backend, change Render LLM values together and confirm `/v1/chat-provider` reports Groq; finish phone reply/persistence/delete verification.
- [ ] Check send with the keyboard visible, long messages/history, pending-reply reopen, offline retry and expired session.
- [ ] Check Support offline, region selection and dialer fallback; never place a test call to a helpline.
- [ ] Check TalkBack, 130% text and Reduce Motion in chat. Crisis pattern tests do not establish comprehensive real-world crisis detection.

## Later phases

- [ ] Chat survives closing and reopening; delete removes the conversation.
- [ ] Notification permission accepted and declined paths work.
- [ ] Reminder fires while the app is backgrounded or closed; tap opens the intended route, including after login.
- [ ] Test notification delays caused by Android battery optimization; force-stopping the app may prevent delivery until reopened.
- [ ] Reduce Motion, optional haptics, 130% text, screen-reader labels, and small-screen layouts.
- [ ] Verify region-appropriate helplines from official sources before release.
- [ ] Fresh preview APK smoke test and HTTPS Render readiness check.
