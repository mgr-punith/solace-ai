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
- [x] Native Google account selection completed by the user on both test phones; Home opened. Credentials and Google screens were left to the user.
- [ ] Confirm access-token refresh on the device.
- [x] On vivo Android 14, 7 November: signed out of the standalone preview, protected tabs disappeared and all reminder alarms cleared. The user selected their Google account and confirmed Home opened again; saved reminder preferences returned.
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
- [x] Phone controls for all four Sol states, day/night/auto and Reduce Motion checked on 7 November (details below).
- [ ] Check the time slider, large text in the design preview and record a device performance sample.
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
- [x] Realme Android 11, 7 November: disabled Wi-Fi with mobile data already off, attempted a labelled mood save, observed preserved input and Retry saving check-in, reconnected and retried. Progress showed one new entry; both disposable QA moods were deleted afterward, preserving the user's original 13:53 check-in.
- [x] Save works with the keyboard open after the Android layout fix. At 130% text on vivo, the complete button remains reachable above the keyboard; the layout-only note was not saved.
- [ ] Check TalkBack, date rollover and interrupted loading on device.

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
- [x] Offline send/retry retained the message and produced one saved turn after reconnecting (7 November, details below).
- [ ] Check long messages/history, pending-reply reopen and expired session.
- [x] Support works offline and region selection updates the information (7 November).
- [ ] Check dialer fallback without placing a helpline call.
- [x] At 130% text on vivo, Talk/history controls wrap, and a new empty conversation's composer and Send button remain above the open keyboard. The draft was not sent; the temporary conversation was deleted.
- [ ] Check TalkBack, long-message text scaling and Reduce Motion in chat. Crisis pattern tests do not establish comprehensive real-world crisis detection.

## Phase 5 reminders (7 November 2026)

- [x] PR #9 merged as `a205d67` and deployed on Render. On 7 November, `/health` and `/ready` returned 200 (database connected), and unauthenticated `/v1/reminders` returned the expected 401. Authenticated phone settings loaded and saved successfully, exercising migration `0004_flat_shiva.sql`.
- [x] Built the notification APK locally and verified its signing certificate matches the Google registration. Installed with `adb install -r` on Realme RMX2050 (Android 11); this was a fresh install. The user completed Google sign-in against Render after retrying an earlier connection error.
- [x] You → Reminders: all types initially off and no automatic permission prompt. On Android 14, the denied state was explained; the settings link worked, and returning after enabling notifications allowed scheduling.
- [ ] Exercise both choices of the Android 13+ native permission prompt on a clean install; settings-based changes do not cover that prompt.
- [x] On Realme, all five types initially off; Android 11 already allowed notifications. Enabled Mood check-in for Saturday at 14:12 outside quiet hours. The app confirmed account save and phone scheduling; Android's alarm registry showed the 14:12 trigger.
- [x] Background notification → Home passed on Realme. On vivo standalone, swipe-away plus screen-off delivery passed; tapping the notification opened the matching Affirmation page. Secure-lock authentication remains a separate release check.
- [x] Affirmation reminder: cold-start tap opened the matching page on vivo standalone. Expired-session → sign-in → destination is covered by navigation tests, but the full device sequence remains a release check. No session tokens were extracted.
- [x] Weekday/time edits changed native alarms; quiet-hours warning and skipped scheduling verified. Disabling all reminders removed all native alarms. Each controlled delivery produced one notification.
- [ ] Observe two consecutive saves and reopens of an enabled reminder for a dedicated device duplicate check; reconciler idempotency is covered automatically.
- [x] Save an edit offline: local save and pending sync are clear. Reopen and reconnect → sync succeeds; stale server settings do not overwrite the edit (Realme Android 11).
- [x] Sign out: scheduled and delivered reminders disappear. Sign back in: server preferences return (vivo Android 14 standalone APK). Account deletion remains covered automatically; no real account was deleted.
- [x] At 130% text, Reminders scrolls to all controls and Save remains above the open keyboard. Controlled closed-app delivery was 82 seconds after the requested time, inside Android's inexact alarm window.
- [ ] Check reboot, timezone travel, DST behavior, prolonged battery optimization, channel-only disablement and TalkBack.
- [x] Restored all five reminder types off, each 19:00/all weekdays, empty custom text, and quiet hours on at 22:00–08:00. Saved to Render; Android has no scheduled or delivered Solace notifications.

## Cross-feature device QA (7 November 2026)

Devices: Realme RMX2050 (Android 11, local development APK with USB Metro 8082), followed by vivo V2168 (Android 14, locally built standalone preview APK). All installed-app API calls use the deployed Render service. Existing user check-ins and conversations are preserved; new test content is labelled `QA Nov7`.

- [x] Mood reminder arrived while the app was backgrounded: observed one notification at 14:12, with the intended copy. Tapping it returned to Home.
- [x] Saved a labelled Good/Calm mood entry at 14:15 through Render with the keyboard visible; Progress displayed the exact note beside the untouched earlier 13:53 entry. Save was actionable, but its lower edge overlapped the keyboard; the shared layout fix and retest are recorded below.
- [x] New QA chat accepted a synthetic study-break message and returned a real Groq reply. Provider disclosure was visible; the existing 6 November conversation was left untouched.
- [x] Cold restart retained the signed-in session, saved mood and QA chat. A follow-up correctly referenced the study break. USB Metro forwarding had disappeared during restart; restoring `adb reverse tcp:8082 tcp:8082` recovered the development connection. This was separate from the Render API.
- [x] Offline chat retained the failed message and offered Retry message. After reconnecting, retry produced one saved user turn and a real reply, and cleared the error. Cancelled deletion once, then deleted only the QA conversation; the original 6 November conversation remained.
- [x] Support opened offline. India, United States and Somewhere else showed the intended regional information. No dialer action or helpline call was made.
- [x] Fixed the shared Android form layout to set `KeyboardAvoidingView`'s `behavior="padding"`, as required by current Expo keyboard guidance for edge-to-edge apps. Retested on Realme: the complete mood Save button scrolls above the open keyboard and works. No new native build is needed for this JavaScript change.
- [x] Reminder quiet-hours check: enabled Affirmation at 23:30 with 22:00–08:00 quiet hours, observed the skip warning, saved through Render, and found no scheduled Solace alarm. Then saved 14:38 offline: the phone showed pending account sync and scheduled the reminders locally. Leaving and reopening retained the edit; reconnecting and foregrounding completed account sync.
- [x] Full verification after the keyboard fix: lint, formatting, all workspace typechecks and 164 tests passed (95 API, 63 mobile, six shared). The first sandbox attempt could not access the container runtime; rerunning with approved access started disposable PostgreSQL and passed. No live backend was started locally.
- [x] Closed-app delivery: a single affirmation arrived at 14:38 and again in a separate 14:43 check after swiping Solace away and turning the screen off. `pidof` confirmed the app process was absent before delivery. The phone wakes without a secure lock, so this does not verify notification handling behind authentication.
- [x] Cold-start affirmation destination: retained the pending target until the matching screen and reminder type are active, avoiding early fallback by the entry redirect. Two regression cases pass. On vivo standalone, one notification scheduled for 22:32 arrived at 22:33:22 (within Android's 1m 50s inexact window), after the process had exited and screen was off. Tapping it opened Affirmation with the correct text. Earlier device conclusions were inconclusive: the development launcher intervened, and UIAutomator could report a failed dump with exit code zero, leaving stale XML. The final result was verified with a fresh screenshot and a validated fresh dump.
- [x] Privacy review kept the existing memory preference enabled, with clear notice that memory is not active yet. Reviewed introduction pages 1–4, selected a practice mood, returned from page 3 using Android Back, skipped from page 1 to privacy, and saved the same choice. Returned to Home.
- [x] After the Realme checks, restored reminder defaults and confirmed no scheduled alarms. Removed both labelled QA moods and the QA conversation; the original mood and conversation remain. The later vivo tests temporarily changed reminders again; final cleanup is tracked below.
- [x] Full verification after the notification navigation fix: lint, formatting, all typechecks and 165 tests passed (95 API, 64 mobile, six shared).
- [x] User switched to vivo V2168 (Android 14). Built the standalone ARM64 preview APK locally; Gradle completed in 18m 56s after retrying the Maven download. Certificate matches the development APK; installed with `adb install -r`, preserving data. Normal cold launch reached signed-in Home without Metro or Expo's launcher (Android activity launch time 2.05 seconds, not an end-to-end timing benchmark).
- [x] Android 14 notifications were initially denied. Reminders explained the state and its settings link opened Solace app settings. Enabled notifications there for QA; returning and saving created the expected inexact alarms. Logout cancelled all Solace alarms and notifications and removed protected tabs. The user selected their Google account and confirmed Home opened again in the standalone APK.
- [x] Phone design preview: activated Rest, Greet, Think and Breathe controls, checked day/night/auto, and confirmed Reduce Motion changes breathing copy to “Breathe at your own pace.” Restored haptics on, motion preview off and automatic sky. This verifies controls and static layout, not animation frame rate or physical haptic perception.
- [x] Standalone bundle inspection: Render URL and packaged JavaScript are present; the configured database URLs, JWT secrets, AI key and temporary route diagnostics are absent. This checks the configured values, not every possible secret pattern.
- [x] Resumed at 22:26 after the user reported Render was ready for testing: `/ready` returned HTTP 200 with the database connected in 0.57 seconds, and `/v1/chat-provider` returned `groq`. A normal cold launch on vivo reached Home with the session preserved (Android activity launch 1.29 seconds). The hosting plan was not independently inspected.
- [x] Vivo at 130% system text: Home, You, Privacy and memory, Reminders, Talk/history and an empty chat kept key actions reachable. Mood Save, reminder Save and chat Send were visible above the keyboard. Existing privacy choice stayed unchanged; layout-only drafts were never submitted. This is a focused layout check, not a complete accessibility audit.
- [x] Final cleanup: deleted the empty layout-test conversation and confirmed only the original conversation remained. Restored vivo font scale to 1.0 and Android notification permission to its original off state. Reminder defaults are saved, with no alarms or delivered notifications. The disconnected Realme's earlier font-size change could not be confirmed/restored after the user switched phones (original scale 0.9); its app test data had already been cleaned.
- [ ] Investigate one unexpected sign-out after cleanup. Font restoration recreated the activity at 22:59:45; Android logged a process kill for `permissions revoked` at 23:00:08. The next launch showed sign-in. The user signed in again successfully at 23:02, and a normal force-stop/cold launch at 23:04 preserved Home. The cause of session loss is not established; process termination alone does not explain it. No credentials were extracted and no speculative auth change was made.

## Release follow-ups

- [x] Chat survives closing and reopening; delete removes the conversation (Phase 4 physical-device checks above).
- [x] Reminder fires in the background and after swipe-away; taps open Home or the matching Affirmation destination. Quiet hours, offline edits, reconnect sync and logout cleanup were checked.
- [ ] Android 13+ native permission prompt: both accept and decline on a clean install. Denied/enabled settings paths were checked on vivo.
- [ ] Notification tap through an expired session and Google sign-in on a real device; secure-lock authentication. Automated navigation tests cover the pending-target handoff.
- [ ] Reboot, timezone/DST changes, repeated saves/reopens, channel-only disablement and prolonged battery optimization. One 82-second delay was observed within the inexact alarm window; force-stop behavior differs from swipe-away.
- [ ] TalkBack, long chat/history, pending-reply reopen, expired-session recovery and full small-screen accessibility; physical haptics and animation performance. Focused 130% text and design-preview Reduce Motion checks passed.
- [ ] Resolve the post-settings sign-out above; explicitly verify token refresh on device. Check account deletion on a disposable account; automatic tests cover deletion and token rotation.
- [ ] Verify region-appropriate helplines from official sources before release.
- [x] Standalone preview APK installed as an update; cold launch, sign-in, notifications and HTTPS Render readiness checked.
- [ ] Clean-install preview APK smoke test, native splash and release bundle review. The current vivo installation preserved existing data.

Phase 6 breathing, daily affirmations and streaks, and Phase 7 memory/personalization are future work. The design preview and reminder destination do not establish those features as complete.
