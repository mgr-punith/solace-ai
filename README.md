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

Google and AI keys are not needed for Phase 0. `CORS_ORIGINS` is a comma-separated allowlist for browser clients; native Android requests need no origin entry.

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

See [Android setup](docs/setup/android.md). The app uses a development build, your own installable test version of Solace. EAS builds it in the cloud; Metro serves JavaScript changes from the computer.

Use an HTTPS tunnel to the local API and put its address in `apps/mobile/.env` as `EXPO_PUBLIC_API_URL`. The phone's `localhost` is the phone itself. No private keys or database URLs belong in `EXPO_PUBLIC_*` variables.

```sh
npm run dev:mobile
```

Open the installed development app and connect to Metro. The temporary foundation screen has a “Check connection” button. Once the API and Neon are available it shows “Connected. Solace is ready.”

## Checks and database changes

```sh
npm run verify       # formatting, lint, types, all workspace tests
npm run build        # compile shared contracts and API
npm run db:generate  # generate a migration after a schema change
npm run db:migrate   # apply generated migrations to development
npm run db:studio    # development database viewer; schema changes use migrations
```

Tests migrate the separate test branch before running and roll back test data. They fail if its connection is missing or points to the development endpoint. Do not use production data for tests.

GitHub Actions needs a `DATABASE_URL_TEST` repository secret pointing to a dedicated Neon CI branch. Its development URLs are synthetic values used only by the isolation guard; CI never connects to the development database. Fork PRs do not receive secrets and therefore cannot run the integration job without a trusted workflow arrangement. Never expose database secrets to untrusted PR code.

## Structure

- `apps/mobile/src/app`: thin Expo Router routes.
- `apps/mobile/src/features`: feature UI, API calls, and tests.
- `apps/api/src`: Express application, configuration, migrations, and modules.
- `packages/shared`: Zod response schemas and TypeScript types.
- `docs/design/DESIGN.md`: proposed visual direction and Phase 2 approval gate.
- `docs/decisions`: architecture choices.
- `docs/qa-checklist.md`: device checks that automation cannot replace.

Render is the selected hosting target; deployment is a later phase. See [foundation decisions](docs/decisions/0001-foundation.md).
