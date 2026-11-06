# Solace AI

An Android-first wellness companion built with Expo, React Native, Express, and Neon. Phase 0 creates the foundation; product features follow in small verified slices.

## Prerequisites

- Node 24.20.0 and npm 11 (see `.node-version` / `.nvmrc`).
- One Neon branch for the Render-hosted app.
- Podman or Docker running for automated API tests (already installed on this Linux machine).
- An Expo account and Android phone for the development build.

## Install and configure

After cloning this repository, run from its root:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

On an existing checkout, keep your saved `.env` files instead of overwriting them.

In `apps/api/.env`, fill `DATABASE_URL` with your single Neon branch's pooled URL and `DATABASE_URL_DIRECT` with the same branch's direct URL. No `DATABASE_URL_TEST` is required. Copy URLs from Neon's Connect dialog with SSL enabled. Never paste credentials into chat, commit them, or place them in mobile configuration.

Google authentication requires `GOOGLE_WEB_CLIENT_ID` and different random values of at least 32 characters for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. Chat requires `LLM_PROVIDER=vyceai`, `LLM_BASE_URL=https://vyceai.com/v1`, `LLM_API_KEY`, and the model ID in `LLM_MODEL`. `CORS_ORIGINS` is a comma-separated allowlist for browser clients; native Android requests need no origin entry.

```sh
npm run db:check
npm run db:migrate
npm run dev:api
```

The API listens on port 4000. From another terminal:

```sh
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Expected responses: `{"status":"ok"}` and `{"status":"ok","database":"connected"}`. A database failure returns HTTP 503 with a safe error message.

## Run on Android

See [Android setup](docs/setup/android.md). The app uses a development build, your own installable test version of Solace. EAS compiles it locally on this Linux machine; Metro serves JavaScript changes from the computer. Follow [local Android setup](docs/setup/android-local.md) and run `npm run build:android:local -w @solace/mobile`.

The installed app always uses the API hosted at `https://solace-ai-n8s4.onrender.com`, including during local Android development. Do not point the app at a local API or tunnel. Merge backend changes to `main` and wait for Render deployment before testing new endpoints on the phone. Set this as `EXPO_PUBLIC_API_URL` and set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the same public Web OAuth client ID as the API. EAS profiles include these public values so ignored local environment files are not required for a cloud build. No private keys or database URLs belong in `EXPO_PUBLIC_*` variables.

```sh
npm run dev:mobile
```

Rebuild the development APK after installing Google Sign-In and SecureStore, then connect it to Metro. First launch shows four introduction pages. “Skip intro” still opens privacy; saving continues to sign-in. You can replay the introduction and change the device-local memory preference from your account screen. Memory is not active yet; backend consent and memory controls follow in Phase 7.

The sign-in screen opens Google's native account picker; a successful sign-in shows your name. Tokens are saved in SecureStore and restored on relaunch. The foundation connection screen remains at `/connection`.

Auth endpoints: `POST /v1/auth/google`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/me`, and `DELETE /v1/me`. Protected requests use `Authorization: Bearer <access-token>`. Refresh tokens rotate once, replay revokes their session, and logout invalidates access immediately. See [authentication setup](docs/setup/google-auth.md).

## Checks and database changes

```sh
npm run verify       # formatting, lint, types, all workspace tests
npm run build        # compile shared contracts and API
npm run db:generate  # generate a migration after a schema change
npm run db:migrate   # apply generated migrations to development
npm run db:studio    # development database viewer; schema changes use migrations
```

API tests automatically start an official PostgreSQL 17 container, apply the real migrations and exercise the SQL repositories. The container uses temporary storage, a random local port and credentials, and is removed after the run, including test failures. The first run downloads `postgres:17-alpine`; later runs reuse the image. Tests use only the container settings supplied by Vitest and never read your Neon URLs. If neither Podman nor Docker is running, verification fails with setup instructions rather than skipping tests.

GitHub Actions uses the same temporary container and needs no database secrets or Neon test branch. `DATABASE_URL_TEST` is unused and can be removed from old local/Render/GitHub configuration. Keep `npm run db:check` and real-device checks against Render to verify Neon connectivity; local PostgreSQL does not reproduce hosted TLS/network behavior. See [single Neon branch testing](docs/decisions/0005-single-neon-branch.md).

## Structure

- `apps/mobile/src/app`: thin Expo Router routes.
- `apps/mobile/src/features`: feature UI, API calls, and tests.
- `apps/api/src`: Express application, configuration, migrations, and modules.
- `packages/shared`: Zod response schemas and TypeScript types.
- `docs/design/DESIGN.md`: proposed visual direction and Phase 2 approval gate.
- `docs/decisions`: architecture choices.
- `docs/qa-checklist.md`: device checks that automation cannot replace.

Render hosts the foundation API. Set `TRUST_PROXY=1` there and add the auth environment values before deploying the auth slice. The start command applies migrations before starting the API. See [foundation decisions](docs/decisions/0001-foundation.md).

## Phase 2 design preview

In the updated development app, tap **Meet Sol · Preview** from the signed-in screen. Tap Sol, choose a mood, try a slow breath, then scroll to the sky and motion controls. The preview does not save check-ins. Splash and onboarding follow the phone design review.

For browser review only, run `npm run setup:web -w @solace/mobile` before opening `/design-preview` through Metro. This serves the matching CanvasKit file locally. Repeat setup after upgrading Skia; the generated WASM file is ignored. Android does not use this file.

## Home and mood check-ins

Phase 3 adds Home, Progress and You tabs. Choose a mood, optionally add up to five emotion tags and a 500-character note, then tap **Save check-in**. Saved entries appear on Home and in Progress; deletion removes the mood, tags and note. Other planned tabs appear when their features are implemented.

The API exposes `POST /v1/mood-checkins`, `GET /v1/mood-checkins`, `GET /v1/mood-checkins/:id` and `DELETE /v1/mood-checkins/:id`. Requests require the current access token and only access the caller’s entries. Creation accepts `requestId`, `mood` (1–5), `tags`, `note`, and an IANA `timezone`. Reusing a request ID with identical input returns the existing check-in; different input returns 409. Lists support `limit` (1–30), `cursor`, and `period=today&timezone=Asia/Kolkata`. New records update the profile timezone. Account deletion cascades mood and profile rows.

Failed saves keep their input while the form stays mounted and retry the same request ID. Unsaved drafts are not persisted across app termination. Query data stays in memory, is scoped to the signed-in account, and clears on logout. Notes and tokens are not written to logs or unencrypted disk caches.

Render’s existing start command applies the checked-in Drizzle migration before serving. The app cannot verify new mood flows against an older Render deployment; finish deployment before the phone QA pass.

## AI chat

Talk opens saved conversations. Choose **New conversation**, type a message and tap **Send message**. Sol replies using VyceAi; close and reopen to continue. Retries reuse the saved turn, and deleting a conversation removes its messages. **Support** opens verified region-specific helplines even offline, with an explicit dialer action. Sol is a companion, not professional care.

Before merging the chat feature, set the four `LLM_*` values above in Render's environment. Copy the key privately from `apps/api/.env`; never put it in a PR, screenshot, mobile variable or log. The API now fails at startup if the key/model are missing. Render's normal start command applies the conversation migration. Check `/ready` and that an unauthenticated `/v1/conversations` returns 401 before phone QA.

Chat endpoints: `POST/GET /v1/conversations`, `GET/DELETE /v1/conversations/:id`, and `GET/POST /v1/conversations/:id/messages`. Creation requires a `requestId`; sending requires a `requestId` and `content` (1–2,000 characters). Lists use cursor pagination. Replies are non-streaming, bounded and saved. See [chat decisions](docs/decisions/0006-persistent-chat.md).

Run `npm run ai:eval` only when you want a manual evaluation against the real configured provider; it may incur provider usage. Its scenarios are synthetic, and the command prints their responses for review. Automated tests always mock the model. Memory across conversations, mood context and summaries remain deferred to Phase 7 consent controls.
