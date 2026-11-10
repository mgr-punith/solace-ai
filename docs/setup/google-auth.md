# Google authentication

The maintained Android package is `com.puneet.solace`. The owner confirmed on 10 November 2026 that this project's Google OAuth app is published for other Google accounts.

For a fork, use your own app identifier and Google Auth Platform project. Set the audience and test users for your development setup, then review Google's current publishing requirements before distributing the fork. See [fork configuration](../DEVELOPMENT.md#configure-your-android-fork).

Create a Web OAuth client and put its public ID in `GOOGLE_WEB_CLIENT_ID` on the API and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` on mobile. Create an Android OAuth client for the package and each signing certificate used by an APK. The development APK fingerprint verified during setup is `FE:E4:83:FB:36:A2:D4:DA:51:7F:1E:12:EB:95:52:3D:15:4A:A7:74`. Verify the fingerprint again if EAS credentials change. The Android client ID is registered with Google; the app's `webClientId` uses the Web client.

## Render environment before merging

- `GOOGLE_WEB_CLIENT_ID`: the public Web client ID supplied during setup.
- `JWT_ACCESS_SECRET`: a random value of at least 32 characters.
- `JWT_REFRESH_SECRET`: a different random value of at least 32 characters.
- `TRUST_PROXY=1`: trust Render's single reverse proxy for IP rate limits.

Keep secrets in Render's environment settings and local `apps/api/.env`. The API fails at boot if auth values are absent or invalid. A `.env` import file containing real secrets must stay local and uncommitted. Google client secrets are not used in this flow.

## Rebuild and phone verification

From `apps/mobile`:

```sh
npm run build:android:local
```

Google Sign-In and SecureStore contain native code. Install the new APK, then run `npm run dev:mobile` at the repository root. Test sign-in, close/reopen, sign-out, sign-in again, and confirmed account deletion. The app retains credentials and offers retry if the server is unreachable; logout and deletion require a server response before reporting success.

`DEVELOPER_ERROR` or code 10 means the package or SHA-1 registration does not match the installed APK. A missing ID token means the Web client ID is missing or wrong. Backend audience failure means the API and app use different Web client IDs. A fork's test-user or publishing settings may restrict access. Use devices/emulators with Google Play services.

iOS OAuth client and URL scheme are deferred. Android autolinks Google Sign-In; the dynamic Expo config adds the library's non-Firebase iOS plugin only when `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is set to the real reversed iOS client ID. Do not invent a callback scheme for iOS.
