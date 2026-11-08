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

The checks above cover Phases 1–5. Phase 6 implementation and its remaining device checks are tracked below; Phase 7 memory/personalization is still future work.

## Phase 6 wellness and visual refresh (7–8 November 2026)

- [x] New disposable-PostgreSQL integration cases cover activity auth/validation, concurrent idempotent retries and conflicts, private favorites, timezone progress, mood deletion, DST transitions and account cascades.
- [x] Mobile tests cover explicit affirmation reads/favorites, failed-save retries, breathing background pause/resume, no incomplete logging and completed-session retry. Existing auth/mood/chat/reminder suites pass with the new shared UI.
- [x] Browser visual review with synthetic data at 390×844: Home, Wellness, breathing, affirmations, Progress, Talk, chat and You. Confirmed completion→Save→Progress using mocked responses, never the real account. Fixed narrow greeting, clipped tab labels, transparent scenes showing the previous screen, SVG accessibility warning and browser-only AppState blur subscription.
- [x] Browser at 360×640: affirmations wrap and scroll; night Home keeps five labeled tabs and mood faces. Additional browser text enlargement showed no horizontal page overflow. This is not a substitute for Android dynamic-text QA.
- [x] Reduce Motion browser path uses a static Sol and phase text. One-minute completion observed; automated tests verify background pause and no background-time credit.
- [x] Final `npm run verify`: lint, formatting, all workspace typechecks and 180 tests passed (100 API, 71 mobile, nine shared), including a regression for retrying an affirmation save across midnight. API tests used disposable PostgreSQL. Production API build and Android export passed; Expo Doctor passed all 20 compatibility checks during the new native build.
- [x] Both GitHub workflows for `3369b8e` passed verification, production API build and Android export. Signed ARM64 preview built locally: Gradle 18m 44s, approximately 23 minutes including setup, 48.6 MiB. Package is `com.puneet.solace`; certificate matches the existing development APK. Packaged JavaScript includes the Render URL and final retry correction, excludes configured backend secrets and the synthetic QA fixture. APK SHA-256: `da263546ffb59b5c14566ff07ffae4045304da608389f5b82ca9977244e5abec`.
- [x] User merged PR #11 as `0427d92`. On 8 November, Render `/ready` returned 200/database connected and unauthenticated `/v1/progress` returned 401. Authenticated Phase 6 writes subsequently passed on 8 November; see the follow-up below.
- [x] Phone reconnected: signed preview installed with `adb install -r` on vivo V2168, Android 14, returning Success. Existing signed-in access was retained and the new breathing setup displayed. Font scale read 1.0; no phone settings changed. The user was actively exploring the app, so automated taps paused to avoid interrupting an in-progress practice.
- [ ] On Android: Google session survives update; Home/Wellness/Talk/Progress/You icons and labels fit; launcher adaptive icon, day/night, 130% system text, TalkBack, keyboard and small-screen layout pass.
- [ ] On Android: all three breathing patterns match Sol/phase changes, pause on background/notification drawer/lock, explicit resume, haptics toggle, Reduce Motion, and leaving an unsaved session confirmation pass.
- [ ] On Android against Render: complete/save a synthetic session, retry after interrupted connection without duplicate credit, verify progress on restart; favorite/unfavorite and explicit affirmation read persist. Clean only synthetic data with agreed account controls.
- [ ] Measure animation smoothness and startup on the preview APK; browser screenshots and Jest cannot establish device frame rate.

Phase 5's earlier signed-out state after changing Android font/notification permissions remains an unresolved release follow-up. No new auth logic was added in Phase 6.

### Phone density, buttons, interaction and Back follow-up (8 November)

- [x] Reduced the type/icon scale and page padding, removed repeated header panels and redundant Home cards, shortened Talk history rows, and condensed breathing setup. Primary actions are 16 dp rounded rectangles, secondary actions outlined, optional details quiet. All targets remain at least 48 dp; native text scaling remains enabled.
- [x] Interactive Sol: wave, delighted face and wink with visible local responses; touch compression; hold for a quiet breath; release and blur stop the hold. Automated tests cover reaction timeout replacement, hold release/blur, mood response and Reduce Motion. Phone tap response and wink visually confirmed.
- [x] Traced Android Back on vivo Android 14: routes mounted but no JavaScript Back callback arrived with predictive Back enabled. Set `android.predictiveBackGestureEnabled=false` in Expo config and rebuilt locally. Phone now traverses You → Talk → Wellness → Home; detail Back returns to its source; active breathing Back prompts before leaving. Standalone APK also confirmed You → Talk. Android 16+ predictive behavior remains a separate device check.
- [x] Full `npm run verify` passed: 186 tests (100 API, 77 mobile, 9 shared), lint, formatting and all typechecks. API tests used disposable local PostgreSQL.
- [x] Render authenticated Phase 6 checks: completed coherent breathing, saved successfully, observed Progress update; backgrounding paused with 53 seconds retained until explicit resume. Favorite persisted on reopening and in Saved words; removed it and saw empty state; explicit Mark as read updated progress. One QA breathing minute and one affirmation read remain as completed actions; there is no per-activity deletion control. The other pre-existing breathing session was preserved.
- [x] Temporary labelled mood saved with keyboard open, appeared in history and was deleted; original Nov 7 check-in preserved. Temporary chat received a real Groq reply, reopened from history, retained context in a follow-up and was deleted; only original Nov 6 conversation remains. No personal conversation was edited or deleted.
- [x] Local standalone preview built (Gradle 11m 59s), signed with the existing certificate and installed with `adb install -r`. 50,938,630 bytes; SHA-256 `7f545c465ff257672a9dc28e47c875b972d28d374a858ceb122063786361cf81`. Bundled Render URL and Sol interaction verified; temporary Back diagnostics absent. Signed-in Home opens without Metro.
- [ ] Current-layout release checks still to complete: 130% native text, TalkBack, long offline chat/retry, all three breathing patterns, physical haptics and measured frame rate. Prior phase checks above retain their original scope; automated tests do not replace these device checks.
- [x] Current standalone closed-app notification: scheduled Affirmation for 01:42, swiped Solace away, confirmed no process at 01:41; notification observed at 01:44:16, then tapped from the drawer. Correct Affirmation destination opened. Delivery time is an observation, not an exact timestamp; Android used an inexact window.
- [x] Restored all reminders off, Affirmation time 19:00/all days, quiet hours enabled 22:00–08:00 and Android notification permission off. No alarms remained. Font scale temporarily 1.3 then restored to 1.0; density unchanged. Session survived permission revocation and font changes this time; this does not establish the cause of the earlier Phase 5 sign-out.
- [x] Focused 130% standalone check: five tab labels fit, Home mood choices wrap, Talk action/history/support remain scrollable. Home Save-at-130% was inconclusive because the route changed during automation; do not treat this as a full large-text pass.

### Connected daily flow and modern chat (8 November)

This slice connects existing features: saved check-in → editable chat draft → optional breathing break → return to the same conversation. It does not activate cross-conversation memory or structured AI activity suggestions. Device checks used the signed development APK on vivo V2168 (Android 14), Metro 8082 and the Render HTTPS backend, followed by installation of the new standalone preview.

- [x] Final `npm run verify` passed lint, formatting, all workspace typechecks and 203 tests (100 API, 94 mobile, nine shared; 31 mobile suites). API tests used disposable local PostgreSQL. Behavioral tests cover explicit draft sharing/editing, account isolation and deletion cleanup, same-request retries after leaving chat, preserved drafts through breathing, reading-position protection, saved-day Home state, optional breathing customization and legacy notification destinations.
- [x] A synthetic chat received a real Groq reply. The compact Sol header, open assistant reply, user bubble, multiline composer, arrow Send and expandable provider disclosure displayed on the phone. The header breathing shortcut opened one-minute coherent breathing. This shortcut is a user choice, not an automatic implementation of the rhythm described in an AI reply.
- [x] Completed that one-minute practice, explicitly saved it against Render and tapped Reflect with Sol. The same conversation reopened with its earlier messages and an unsent `I took a 1-minute breathing break.` draft. Sending was still a separate action. An existing draft takes precedence, covered by automated tests.
- [x] At 130% native text, Home's five mood choices wrapped and all five tab labels remained visible. The expanded mood form scrolled Save above the keyboard. A labelled Low check-in saved successfully; Home immediately showed the saved record and Talk about this. Returning from its conversation displayed the same saved state.
- [x] Talk about this opened the selected check-in as an editable draft with a visible review notice and Clear prepared message control. At 130%, the multiline field and Send remained above the keyboard. No user or assistant turn appeared before Send; explicitly sending produced a real reply referring to the synthetic study-day note. Long text scrolls within the composer. This is a focused enlarged-text check, not a complete accessibility audit.
- [x] Deleted only the labelled 02:53 QA mood and its 02:54 conversation, plus the separately verified 02:34 study-break QA conversation. The pre-existing 02:05 and 6 November conversations were preserved. Restored font scale from 1.3 to 1.0; did not change reminder preferences, notification permission or display density. One additional completed breathing minute remains in Progress because there is no per-activity deletion control.
- [x] Built the standalone ARM64 preview locally (Gradle 12m 36s) and independently verified the artifact: 50,948,754 bytes; SHA-256 `141b73cbe3836b563c808e16a19fe162a43a96bf929fabba4fa1d61a6c536423`. The signing certificate matches the development APK. Packaged JavaScript contains the Render URL and connected-flow UI, and excludes the configured backend secret values, synthetic adapters and temporary Back diagnostics. The build log reports both Gradle and EAS success; the enclosing command session returned 143 after the completed artifact was written.
- [x] Installed the new preview with `adb install -r`, which returned Success. This updated the existing installation without uninstalling it.
- [x] After a brief USB disconnection, the installed standalone APK opened to signed-in Home with the new saved-day card; no development launcher or tools overlay appeared. Talk showed the existing conversations, including a user-created 03:00 entry that was preserved. Android Back returned from Talk to Home. The breathing deep link opened the default setup without starting a practice; Back returned to Home. Privacy showed the current-conversation/sharing explanation with no inactive memory switch. This was an update and a warm launch, not a clean-install or process-cold-start check.
- [ ] Retest actual closed-app notification taps with the new direct destinations, including a previously scheduled payload. Automated mapping/navigation tests pass; earlier closed-app device checks used the preceding APK.
- [ ] Current release limits remain: clean-install and process-cold-start checks for this artifact, TalkBack, measured motion/frame rate, all breathing patterns, long chat pagination, real-device interrupted sends, and the earlier unexplained post-settings sign-out. During development-only font recreation, a duplicate-linking warning appeared; it was not visible in the standalone launch/navigation check.

### Sol reply suggestions and app wording (8 November)

This slice adds optional breathing/affirmation buttons to saved replies and revises existing screen copy. It keeps the established design and current-conversation scope. UIzze `ui-taste` replaces the previous web-focused `frontend-design` skill; `stop-slop` guides wording. Both are local skills; no paid reference service is connected.

- [x] Initial full `npm run verify` passed lint, formatting, typechecks and 235 tests (119 API, 102 mobile, 14 shared). Disposable PostgreSQL tests cover activity persistence, same-request retries, ownership and constraints. Mobile tests cover both activity routes, preserved drafts, return to the conversation and suppression during crisis, fallback, pending and unconfirmed sends.
- [x] Inspected live Groq responses and refined the v2 prompt to avoid stock openings. Final `npm run ai:eval` passed all 13 synthetic cases, including listening, declined activities, return after breathing and indirect crisis detection; it does not read or write app data. Provider-path replies took 0.38–11.78 seconds. HTTP 400 fallbacks occurred in an earlier run; the final run recovered six HTTP 429 rate limits within the existing bounded retry. Do not treat passing fixtures as complete crisis detection or a guarantee of prose quality.
- [x] Final full verification passed again after the prompt/evaluation changes; `npm run build` passed. Commit `80cda20` is in PR #14 with both GitHub Verify jobs green (including API build and Android export).
- [x] Local standalone ARM64 preview built successfully (Gradle 23m 23s): 50,948,794 bytes, SHA-256 `76a14030fa21e0f334dc6548d09f11b694ec09888e4572ae04fdeefd2194e412`. Certificate matches the existing development APK. Packaged JavaScript contains the Render URL and revised copy/activity label; the five configured backend secrets are absent. `adb install -r` returned Success and preserved the signed-in session.
- [x] Focused vivo V2168 / Android 14 / 1080×2400 / 100% text / night review: Home shows the revised copy and existing check-in; breathing setup shows the new heading without starting a session; introduction review shows Meet Sol; Skip opens privacy, whose deletion explanation and Done remain reachable by scrolling. Daily affirmation and empty Saved words copy fit; Android Back returned to Home. No chat, check-in, favorite or activity was submitted during this pass. Font scale remains 1.0 and notification settings were not changed. A concurrent screen change opened an account-deletion confirmation; Back dismissed it without deleting anything.
- [x] Saved and inspected before/after captures under `/tmp/solace-reply-qa/`, with source/artifact hashes in `visual-evidence.json`. The local evidence checker inspected 30 referenced files and reported incomplete coverage because the live suggestion flow below is pending. This is not a full native accessibility, motion or release pass.
- [x] PR #14 merged as `6949dd1` and the user confirmed Render deployment. `/ready` returned database connected; new breathing and affirmation replies include their saved activity buttons on the phone. New mobile builds accept older responses that omit the activity field.
- [x] On the deployed backend, both activity buttons opened their screens, returned with exact unsent drafts and persisted after reopening history. The failure path hid invitations. Successful live decline/retry and crisis suppression remain in the follow-up below; only labelled synthetic chats were used.
- [ ] Final release still needs consent-based cross-conversation memory if included, the Android settings sign-out investigation, fresh-install/auth/notification checks, TalkBack/performance coverage and a recorded demo. No new wellness modules are required for the hackathon scope.

### Chat bubbles, sending feedback and breathing guidance (8 November)

This slice gives Sol a day/night bubble and adds immediate outgoing-message feedback, moving thinking dots and short entrances for new messages. It preserves the existing sea-glass theme, draft handling and activity routes. The breathing prompt now describes Customize and the actual shared rhythm/duration choices instead of implying only the default session exists.

- [x] `npm run verify` passed lint, formatting, all workspace typechecks and 242 tests (119 API, 109 mobile, 14 shared). Behavioral checks cover an immediate outgoing bubble, one confirmed reply even during a slow history refresh, rapid double-send protection, failed-send draft retention, retry without a duplicate saved user message, one-time entrances, static urgent replies, off-screen cancellation and Reduce Motion. Both chat palettes meet the automated 4.5:1 text contrast check.
- [x] All 16 synthetic Groq evaluation cases passed, including changing the breathing rhythm, choosing five minutes, and a follow-up after an existing activity invitation. The replies named Customize and the supported controls without claiming to change settings. Several requests recovered from HTTP 429 within the existing retry budget. An earlier baseline returned HTTP 400 `json_validate_failed`; these passing cases do not establish perfect provider reliability. No app conversations were used by the evaluation. `npm run build` passed.
- [x] Standalone ARM64 preview built locally in 13m 33s, with exit code 0. Artifact: 50,956,910 bytes, SHA-256 `2247645364e714720900a4b0071f50aac27fabd3118704a6bba8c5d9ae3023ea`. Certificate matches the existing development APK; bundled Render URL and expected UI text are present; the five configured backend secrets are absent. `adb install -r` returned Success and the signed-in session survived.
- [x] On vivo V2168 / Android 14 / 1080×2400 / 100% text / night, sent separate labelled breathing and affirmation requests to Render. Each showed one outgoing bubble with Sending, Sol's thinking bubble and then one saved reply with the correct activity button. Keyboard-visible Send worked and the keyboard dismissed. Saved recordings and inspected transition frames show the new-message fade/lift and moving dots; no frame-rate or normal-speed-playback claim is made.
- [x] Opened the breathing invitation with a labelled unsent draft in the composer. The default setup opened without starting a practice. Hardware Back returned to the same conversation with the exact draft, and reopening from history retained the reply and its activity button. Cleared only that synthetic draft.
- [x] Opened the affirmation invitation from its labelled test conversation with an unsent draft. Today's words and Back to conversation displayed. Hardware Back restored the same chat and exact draft; no favorite or read action was submitted. Both activity buttons persisted after reopening history.
- [x] A real provider failure during the declined-activity test showed one saved user message, a fallback, no thinking state, no activity buttons and an enabled Retry. Retrying showed the pending state and kept one user message, but the provider returned another fallback. This verifies the failure UI, not successful live recovery. A separate synthetic declined-activity provider evaluation passed afterward in 760 ms; the Render failure cause is not yet established.
- [x] Briefly inspected the new bubbles, activity button and keyboard-visible composer at 130% native text. The user requested no further enlarged-text testing; restored font scale to 1.0. Also restored `transition_animation_scale` to its original 1.0 before further sends. No system Reduce Motion send was completed; automated static-state and cancellation checks pass.
- [ ] Complete successful live retry/decline and crisis-suppression checks. Day chat layout, TalkBack, measured performance and long offline chat remain broader release checks.
- [x] PR #15 merged as `d0be017`; the user reported Render deployed. On the installed APK, a labelled question about changing breathing received Customize, Coherent/Box/4–7–8 and the 1/3/5-minute choices. Saved and inspected `/tmp/solace-reply-qa/deployed-breathing-options.png`; this verifies live behavior beyond `/ready`.

Two labelled synthetic conversations were created during this pass (about 21:37 and 21:42) and retained; the latter contains the failed test turn for diagnosis. Existing conversations were preserved. No breathing completion, affirmation save/read, mood or reminder change was submitted. Wi-Fi and mobile data settings were only read and remain unchanged. The phone was left on Home, signed in, with text and animation settings restored.

The phone stayed visible in Linux's USB tree while ADB lost its debugging transport. Restarting ADB restored access temporarily; its alternate libusb backend also failed later. A software reset of this phone's USB interface restored access again without replugging or rebooting. USB debugging was already enabled, and the kernel reported no USB suspend or disconnect during the latter failures. Root cause remains unresolved; do not call this a proven cable fault or permanent fix. See `docs/setup/android-local.md` for recovery. The focused capture receipt records verified states separately from outstanding checks.

### Groq structured-reply recovery (8 November)

- [x] After the user changed USB ports, ADB found the vivo phone. Retried the saved labelled decline again after confirming the breathing guidance was live. It still returned fallback, with one saved user bubble and an enabled Retry. Captures: `/tmp/solace-reply-qa/deployed-retry-resume.png` and `deployed-retry-confirmed.png`. The phone was returned to Home; no settings or personal data were changed.
- [x] The user's Groq dashboard showed `400 json_validate_failed` alongside successful requests with the same key. A matched synthetic request reproduced 400/non-JSON output with plain assistant history and 200/validated output with structured assistant history. Corrected context serialization and added one bounded retry for that specific Groq error. The existing strict schema, output validation, activity suppression and crisis response remain enforced.
- [x] Five affected live synthetic scenarios passed with the fix: the exact declined-affirmation follow-up, declined breathing, after-breathing, customization follow-up and indirect crisis. Every case returned HTTP 200 on its first request in 0.305–1.104 seconds. These local provider checks do not establish deployed recovery or eliminate free-tier rate limits.
- [ ] Deploy the backend fix, then retry the retained labelled failed turn through Render. Confirm one normal replacement reply, no duplicate user message, no activity invitation after decline, and persistence after reopening. Complete the separate synthetic crisis-suppression check. The current APK is compatible; no rebuild is required.
