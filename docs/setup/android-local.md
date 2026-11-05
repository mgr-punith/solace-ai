# Local Android builds on Fedora Linux

The setup uses Google Android command-line tools and a user-installed Temurin JDK. Android Studio and an emulator are optional when testing on the physical vivo phone.

## Installed paths

- Gradle runtime JDK: `~/.local/share/solace/jdk-21` (Temurin 21.0.13).
- React Native compiler toolchain: Temurin 17.0.21, installed automatically under `~/.gradle/jdks` because its Gradle plugin requires Java 17.
- Android SDK: `~/Android/Sdk`.
- SDK packages: platform 37.0, build-tools 37.0.0, platform-tools 37.0.1, NDK 27.1.12297006, CMake 3.22.1.
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

After installation, open the Solace development app and connect to Metro. Sign-in should show Google's account picker and then your name. UI and TypeScript changes reload through Metro; adding or changing native modules requires another APK build.

## SDK maintenance

Google command-line tools 23 use the Android CLI as the replacement for `sdkmanager`:

```sh
android --no-metrics --sdk="$ANDROID_HOME" sdk list
android --no-metrics --sdk="$ANDROID_HOME" sdk install 'build-tools;37.0.0'
```

Use versions required by the installed Expo and React Native packages. Review Google's license terms during SDK installation. The system Java remains unchanged; the Solace shell environment chooses the project JDK.
