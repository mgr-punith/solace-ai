# Android development setup

The application ID is `com.puneet.solace`. Keep it stable: Google sign-in is tied to it.

## Expo account and build

From `apps/mobile`:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:android:local
```

The CLI links this app to your Expo project. Keep the generated project ID in `app.json`. The local build wrapper reuses the existing Google-registered Android signing key and compiles on this Linux machine. Follow [local Android setup](android-local.md). Store signing credentials through EAS, never in Git.

Install with `adb install -r dist/local/solace-development.apk` after enabling USB debugging and accepting the computer authorization prompt.

## Connect the phone

The hosted API is `https://solace-ai-n8s4.onrender.com`. Set `EXPO_PUBLIC_API_URL` to that URL in `apps/mobile/.env`. Confirm `/ready` reports the database connected.

Use the Render-hosted backend for all phone testing: `EXPO_PUBLIC_API_URL=https://solace-ai-n8s4.onrender.com`. Backend changes must be pushed, merged to `main`, and deployed by Render before checking them in the local app. Do not use a local API or tunnel for device testing.

```sh
npm run dev:mobile
```

Scan the terminal QR code from the installed development app, or press `a` to open Android over USB. For a USB Metro connection, run `adb reverse tcp:8081 tcp:8081` if necessary. This forwards the phone's port 8081 to the computer's Metro server; API traffic still uses HTTPS.

The auth build shows “Solace” and Google's sign-in button. Sign in to see your name, then close and reopen the app to check session restoration. The foundation “Check connection” screen remains at `/connection`. A full app reload applies changed environment values; Expo SDK 58 does not require restarting Metro just to update them.

Rebuild the development APK when native dependencies or native app settings change. Ordinary TypeScript and screen edits update through Metro without rebuilding the APK.

## If Neon times out

Run `npm run db:check` from the repository root. It prints connection status or error codes without secrets. `ETIMEDOUT` on all endpoints indicates that the network connection did not complete; check your network/VPN/firewall and Neon project availability before changing credentials. `28P01` indicates authentication failed.

The database client already allows 3 seconds per address attempt to accommodate the development network's latency; Node's shorter default caused timeouts during kickoff.
