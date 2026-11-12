# Developing Solace

Solace is [Punith Moger's personal project](../README.md), released under the [MIT license](../LICENSE). This guide covers running, testing, and building the source. To try the published Android app, use the [user guide](../README.md#user-guide).

## Prerequisites

- Node **24.20.0** from `.node-version` / `.nvmrc`, and npm **11**. The repository records npm 11.19.0.
- Podman or Docker with permission to start local containers for API tests.
- For a running API: a Neon PostgreSQL database, a Google Web OAuth client, and a Groq API key.
- For Android builds: Linux or macOS, an Expo account, a JDK, the Android SDK, and an Android phone with Google Play services. The existing local wrapper was developed on Linux.

Install from the repository root with `npm ci`. The lockfile keeps the workspace dependencies aligned. Use `npx expo install <package>` inside `apps/mobile` for native dependencies, and check the documentation for the installed Expo SDK before changing native APIs.

## Check the source without app credentials

```sh
npm run verify
npm run build
```

`verify` runs ESLint, Prettier, TypeScript, and tests across all three workspaces. Vitest starts an official PostgreSQL 17 container, migrates it, and removes it after the API tests, including failures. The first run downloads `postgres:17-alpine`. No Neon test branch or `DATABASE_URL_TEST` is required. A missing container runtime fails the run instead of skipping API tests.

Automated tests mock the LLM and Google identity verifier. GitHub Actions runs these checks, the API build, and an Android JavaScript export. It does not build or install a native APK. See [the workflow](../.github/workflows/verify.yml) and [database testing decision](decisions/0005-single-neon-branch.md).

## Configure a running API

For a fresh checkout:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Keep existing `.env` files on an established checkout. App commands load configuration beside the app that uses it; a root `.env` is not read.

| API variable                            | Purpose                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | Neon pooled runtime connection, with `-pooler` in the host and TLS enabled.                       |
| `DATABASE_URL_DIRECT`                   | Direct connection to the same branch, used for migrations.                                        |
| `GOOGLE_WEB_CLIENT_ID`                  | Web OAuth client whose audience the API verifies.                                                 |
| `JWT_ACCESS_SECRET`                     | Private random access-token signing secret, at least 32 characters.                               |
| `JWT_REFRESH_SECRET`                    | A different private random secret, at least 32 characters, used to hash refresh tokens.           |
| `LLM_PROVIDER`                          | `groq` for the current configuration.                                                             |
| `LLM_BASE_URL`                          | `https://api.groq.com/openai/v1`.                                                                 |
| `LLM_API_KEY`                           | Private server-side provider key.                                                                 |
| `LLM_MODEL`                             | `openai/gpt-oss-120b`; validation also permits Groq's `openai/gpt-oss-20b`.                       |
| `TRUST_PROXY`                           | `0` for local development, `1` behind Render's reverse proxy.                                     |
| `CORS_ORIGINS`                          | Comma-separated browser-origin allowlist. Native Android requests do not require an origin entry. |
| `NODE_ENV`, `PORT`, `HOST`, `LOG_LEVEL` | Runtime settings; development defaults are in the example file.                                   |

The [environment validator](../apps/api/src/config/env.ts) fails at startup with invalid field names, without printing credentials. Set Groq's Zero Data Retention option in your organization's Data Controls for your deployment; the repository cannot turn on or attest to an account-level provider setting.

The explicit `vyceai` adapter accepts its own base URL, model, and key. Changing providers requires a deliberate configuration change; a provider error does not trigger a cross-provider fallback.

```sh
npm run db:check
npm run db:migrate
npm run dev:api
```

From another terminal:

```sh
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Expect `{"status":"ok"}` and `{"status":"ok","database":"connected"}`. `/ready` returns HTTP 503 if the database check fails. A local API is useful for development calls; the maintained phone-testing workflow uses the deployed Render API.

## Deploy to Render

Use [render.yaml](../render.yaml) as the service blueprint. For a fork, connect your repository and supply your own database, Google, and provider configuration in Render.

| Setting       | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Runtime       | Node                                                                     |
| Branch        | `main`                                                                   |
| Build         | `npm ci && npm run build`                                                |
| Start         | `npm run db:migrate:prod -w @solace/api && npm run start -w @solace/api` |
| Health check  | `/health`                                                                |
| Proxy setting | `TRUST_PROXY=1`                                                          |

The start command applies checked-in migrations before serving requests. Verify `https://YOUR-SERVICE.onrender.com/ready` reports the database connected. `/v1/chat-provider` returns the public provider name; it exposes no key or model credentials. Deploy backend changes before checking their flows in the installed app.

The maintained demo API is `https://solace-ai-n8s4.onrender.com`. Its free Render service sleeps after inactivity, and startup can take about a minute or more. Do not interpret a first-request timeout as proof that a session or database record was lost. Local `.env` edits do not update Render; change the dashboard environment and redeploy.

## Configure your Android fork

The downloadable APK already contains this project's public API URL, app identifier, and Google client ID. Building a fork requires your own service configuration and signing registration.

1. Choose your `android.package` and `ios.bundleIdentifier` in `apps/mobile/app.json`. These identifiers must match the OAuth registrations and store records for your app.
2. In that file, remove the original `owner` and `extra.eas.projectId`. Inside `apps/mobile`, run `npx eas-cli@latest login`, then `npx eas-cli@latest init` to link your own Expo project. Review the resulting config before building.
3. Follow [Google authentication setup](setup/google-auth.md). Create your own Web and Android OAuth clients, and register the SHA-1 of each key that signs your builds. The Web client ID on mobile must match the API's expected audience. Your fork has its own Google publishing/test-user settings.
4. Set `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `apps/mobile/.env`. Update the same values under `build.base.env` in `apps/mobile/eas.json`, because the checked-in build profiles contain the original project's public values. Use your Render HTTPS URL for installed-app checks.
5. Set up Android signing credentials in your own EAS project before the wrapper's non-interactive build. Do not commit a keystore or ask for the original project's private signing key.

The optional `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` needs a real iOS OAuth callback scheme; Android does not require it. The maintained project now produces a signed local Xcode archive for `com.humanityfounders.solaceai`; App Store Connect validation, upload, and real-iPhone TestFlight checks remain release gates until recorded in the QA checklist.

All `EXPO_PUBLIC_*` values are visible in the APK. They may contain public URLs and OAuth client IDs, never provider keys, database URLs, or app signing secrets.

## Build locally and use Metro

The [local Android setup](setup/android-local.md) records the tested Linux toolchain. Its paths describe the maintainer's environment; set `JAVA_HOME` and `ANDROID_HOME` to your own JDK and SDK locations. The wrapper also needs disk space under `~/.cache/solace/android-build` and internet for dependency downloads and EAS credential retrieval. Compilation runs on your machine.

From the repository root:

```sh
npm run build:android:local -w @solace/mobile
adb install -r apps/mobile/dist/local/solace-development.apk
npm run dev:mobile
```

A **development build** is an installed version of the app with its native modules and a development launcher. **Metro** serves JavaScript changes from your computer. Google's native sign-in does not work in Expo Go. Use the terminal QR code or the local setup guide's USB/Wi-Fi instructions to connect the development app.

TypeScript and screen changes can reload through Metro. Native dependency or configuration changes require a new APK.

For a standalone preview:

```sh
npm run build:android:preview -w @solace/mobile
adb install -r apps/mobile/dist/local/solace-preview.apk
```

The wrapper uses `preview-local`, bundles the JavaScript, and compiles **ARM64 only** with two Gradle workers. The preview works without Metro. `adb install -r` updates a build signed by the same certificate and preserves its app data. A fork with a new package or signing key is a separate installation.

For a local preview build with the general profile's architectures, run from `apps/mobile`:

```sh
npx eas-cli@latest build --platform android --profile preview --local
```

The repository ignores generated Android/iOS folders and APKs. Configure native behavior through Expo app config and plugins. Do not hand-edit generated native code.

## Commands

Run these from the repository root unless a command says otherwise.

| Command                                           | Purpose                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm ci`                                          | Install the workspace versions in the lockfile.                                       |
| `npm run dev:api`                                 | Build shared contracts and start the API with reload.                                 |
| `npm run dev:mobile`                              | Build shared contracts and start Metro for a development build.                       |
| `npm run verify`                                  | Formatting, lint, typechecks, and all workspace tests.                                |
| `npm run lint` / `npm run typecheck` / `npm test` | Run one verification stage.                                                           |
| `npm run build`                                   | Compile shared contracts and the API.                                                 |
| `npm run db:check`                                | Check configured database connections without exposing credentials.                   |
| `npm run db:generate`                             | Generate a migration after an intentional schema change.                              |
| `npm run db:migrate`                              | Apply checked-in migrations using the direct connection.                              |
| `npm run db:studio`                               | Open Drizzle's database viewer; schema changes still use migrations.                  |
| `npm run build:android:local -w @solace/mobile`   | Build a signed ARM64 development APK locally.                                         |
| `npm run build:android:preview -w @solace/mobile` | Build a signed ARM64 standalone preview APK locally.                                  |
| `npm run export:android -w @solace/mobile`        | Export Android JavaScript to `dist/export`; does not produce an APK.                  |
| `npm run ai:eval`                                 | Run synthetic cases against the configured real AI provider; consumes provider usage. |

The [AI evaluation script](../apps/api/scripts/ai-eval.ts) has 17 scenarios at the time of this guide. It reports reply text for those synthetic inputs, latency, format/activity concerns, and safe HTTP error codes. It does not use app conversations or write to the application database. Tone and usefulness still require human review.

To select cases:

```sh
npm run ai:eval -w @solace/api -- declined-activity after-breathing breathing-options-followup
```

For a browser-only design preview, run `npm run setup:web -w @solace/mobile` before serving `/design-preview` through Expo's web mode. This prepares Skia's local CanvasKit file; it does not enable native Google sign-in in the browser.

## Source map

| Area                                               | Start here                                               |
| -------------------------------------------------- | -------------------------------------------------------- |
| Thin mobile routes                                 | [apps/mobile/src/app](../apps/mobile/src/app/)           |
| Feature screens, hooks, and API calls              | [apps/mobile/src/features](../apps/mobile/src/features/) |
| Tokens and appearance                              | [apps/mobile/src/theme](../apps/mobile/src/theme/)       |
| API assembly and middleware                        | [apps/api/src/app.ts](../apps/api/src/app.ts)            |
| Account-scoped feature services and SQL            | [apps/api/src/modules](../apps/api/src/modules/)         |
| Sol prompt, context, safety, and provider adapters | [apps/api/src/ai](../apps/api/src/ai/)                   |
| Shared contracts and wellness rules                | [packages/shared/src](../packages/shared/src/)           |
| Database schema and migrations                     | [apps/api/src/db](../apps/api/src/db/)                   |

## Contributing

Keep a change focused and explain the user-visible problem. Discuss larger features in an issue before building them. For a bug, include a minimal reproduction, the expected result, the actual result, and device/build details that help reproduce it.

Use a feature branch and Conventional Commits. Add meaningful tests for logic and failure paths, run `npm run verify`, and include relevant validation in the pull request. API changes should also pass `npm run build`. UI changes need screenshots with sample data and a note distinguishing browser review from native-device checks.

Keep sensitive data out of examples and issues. Use your own backend and test accounts for experiments. Do not publish tokens, provider keys, `.env` files, signing credentials, or private chat transcripts. Existing third-party notices must remain intact.

The [build history](../README.md#build-history), [design decisions](design/DESIGN.md), [architecture records](decisions/), and [QA checklist](qa-checklist.md) explain established behavior and open work.
