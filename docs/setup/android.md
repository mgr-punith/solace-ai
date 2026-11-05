# Android development setup

The application ID is `com.puneet.solace`. Keep it stable: Google sign-in will later be tied to it.

## Expo account and build

From `apps/mobile`:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile development
```

The CLI links this app to your Expo project. Keep the generated project ID in `app.json`. EAS creates the Android signing key and provides an APK download link when the build completes. Store signing credentials through EAS, never in Git.

Install the APK from that link on the phone, or use `adb install /path/to/solace-development.apk` after enabling USB debugging and accepting the computer authorization prompt.

## Connect the phone

The hosted API is `https://solace-ai-n8s4.onrender.com`. Set `EXPO_PUBLIC_API_URL` to that URL in `apps/mobile/.env`. Confirm `/ready` reports the database connected.

For local backend development, run from the repository root:

```sh
npm run dev:api
```

In another terminal, expose port 4000 through your HTTPS development tunnel. For example, after installing Cloudflare's official `cloudflared` utility:

```sh
cloudflared tunnel --url http://localhost:4000
```

Set the printed HTTPS address in `apps/mobile/.env` as `EXPO_PUBLIC_API_URL` only when testing the local backend. A temporary tunnel address changes when restarted.

```sh
npm run dev:mobile
```

Scan the terminal QR code from the installed development app, or press `a` to open Android over USB. For a USB Metro connection, run `adb reverse tcp:8081 tcp:8081` if necessary. This forwards the phone's port 8081 to the computer's Metro server; API traffic still uses HTTPS.

The auth build shows “Solace” and Google's sign-in button. Sign in to see your name, then close and reopen the app to check session restoration. The foundation “Check connection” screen remains at `/connection`. A full app reload applies changed environment values; Expo SDK 58 does not require restarting Metro just to update them.

Rebuild the development APK when native dependencies or native app settings change. Ordinary TypeScript and screen edits update through Metro without rebuilding the APK.

## If Neon times out

Run `npm run db:check` from the repository root. It prints connection status or error codes without secrets. `ETIMEDOUT` on all endpoints indicates that the network connection did not complete; check your network/VPN/firewall and Neon project availability before changing credentials. `28P01` indicates authentication failed.

The database client already allows 3 seconds per address attempt to accommodate the development network's latency; Node's shorter default caused timeouts during kickoff.
