# Foundation choices

Status: accepted for Phase 0.

The project uses npm workspaces for the Expo mobile app, Express API, and shared Zod contracts. Shared contracts publish compiled ESM for Node and expose source to Metro through the `react-native` condition. No custom Metro resolver is needed.

Expo's current stable template is SDK 58 (58.0.23 when created), React Native 0.88.1, React 19.3.0, and TypeScript 6.0.3. The installed Node 24.20.0 is compatible. TypeScript 7 is newer, but Expo's template and typescript-eslint require the supported TypeScript 6 line. Native packages are installed through `expo install`.

Route files stay in `apps/mobile/src/app/`, the current Expo template's convention. Feature logic stays in `src/features/`. This updates the illustrative `app/` placement in the root instructions without changing the thin-route requirement.

The temporary foundation screen checks `/ready`; it is a development diagnostic, not the final Home design. It uses a small subset of the supplied color and spacing tokens and system typography. Fraunces, Figtree, the sky, and Sol's animation remain behind the Phase 2 design gate.

The app identifier is `com.puneet.solace`, with URL scheme `solace`. EAS development builds are used from the beginning. Render deployment is deferred to the release phase.

Neon uses `pg` Pool and stable Drizzle 0.45.x rather than the release-candidate driver examples currently shown in some Drizzle docs. Runtime connections use the pooled endpoint, while migrations use direct endpoints. PostgreSQL certificate verification is explicitly `verify-full`. Tests require a separate branch endpoint and roll back their data changes.

Node's default 250 ms network-address attempt timeout caused all Neon connections to fail on the development network. A controlled connection check succeeded with 3 seconds per address attempt. API/database command processes use that setting, with a 10-second pool connection deadline and bounded SQL query timeouts. IPv4/IPv6 fallback remains enabled.

Google and AI credentials are reserved in the environment examples but are not required to boot the foundation. The selected AI provider is VyceAi (`vyceai`) at `https://vyceai.com/v1`; its exact API capabilities and model will be checked in Phase 4.

References:

- https://docs.expo.dev/get-started/create-a-project/
- https://docs.expo.dev/guides/monorepos/
- https://docs.expo.dev/develop/unit-testing/
- https://orm.drizzle.team/docs/get-started-postgresql
- https://neon.com/docs/connect/connection-pooling
