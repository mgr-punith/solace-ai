# 0009 — Saved wellness activities and local-day progress

Phase 6 adds account-owned breathing completions, explicit affirmation reads and affirmation favorites. The shared contract supplies three breathing patterns and 60 original curated affirmations. A deterministic local-date pick is available without a network request; AI personalization stays in Phase 7.

The client measures active breathing time with a monotonic clock, pauses on background/focus loss and requires explicit resume. Only a completed session can be saved in the normal UI. A stable request key makes retries idempotent; changed payloads return 409. Server timestamps are authoritative, so a delayed save counts on the day it reaches the account. This is a wellness journal, not proof of physical exercise: the server validates permitted patterns and durations but cannot prove a person followed a breath.

PostgreSQL combines check-ins and completed activities, groups them in the requested IANA timezone and returns daily aggregates without notes. Streaks count unique consecutive local days, retaining yesterday's streak while today is unfinished. Gaps receive welcoming copy. Timezone travel reinterprets historical instants in the current timezone. Deleting a check-in removes its contribution; account deletion cascades all activities and favorites. No cached plaintext wellness data is persisted on the device.

Favorites use idempotent PUT/DELETE and are separate from activity logging. Their list is bounded by the 60-item curated catalog, so it does not require pagination. Neither opening a page nor favoriting a line records completion. Local scheduled notification routes remain compatible and lead to buttons opening the relevant activity.

Lucide React Native 1.70.0 and Expo-installed react-native-svg provide consistent navigation/action icons. Verified against Lucide's peer dependencies and Expo SDK 58 SVG documentation. Reanimated 4.7's supported Jest resolver selects web Worklets implementations for component tests; native timing and physical haptics still require Android QA.
