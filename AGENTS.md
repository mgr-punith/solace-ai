# AGENTS.md — Solace AI

Instructions for AI coding agents (Codex and similar) working in this repository.
Precedence: the user's direct instructions > this file > your defaults.
If something here is outdated or wrong (a library changed, a decision no longer fits), say so, propose a fix, and update this file in the same change.

---

## 1. Project in one paragraph

Solace AI is a mobile AI wellness companion: mood check-ins, an empathetic AI chat with memory, breathing exercises, affirmations, streaks and gentle reminders. It is a **hackathon prototype** for a founding-team job opportunity. Deliverables are an **Android APK + demo video** (TestFlight later). Judges look at UI/UX, working end-to-end flows, an API-driven backend, code quality, creativity and smart use of AI. Source code is not submitted, but winners keep building it, so write it as if a real team will inherit it.

Solace is a **companion, not a therapist or medical device**. Safety and privacy rules in sections 7 and 12 are non-negotiable.

## 2. Working agreement (how you behave)

You act as a **senior software engineer** pairing with the user.

**About the user.** They are new to React Native and Expo. Assume zero knowledge there. They have a Neon Postgres connection string and want a Node.js backend. Inspect the repo before assuming what already exists.

1. **Teach as you go.** The first time a React Native/Expo concept appears (dev build vs Expo Go, Metro, config plugins, EAS, safe areas, etc.), explain it in 2–3 plain sentences. Give exact commands, say what the user should see, and how to confirm it worked. Short, not lectures.
2. **Small vertical slices.** Each slice ends in a working, tested, committed state that the user can see on their phone or in an API call. No big-bang rewrites.
3. **Ask only when blocked.** Otherwise state your assumption in one line and proceed. Batch questions into one message.
4. **Never invent API or library details.** Check installed versions and official docs (Expo, React Native, Drizzle, Neon, Google). Do not pin versions from memory; use the current stable Expo SDK and `npx expo install` so versions stay compatible.
5. **Be honest about verification.** Say exactly what you ran (tests, typecheck, device) and what you could not verify. Never claim something works if you did not run it.
6. **Secrets.** Never commit, print or log secrets. If the user pastes a secret into chat (for example the Neon URL), tell them to rotate it if it could have leaked, and move it to `.env`.
7. **Stay in scope.** Do not add features, dependencies or refactors that were not asked for without saying why. Prefer boring, well-documented libraries.
8. **Do one thing extremely well** rather than everything badly (hackathon rule). Protect P0 scope (section 3).

### First-session kickoff protocol

1. Read this file and inspect the repo (`git status`, tree, `package.json` files).
2. Ask these in ONE message: operating system (Windows/Mac/Linux); phone (Android or iPhone) and whether USB debugging is possible; is there existing backend code; which LLM provider and API key the user has (Anthropic, OpenAI, Google or other); preferred backend host (Render, Railway, Fly.io or other); mascot name or idea; Node.js version installed.
3. Propose the Phase 0 plan (section 14); wait for the user’s explicit approval before starting.

## 3. Product scope

**User journey:** splash → onboarding (3–4 short screens: purpose, benefits, meet the companion, privacy and consent) → Google sign-in + short profile setup → home → main navigation.

**Priority tiers**

| Tier | Scope |
|---|---|
| **P0** (must work end-to-end, demo-critical) | Google auth; home with daily mood check-in; AI chat with persistence and history (view, continue, new, delete); reminders that fire when the app is closed, with tap-to-open deep links and preference management |
| **P1** | Breathing exercises; daily affirmations; streaks and weekly progress; AI personalization with consent and a "what Solace remembers" screen; AI-suggested activities that deep-link into features |
| **P2** | Wellness assessments, personalized plans, achievements, resources library |

Splash, onboarding and the design system are built early and polished throughout.

**Home** should feel personal: greeting by name and time of day, mood check-in card, today's affirmation, AI-suggested next step, quick activities, streak. Do not copy the reference video; improve on it.

**Reference video:** Codex cannot watch it. The user will drop screenshots, frames or written notes into `docs/reference/`. Ask for them when starting UI work.

**Suggested navigation:** bottom tabs — Home, Wellness, Talk (center), Progress, You, as specified in docs/design/DESIGN.md.

## 4. Tech stack (locked unless the user changes it)

| Area | Choice |
|---|---|
| Language | TypeScript, `strict: true`, everywhere. No `any` without a comment explaining why |
| Mobile | Expo (current stable SDK) + React Native, **Expo Router** (file-based routing) |
| Mobile builds | **Development builds via EAS locally on Linux**, not Expo Go. Google Sign-In and reliable notifications need native code that Expo Go does not include |
| Mobile state/data | TanStack Query (server state), Zustand (small client state) |
| Mobile UI libs | `react-native-reanimated` (animation), `expo-haptics`, `expo-linear-gradient`, `expo-font`, `expo-secure-store`, `expo-notifications`; Skia + Reanimated for Sol, with SVG + Reanimated fallback (validate in Phase 2 per DESIGN.md) |
| Backend | Node.js LTS, Express (current major), TypeScript, Zod validation, Pino logging |
| Database | Neon PostgreSQL via `pg` Pool; **Drizzle ORM + drizzle-kit migrations** |
| Auth | Google Sign-In on device → ID token → backend verifies → backend issues its own JWT access token + rotating refresh token |
| AI | Provider-agnostic `LLMProvider` interface in the backend; keys live only on the server |
| Tests | Vitest + Supertest (api, shared); `jest-expo` + React Native Testing Library (mobile) |
| Quality | ESLint, Prettier, `tsc --noEmit`, GitHub Actions CI |
| Package manager | npm workspaces (avoid pnpm/yarn quirks with Metro) |

Neon notes: use the **pooled** connection string (host contains `-pooler`) for the running API, and the **direct** (unpooled) string for migrations. Use one Neon branch for the app, as requested by the user on 6 November 2026. Automated tests start disposable local PostgreSQL through Vitest; they must never load the app database credentials or fall back to Neon. Podman/Docker is required for the tests, not a second hosted branch.

### Repository layout

```
solace/
  AGENTS.md  README.md  .env.example
  docs/            PRODUCT_BRIEF.md, design/DESIGN.md, decisions/ (ADRs), setup/, reference/, qa-checklist.md
  apps/
    mobile/        Expo app
      src/
        app/       routes only, thin (Expo Router): (auth) (onboarding) (tabs) chat/[id] ...
        features/  auth, home, mood, chat, breathing, affirmations, reminders, progress, profile
                   each: components/ hooks/ api.ts store.ts __tests__/
        components/ui/   design-system primitives
        theme/     design tokens (colors, type, spacing, radii, motion)
        lib/       api client, secure storage, haptics, notifications
    api/
      src/
        config/    env.ts (Zod-validated; fail fast at boot)
        db/        schema/, migrations/, client.ts
        modules/   auth, users, mood, conversations, messages, reminders, activities, memory
                   each: routes, controller, service, repository, schemas, *.test.ts
        ai/        provider.ts, adapters/, prompts/, safety/, context/
        middleware/ auth, error-handler, rate-limit, request-id
        app.ts (builds the app, no listen)  server.ts (listens)
  packages/shared/  Zod schemas + types for the API contract (fall back to duplicated types
                    only if Metro resolution fights us; record the decision in an ADR)
```

## 5. Engineering standards

### Backend
- **Layering:** routes → controller (thin: parse, call service, respond) → service (business rules) → repository (SQL only). Inject dependencies (DB, LLM provider, clock) so everything is testable without network.
- **API:** REST under `/v1`, resource-oriented, correct status codes, Zod validation on every input, cursor pagination for lists. One error envelope: `{ "error": { "code": "STRING_CODE", "message": "human text", "details"?: ... } }`. Request ID on every request and log line. `GET /health` (liveness) and `GET /ready` (checks DB).
- **Database:** schema changes only through migrations (never hand-edit). UUID primary keys, `created_at`/`updated_at` as `timestamptz` (UTC), foreign keys with intentional `ON DELETE` behavior, indexes for real query patterns (e.g. `messages(conversation_id, created_at)`). Seed data for dev only.
- **Security:** `helmet`, strict CORS, per-user and per-IP rate limits (tighter on AI and auth routes), body size limits, refresh tokens stored **hashed** and rotated on use, constant-time comparisons for secrets, no stack traces to clients, no PII or message content in logs. Every query filters by the authenticated user's id (authorization is tested, not assumed).
- **Resilience:** timeouts and bounded retries with backoff on LLM calls, graceful fallback message when the LLM is down, graceful shutdown (drain, close pool).

### Mobile
- Screens in `src/app/` stay thin; logic lives in `src/features/*` hooks and services.
- **Theme tokens only**: no hard-coded colors, font sizes or spacing in screens.
- Every screen has **loading, error and empty states**. Network failures are handled and recoverable; never a blank screen or a raw error.
- Chat uses a virtualized list. Animate with Reanimated on the UI thread. Avoid re-render storms (memoize list items, narrow Zustand selectors).
- Accessibility floor: contrast ≥ 4.5:1, touch targets ≥ 44pt, screen-reader labels, support dynamic text size, honor **Reduce Motion** with a calm static alternative.
- Haptics go through one wrapper (`lib/haptics.ts`) so they can be toggled in settings.
- Tokens (access/refresh) live in `expo-secure-store`, never AsyncStorage.

### Testing (required, not optional)
- **Write tests with the code, in the same commit.** Use TDD for pure logic where it pays: streak calculation, reminder reconciliation, context assembly, crisis detection, mood aggregation, token handling.
- **API:** integration tests with Supertest against disposable PostgreSQL started by Vitest (migrate before the run; remove the container after success or failure). Cover auth, authorization (user A cannot read user B's data), validation errors, pagination, delete cascades.
- **LLM:** always mocked in automated tests via the `LLMProvider` interface. Add a **safety regression suite**: a list of crisis phrases that must trigger the crisis path, and benign phrases that must not.
- **Mobile:** component/hook tests for critical flows (auth state, mood check-in, chat send/retry, reminder settings). Mock native modules (`expo-notifications`, Google Sign-In).
- **Manual QA:** maintain `docs/qa-checklist.md` for what automation cannot cover (notification fires with app closed, deep link on tap, Google sign-in on a real device, release APK smoke test).
- Do not chase coverage percentages; critical modules should be thoroughly covered, with meaningful assertions.
- **`npm run verify` = lint + typecheck + tests across all workspaces.** It must pass before every commit and in CI.

### Git and docs
- Small commits, **Conventional Commits** (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`), a branch per slice (`feat/auth-google`), never force-push `main`.
- Keep `README.md` runnable from scratch (clone → env → install → migrate → run). Keep `.env.example` complete. Record significant decisions as short ADRs in `docs/decisions/`.

## 6. Data model (starting point; refine via migrations)

`users` (google_sub unique, email, name, avatar_url) · `refresh_tokens` (hashed, expires, revoked, replaced_by) · `profiles` (display_name, timezone, goals, personalization_enabled, onboarding_completed) · `mood_checkins` (mood 1–5, emotion tags[], note, created_at) · `conversations` (title, last_message_at, summary) · `messages` (role, content, metadata jsonb e.g. suggested activity, safety flags) · `memories` (user-visible facts the companion remembers, source, created_at) · `reminders` (type, enabled, time, days_of_week, custom_text) · `activity_logs` (type: breathing | affirmation | reflection | challenge, duration, completed_at) · `affirmations` (curated content, optional) · `device_tokens` (reserved for later server push).

Store the user's **timezone** and compute day boundaries and streaks in that timezone, not UTC.

## 7. AI companion specification

**Persona.** Warm, plain-spoken, curious, steady. Short messages, usually one gentle question at a time. It reflects what the person said before suggesting anything. It avoids clichés and toxic positivity ("everything happens for a reason", "just think positive"), never diagnoses, never gives medication or medical advice, and never claims to be human or a therapist. Ask the user to name the mascot; keep persona text in `ai/prompts/` as versioned files.

**Request pipeline (per user message)**
1. Authorize and persist the user message.
2. **Safety pre-check** (deterministic patterns, then LLM-side instruction). See crisis protocol below.
3. **Assemble context** within a token budget: system prompt → profile and preferences → recent mood check-ins → memories (only if `personalization_enabled`) → conversation summary → last N messages.
4. Call the LLM through `LLMProvider`. Ship non-streaming first; add streaming once chat is solid (check Expo docs for streaming-capable `fetch` support before relying on it).
5. Parse optional **structured suggestions** (breathing, reflection, affirmation, small challenge) and render them as tappable chips that deep-link into the matching feature.
6. Persist the assistant message. When a conversation passes a length threshold, update its summary and extract memories in the background.

**Consent and control.** Personalization is opt-in with a plain-language explanation during onboarding and a toggle in settings. A "What Solace remembers" screen lets users view and delete individual memories. Deleting a conversation deletes its messages and derived summaries. Account deletion removes everything (hard delete). Offer data export if time allows.

**Crisis protocol.** If the user expresses intent to harm themselves, suicidal thoughts or acute danger: respond with warmth and without judgment, encourage reaching a trusted person or local emergency services, and show region-appropriate helplines from **configuration, not hard-coded prose** (for example Tele-MANAS 14416 in India, 988 in the US; **verify every number before release**). Do not switch into "tips" mode, do not lecture, do not end the conversation. Log only a minimal, content-free flag. Include a clear "Solace is not a substitute for professional care" notice in onboarding and settings.

**Cost and abuse controls.** Max message length, per-user rate limits, token budgets, timeouts, and a friendly fallback when the provider fails.

**Evaluation.** Add `scripts/ai-eval` with a small set of scenarios (anxious, sad, angry, lonely, crisis, off-topic, prompt-injection attempts) so prompt changes can be eyeballed and regressions caught.

## 8. Notifications and reminders specification

- Use `expo-notifications` with **local scheduled notifications** for recurring reminders. They fire when the app is backgrounded or closed and need no server. Server push is a later enhancement.
- Types: mood check-in, affirmation, breathing, self-care, custom. Per type: enabled, time(s), days of week. Add quiet hours.
- Preferences are saved locally **and** synced to the backend (`reminders`) so they survive reinstalls and new devices. On login and on app start run an **idempotent reconciler**: cancel all scheduled notifications → reschedule from current preferences. Unit-test the reconciler with a mocked notifications module.
- **Permissions:** ask in context with a short explanation screen, not on first launch. Handle Android 13+ runtime permission and create an Android notification channel.
- **Tap handling:** every notification carries `data: { route: "/..." }`. Handle three cases: app in foreground/background, app cold-started from the notification (read the last notification response), and user not signed in (store the target route and navigate after login).
- Copy is gentle and never guilt-tripping or streak-shaming. Rotate affirmation text.
- Use inexact daily triggers; OEM battery optimizations on some Android phones can delay delivery. Note this in the QA checklist, and test on a real device.

## 9. Wellness features specification

- **Mood check-in:** 5-point scale + optional emotion tags + optional note; feeds Home, Progress and the AI context.
- **Breathing:** animated orb, haptic pacing, patterns (box, 4-7-8, coherent breathing), adjustable duration, logs a session on completion. This is a candidate for the app's signature moment.
- **Affirmations:** daily curated pick, optional AI-personalized variant, favorites.
- **Streaks and progress:** count days with at least one wellness action in the user's timezone. Unit-test midnight boundaries, DST changes and timezone travel. Missed days produce a warm "welcome back", never a penalty. Weekly mood chart.
- **Assessments (P2):** only validated, publicly usable instruments, worded carefully, never presented as a diagnosis.

## 10. Design system and UX

- **Before any UI code**, write `docs/design/DESIGN.md`: a compact token set (4–6 named hex colors, typefaces and roles, type scale, spacing scale, radii, elevation, motion durations and easings), the mascot concept, a screen map, and one ASCII wireframe per key screen. Review it against the brief and revise any part that reads like a generic default.
- Feel: **calm, loving, modern**. Low-saturation palette, generous spacing, slow easing (≈300–600 ms), soft haptics, no alarming reds for errors. Support dark mode through tokens.
- Avoid templated looks: cream background with a terracotta accent, identical rounded cards with identical shadows, decorative gradient washes, tracked-out ALL-CAPS labels above every heading, one-word-accented headlines. Choose type deliberately (one or two families via `expo-font`).
- **Spend boldness in one place:** the companion character and the breathing experience. Keep everything around them quiet and consistent. Motion should answer user actions; avoid ambient animation everywhere.
- **Microcopy:** write from the user's point of view, plain verbs, sentence case, active voice. Buttons say exactly what happens ("Save check-in", not "Submit"). Errors say what went wrong and what to do, without over-apologizing. Empty states invite an action.

## 11. Authentication: Google Sign-In (guided)

### Architecture
1. App shows a native Google button → Google returns an **ID token** (JWT).
2. App sends it to `POST /v1/auth/google`.
3. Backend verifies signature, expiry and **audience = our Web client ID** with `google-auth-library`, checks `email_verified`, and upserts the user by Google `sub` (never by email).
4. Backend returns a short-lived access token (≈15 min) and a rotating refresh token (stored hashed). The app keeps both in `expo-secure-store`.
5. Endpoints: `POST /v1/auth/google`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/me`, `DELETE /v1/me`.

Library: use `@react-native-google-signin/google-signin` with its Expo config plugin (the alternative `react-native-nitro-google-signin` is also listed in Expo's guide). It **cannot run in Expo Go**, so a development build is required. **Before implementing, read** https://docs.expo.dev/guides/google-authentication/ and the library's Expo setup page, and follow the current instructions over anything written here.

### GUIDED SETUP PROTOCOL — follow when you reach this slice
The user has never done this. **Walk them through one step at a time. Wait for confirmation (and for the values you need) before giving the next step. Do not dump the whole list.** Console menus change, so describe what to look for and verify against current Google docs.

**Step A — Fix app identifiers first.** Choose and set `android.package` and `ios.bundleIdentifier` in `app.json` (for example `com.<yourname>.solace`). OAuth clients are tied to these, so changing them later means redoing the setup.

**Step B — Google Cloud project and consent screen.**
- Open Google Cloud Console → create project "Solace AI".
- Go to Google Auth Platform (formerly "OAuth consent screen") → set app name, support email, audience **External**, developer contact email.
- Keep it in **Testing** and add the user's Google account(s) and any teammates' accounts as **test users** (only listed accounts can sign in while in Testing). Basic sign-in scopes (`openid`, `email`, `profile`) are non-sensitive, but confirm the current publishing rules in the console before the demo.

**Step C — Create OAuth client IDs** (Google Auth Platform → Clients → Create client).
1. **Web application** → copy the Client ID. This is `GOOGLE_WEB_CLIENT_ID`: the app passes it as `webClientId` so Google returns an ID token, and the backend uses it as the expected audience. (Not a secret, but still keep it in env config.)
2. **Android** → package name from Step A + the **SHA-1** of the keystore that signs the build. Get it from EAS with `eas credentials` (Android → choose the profile → Keystore). Each keystore that signs a build you use needs its SHA-1 registered, so register the development build's and later the APK (preview/release) build's.
3. **iOS** → bundle identifier from Step A. Can wait until TestFlight work, but the iOS URL scheme is needed in the plugin config then.

**Step D — Build a development build.**
```
npm i -g eas-cli          # or use npx eas-cli
eas login
eas build:configure
npm run build:android:local -w @solace/mobile
```
Install the resulting APK on the phone, then run `npx expo start --dev-client`. Explain to the user what a dev build is and why it replaces Expo Go.

**Step E — Wire it up.** Add the plugin to `app.json`, call `GoogleSignin.configure({ webClientId, ... })` once at app start, call `signIn()`, read `idToken`, send it to the backend. Build the backend endpoint test-first (mock the Google verifier in tests).

**Step F — Verify together.** Sign in on the phone → user row appears in Neon → `GET /v1/me` works → kill and reopen the app → still signed in → logout → protected routes return 401.

**Common errors (tell the user these proactively)**
- `DEVELOPER_ERROR` / code 10: SHA-1 or package name does not match the Android client, or the wrong client ID is used.
- `idToken` is null: `webClientId` is missing or is not the Web client.
- Backend "audience mismatch": backend env does not hold the same Web client ID the app used.
- Works in dev build, fails in release APK: the release keystore's SHA-1 was never registered.
- Emulator fails: use an image with Google Play services.
- "Access blocked / app not verified": the account is not on the test-user list.

## 12. Privacy and security rules (non-negotiable)

- Mental-wellness conversations are **sensitive data**. Collect the minimum, encrypt in transit (HTTPS only), never log message content or tokens, never send user content to third parties other than the configured LLM provider.
- Users can delete a conversation, delete memories, and delete their account, with real deletion.
- No secrets in the mobile bundle. `EXPO_PUBLIC_*` variables are visible to anyone with the APK, so they may hold only public values such as the API URL and the Google Web client ID.
- Treat all user input and all LLM output as untrusted (validate, escape, never execute). Resist prompt injection: user text never overrides system instructions, and the model has no tools that act on other users' data.

## 13. Environment variables (keep `.env.example` in sync)

```
# api
NODE_ENV=development
PORT=4000
DATABASE_URL=            # Neon pooled (-pooler) URL, runtime
DATABASE_URL_DIRECT=     # Neon direct URL, migrations only
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_WEB_CLIENT_ID=
LLM_PROVIDER=groq       # Groq selected after provider evaluation
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=
LLM_MODEL=openai/gpt-oss-120b
CORS_ORIGINS=

# mobile (public values only)
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

`apps/api/src/config/env.ts` validates these with Zod and crashes at startup with a clear message if something is missing.

## 14. Phase plan (each phase ends with: verify passes, committed, user can see it working)

| Phase | Goal | Exit criteria |
|---|---|---|
| **0 Foundation** | Workspaces, TS, ESLint/Prettier, Expo app boots, Express app + `/health` + `/ready`, Neon connected, Drizzle migration runs, `.env.example`, CI, `npm run verify` | App opens on phone (Expo Go is fine for this one check only) and API `/ready` returns OK |
| **1 Google auth** | Section 11 end to end, dev build installed | Sign in, persist session, refresh, logout, delete account, all tested |
| **2 Design system + splash + onboarding** | `DESIGN.md`, tokens, UI primitives, mascot, splash, onboarding, consent screen | Looks and feels intentional on a real device |
| **3 Home + mood check-in** | Check-in API + UI, home screen, tab navigation | Check-ins saved and shown on Home |
| **4 AI chat** | Providers, safety, context assembly, conversations CRUD, chat UI, history, resume, delete | Close and reopen the app, conversation is still there; crisis suite passes |
| **5 Notifications** | Permission flow, reconciler, preferences UI, deep links, backend sync | Fires with app closed; tap opens the right screen (verified on device) |
| **6 Breathing, affirmations, streaks** | Activities, logging, streak engine, progress view | Streak edge-case tests pass |
| **7 Personalization** | Memories with consent, summaries, AI-suggested activity chips | User can see and delete memories; AI uses them only when enabled |
| **8 Ship** | Deploy API, preview APK, QA pass, demo script | See section 15 |

Reorder if the user says so, but never leave P0 half-done to start P1.

## 15. Deployment and release

- The backend **must be publicly reachable over HTTPS**; an APK on a phone cannot reach `localhost`. Deploy to the host the user chooses (Render, Railway or Fly.io), set env vars there, run migrations on deploy, configure a health check. Free tiers may cold-start: warm the server before recording the demo.
- Phone testing uses the Render-hosted HTTPS backend only, as confirmed by the user on 6 November 2026. Do not switch the app to a local API or tunnel. Local Android builds and Wi-Fi Metro remain the development workflow; automated API tests use disposable local PostgreSQL without Neon credentials.
- `eas.json` profiles: `development` (dev client), `preview` (`"android": { "buildType": "apk" }`, internal distribution) for the submission APK, `production` later. Register each keystore's SHA-1 in the Google Android client.
- iOS/TestFlight comes later: needs an Apple Developer account, an EAS iOS build and `eas submit`. The hackathon team has offered help.
- **Release checklist:** `npm run verify` green · API deployed and `/ready` OK · fresh install of the preview APK on a clean phone · sign-in works · chat persists across restarts · reminder fires with the app closed · tapping it opens the right screen · airplane-mode error states look good · no secrets in the bundle.
- **Demo video script:** splash → onboarding → Google sign-in → home → mood check-in → chat (including memory and a suggested activity) → breathing → reminder firing on the lock screen → tap to open → history and delete.

## 16. The loop for every task

1. Restate the goal with 3–5 acceptance criteria.
2. Inspect existing code; reuse before adding.
3. Write failing tests for logic (TDD where it pays).
4. Implement the smallest slice that meets the criteria.
5. Run `npm run verify`. Fix everything, not just your own failures.
6. If UI changed, tell the user exactly what to tap and what they should see.
7. Commit with a Conventional Commit message.
8. Report briefly: what changed, how it was verified, risks or follow-ups, and the proposed next step.

## 17. Commands (create in Phase 0 and keep accurate)

```
npm run dev:api        # start API with reload
npm run dev:mobile     # expo start --dev-client
npm run verify         # lint + typecheck + test (all workspaces)
npm run lint | typecheck | test
npm run db:generate    # drizzle-kit generate (new migration from schema changes)
npm run db:migrate     # apply migrations
npm run db:studio      # inspect data
npm run db:check       # verify configured DB connections without printing credentials
```

## 18. Never do

- Commit `.env`, tokens, keystores or credentials.
- Edit the database by hand or skip migrations.
- Put an LLM or database key in the mobile app.
- Hard-code colors, spacing or helpline numbers inside components.
- Merge failing tests, skipped tests without a reason, or `// @ts-ignore` without a comment.
- Add a dependency without checking it is maintained and compatible with the current Expo SDK.
- Ship a screen without loading, error and empty states.
- Present the companion as a human, a therapist, or a source of medical advice.
- Claim "done" without running the verification above.

## Confirmed kickoff decisions

- Work on this Linux machine; Android phone with USB debugging; start from scratch.
- Host on Render; database on Neon; keep the companion name Sol.
- AI provider updated 6 November 2026: `groq`, base URL `https://api.groq.com/openai/v1`, model `openai/gpt-oss-120b` with low reasoning effort and final text only. The user saved the key privately; six synthetic provider cases passed in 0.3–1.1 seconds. Enable Zero Data Retention in Groq Data Controls. VyceAi remains supported explicitly; no automatic cross-provider fallback. Verify Render and the phone after deployment.
- Progress phase by phase without deadline assumptions. Phase 0 was explicitly approved.
- Validate only configuration required by the current phase. Google and AI credentials are now mandatory for the Phase 4 API.

- Build preference confirmed 6 November 2026: use local builds for all Android work, including development and submission APKs. Install updates on the connected Android phone with `adb install -r`; preserve app data and the existing Google-registered signing certificate. See `docs/setup/android-local.md`. EAS may retrieve signing credentials, but compilation runs locally.

- Backend testing preference confirmed 6 November 2026: all installed-app testing uses Render; do not start a local API/tunnel for the phone. Push and deploy backend changes before checking those flows on the device.

- Database preference confirmed 6 November 2026: maintain one Neon branch for this assignment. API tests run real migrations and queries in an automatic disposable PostgreSQL container; no `DATABASE_URL_TEST` is required locally, on Render, or in GitHub Actions. See `docs/decisions/0005-single-neon-branch.md`.
