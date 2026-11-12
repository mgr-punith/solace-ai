# iOS App Store identity

Status: accepted on 12 November 2026.

The maintained Android package remains `com.puneet.solace`. The iOS bundle identifier is `com.humanityfounders.solaceai` so the build targets the existing Humanity Founders App Store Connect record named **Solace by Puneet** (Apple ID `6833908359`). Platform identifiers intentionally differ; changing Android would invalidate its existing Google OAuth and signing setup.

Google Sign-In on iOS uses the OAuth client registered specifically for `com.humanityfounders.solaceai`. Its public client ID and reversed callback scheme are supplied through the mobile public environment configuration. The shared Web OAuth client remains the backend-verified ID-token audience on Android and iOS.

Any iOS archive created with the earlier `com.puneet.solace` identifier must not be uploaded to App Store Connect. Regenerate the iOS native project after pulling this decision so Xcode receives the corrected bundle identifier and callback scheme.
