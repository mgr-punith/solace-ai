# Local Android builds on Fedora Linux

The setup uses Google Android command-line tools and a user-installed Temurin JDK. Android Studio and an emulator are optional when testing on the physical vivo phone.

## Installed paths

- Gradle runtime JDK: `~/.local/share/solace/jdk-21` (Temurin 21.0.13).
- React Native compiler toolchain: Temurin 17.0.21, installed automatically under `~/.gradle/jdks` because its Gradle plugin requires Java 17.
- Android SDK: `~/Android/Sdk`.
- SDK packages: platform 37.0, build-tools 36.0.0 and 37.0.0, platform-tools 37.0.1, NDK 27.1.12297006, CMake 3.22.1.
- Shell environment: `~/.config/solace/android-env.sh`, sourced by `.zshrc`.

For an existing terminal:

```sh
source ~/.config/solace/android-env.sh
java -version
javac -version
adb version
adb devices -l
```

Java and javac should report 21.0.13. The physical phone should appear as `device`, not `unauthorized`. If it is unauthorized, unlock the phone and accept the USB debugging prompt. If missing, reconnect the cable and check USB debugging.

## Build and install

From `apps/mobile`:

```sh
npm run build:android:local
adb install -r dist/local/solace-development.apk
adb reverse tcp:8081 tcp:8081
npm run start
```

The local build uses EAS to retrieve the existing signing credential and then compiles on this computer. It bypasses the cloud build queue. The `development-local` profile compiles ARM64 only for this phone and uses two Gradle workers. Use the regular `development` profile for APKs that must support other CPU architectures. Local builds need internet for initial dependency downloads; the first build takes longer than later builds.

The build wrapper stores its working directory under `~/.cache/solace/android-build`, avoiding the memory-backed `/tmp` partition. Generated Android directories and APKs remain ignored by Git. Expo generates native files from app config and plugins; do not edit native files by hand.

The first EAS local build retains the certificate already registered with Google. A plain `npx expo run:android` normally uses a different local debug key; register its SHA-1 separately before relying on Google sign-in, and do not uninstall the installed app just to work around a signing mismatch.

After installation, open the Solace development app and connect to Metro. To open it directly through USB, use another terminal while Metro is running:

```sh
adb shell am start -W -a android.intent.action.VIEW \
  -d 'solace://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' \
  com.puneet.solace
```

Keep Metro running while using this development APK. A preview APK later bundles the app for use without this laptop. Sign-in should show Google's account picker and then your name. UI and TypeScript changes reload through Metro; adding or changing native modules requires another APK build.

## SDK maintenance

Google command-line tools 23 use the Android CLI as the replacement for `sdkmanager`:

```sh
android --no-metrics --sdk="$ANDROID_HOME" sdk list
android --no-metrics --sdk="$ANDROID_HOME" sdk install 'build-tools;37.0.0'
```

Use versions required by the installed Expo and React Native packages. Review Google's license terms during SDK installation. The system Java remains unchanged; the Solace shell environment chooses the project JDK.

## Verified on the vivo phone

The first local ARM64 build completed successfully with 485 Gradle tasks in 27 minutes 33 seconds. The artifact was approximately 87.5 MB. Its signing certificate matched the existing Google Android OAuth registration, and `adb install -r` updated the installed app without uninstalling it.

The app opened through USB Metro and displayed the signed-in welcome screen. Closing and reopening the app preserved the signed-in session. The Render `/ready` endpoint returned `{"status":"ok","database":"connected"}`. Device checks for sign-out, explicit token refresh, account deletion, and offline recovery remain pending.

## Live changes on the connected phone

Keep the development APK open and Metro running. From the repository root:

```sh
npm run start -w @solace/mobile -- --localhost --port 8082
```

From a second terminal:

```sh
adb reverse tcp:8082 tcp:8082
adb shell am start -W -a android.intent.action.VIEW \
  -d 'solace://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082' \
  com.puneet.solace
```

Save a TypeScript or UI file: Fast Refresh updates the phone in seconds. Keep USB debugging authorized and repeat `adb reverse` after reconnecting the cable. If Metro stops, restart it with the same port and reopen the link. A rebuild is only needed for new native dependencies or native app configuration. The submission preview APK is self-contained and does not use Metro.

The Phase 2 native build completed Gradle compilation in **17 minutes 15 seconds** (the first foundation build took 27 minutes 33 seconds). Dependency and EAS setup add time before compilation; the APK was approximately 121 MiB. All compilation happened on this Linux machine.

If Linux logs repeated `device descriptor read/64, error -71`, switch the data cable or USB port. These USB protocol errors occur below ADB and can make repeated authorization ineffective.

## Live changes over Wi-Fi

Use this when USB is unstable. Connect the phone and laptop to the same Wi-Fi, then run from the repository root:

```sh
npm run start -w @solace/mobile -- --lan --port 8082
```

Open Solace's development launcher, choose **Enter URL manually**, and enter the laptop's IPv4 address with port 8082. During the 6 November check it was `http://192.168.1.4:8082`; use the address Metro prints if it changes. The user confirmed the installed app opens over Wi-Fi. Keep Metro running and save source files to use Fast Refresh. Native dependency changes still require a local APK rebuild.

Android JavaScript exports write to `dist/export` so they cannot erase local APKs in `dist/local`.

## Standalone preview for this ARM64 phone

Run `npm run build:android:preview -w @solace/mobile` from the repository root. The wrapper selects `preview-local`, bundles JavaScript, compiles locally with two workers and saves `apps/mobile/dist/local/solace-preview.apk`. It uses the existing signing credentials. Install with `adb install -r`; Metro is not needed for this APK. The general `preview` profile remains available for all-architecture release work. Deploy backend migrations on Render before testing new API flows on the phone.
