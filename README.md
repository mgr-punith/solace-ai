# Solace AI

An Android-first wellness companion built with Expo, React Native, Express, and Neon. Phase 0 creates the foundation; product features follow in small verified slices.

## Prerequisites

- Node 24.20.0 and npm 11 (see `.node-version` / `.nvmrc`).
- A Neon development branch and a separate test branch.
- An Expo account and Android phone for the development build.

## Install and configure

After cloning this repository, run from its root:

```sh
npm ci
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

On an existing checkout, keep your saved `.env` files instead of overwriting them.

In `apps/api/.env`, fill `DATABASE_URL` with the development branch's pooled URL, `DATABASE_URL_DIRECT` with its direct URL, and `DATABASE_URL_TEST` with the separate test branch's direct URL. Copy URLs from Neon's Connect dialog with SSL enabled. Never paste credentials into chat, commit them, or place them in mobile configuration.

Google authentication requires `GOOGLE_WEB_CLIENT_ID` and different random values of at least 32 characters for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. AI keys remain optional until Phase 4. `CORS_ORIGINS` is a comma-separated allowlist for browser clients; native Android requests need no origin entry.

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

The API is hosted at `https://solace-ai-n8s4.onrender.com`. Set this as `EXPO_PUBLIC_API_URL` and set `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` to the same public Web OAuth client ID as the API. EAS profiles include these public values so ignored local environment files are not required for a cloud build. No private keys or database URLs belong in `EXPO_PUBLIC_*` variables.

```sh
npm run dev:mobile
```

Rebuild the development APK after installing Google Sign-In and SecureStore, then connect it to Metro. The sign-in screen opens Google's native account picker; a successful sign-in shows your name. Tokens are saved in SecureStore and restored on relaunch. The foundation connection screen remains at `/connection`.

Auth endpoints: `POST /v1/auth/google`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/me`, and `DELETE /v1/me`. Protected requests use `Authorization: Bearer <access-token>`. Refresh tokens rotate once, replay revokes their session, and logout invalidates access immediately. See [authentication setup](docs/setup/google-auth.md).

## Checks and database changes

```sh
npm run verify       # formatting, lint, types, all workspace tests
npm run build        # compile shared contracts and API
npm run db:generate  # generate a migration after a schema change
npm run db:migrate   # apply generated migrations to development
npm run db:studio    # development database viewer; schema changes use migrations
```

Tests migrate the separate test branch before running and roll back or remove their own test data. They fail if its connection is missing or points to the development endpoint. Do not use production data for tests.

GitHub Actions needs a `DATABASE_URL_TEST` repository secret pointing to a dedicated Neon CI branch. Its development URLs are synthetic values used only by the isolation guard; CI never connects to the development database. Fork PRs do not receive secrets and therefore cannot run the integration job without a trusted workflow arrangement. Never expose database secrets to untrusted PR code.

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
