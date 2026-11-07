# Dependency review — Phase 0

Reviewed on 2026-11-05 after installing the current Expo SDK 58 packages and stable backend tools.

`npm audit` reports low/moderate advisories and no high/critical advisories. The underlying advisories concern build/test tooling: glob/minimatch resource exhaustion, Jest's deepmerge prototype poisoning, and an old esbuild nested under Drizzle Kit. They do not identify the Express request path or the PostgreSQL runtime as affected.

The suggested `npm audit fix --force` changes include downgrading Expo to SDK 53 and Drizzle Kit to an older incompatible release. Do not apply those automatically. Keep the SDK-compatible package set; update affected upstream tools and rerun checks when compatible fixes are published. Do not expose Drizzle Studio or development build tooling to the public internet, and do not process untrusted build configuration.

Advisories:

- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4 (glob)
- https://github.com/advisories/GHSA-g3hv-75wg-m249 (minimatch)
- esbuild development-server advisory, dependency range `<=0.24.2`, nested under Drizzle Kit.
- deepmerge prototype-poisoning advisory, dependency range `>=4.2.0 <=4.3.1`, used by test tooling.

Re-run `npm audit` when updating the lockfile; the count of affected transitive packages can change without a new underlying advisory.

7 November 2026: installed `expo-notifications` with `npx expo install` for SDK 58 and checked the matching official notification API and native manifest. This is Expo's maintained notification module; no separate scheduler dependency was added. The subsequent audit reports 37 affected packages (one low, 36 moderate, zero high/critical), with no advisory against `expo-notifications` itself. Keep compatible upstream upgrades separate from this feature; do not apply the suggested forced SDK changes.

7 November 2026, Phase 6: added Lucide React Native 1.70.0 and Expo SDK 58's compatible react-native-svg using `npx expo install`. Lucide declares React 19 and SVG 15 peer support; Expo's versioned SVG guide recommends Lucide as an icon source. The follow-up audit reports 37 affected packages (one low, 36 moderate, no high/critical), with no advisory against either new package. Reanimated 4.7's current official Jest resolver and `setUpTests()` replace native execution in component tests. No forced audit upgrades were applied.
