# 0010: Structured Sol replies and optional activities

Date: 2026-11-08
Status: deployed; both activity routes verified on Android, provider-format recovery follow-up pending deployment

Sol's plain-text replies could suggest a break but offered no way to open the activity. This change adds one optional activity to a saved reply, using the existing breathing and affirmation screens. The user also requested less formulaic copy throughout the app.

The provider returns `{ content, activity, needsSupport }`. Groq GPT-OSS supports strict JSON schema output; all fields are required, objects reject extra properties and `activity` accepts only `breathing`, `affirmation` or null. Zod validates the result again and caps new reply content at 1,600 characters. Existing 8,000-character messages remain readable. The optional VyceAi adapter uses the same prompt/schema validation without assuming support for Groq's transport options. Only Groq was evaluated against a live provider for this slice.

`generateSolReply` owns deterministic safety, context, provider validation and the activity policy. It receives only the current conversation and prevents adjacent activity offers. Context reconstructs previous assistant replies as `{ content, activity, needsSupport }`, using the saved activity and crisis kind; row IDs, request IDs and other persistence details stay out of provider messages. User text remains unchanged. The existing deterministic support path runs before loading context; a model support flag also selects that response. Neither support nor fallback replies can contain an activity. These layers reduce failure modes; they do not prove complete crisis detection or clinical suitability.

Migration `0006_chat_activities.sql` adds a nullable `messages.activity` column and a check constraint. Only complete, normal assistant messages can carry an allowlisted activity. The existing transaction saves text and activity together; the same request ID returns both unchanged, and a failed-turn retry clears any old activity. Authorization, leases, pagination and deletion use the existing message repository.

Mobile validates activity metadata and maps it to app-owned labels, icons and routes. Model text cannot supply a URL or navigation parameters. Tapping opens the activity without starting, completing or logging it. A conversation ID supports Back/return while the existing account-scoped draft cache preserves unsent text. Affirmations do not automatically send a reflection. While a message is pending/unconfirmed or the latest reply is crisis/fallback, the transcript and header hide activity invitations, including earlier ones.

The v2 prompt asks for specific, concise responses, respects requests to listen and discourages repeated reassurance. Screen copy names the actual action and state. The 60 affirmation IDs and subjects stay stable while wording changes to everyday first-person statements, so favorites remain associated with their subjects. Old notification text may remain until the normal startup reconciler reschedules it.

Deployment uses the existing Render start command, which runs migrations before serving. Old mobile builds ignore the added response field; new builds accept old messages without it. Merging remains user-owned. Android testing uses Render only. The synthetic evaluation calls the actual configured provider but does not read or write the application database.

Sources checked for this change:

- https://console.groq.com/docs/structured-outputs
- https://docs.expo.dev/versions/v58.0.0/sdk/router/
- Uizze `ui-taste` mobile controls and state/verification playbooks (free skill; no paid MCP connected)
- Hardik Pandya's `stop-slop` copy guidance

## Provider-format recovery follow-up (8 November)

The phone repeatedly received the fallback after declining an affirmation. Groq's logs reported HTTP 400 `json_validate_failed`, including after the revised breathing prompt deployed. A matched synthetic comparison with that prompt returned 400 with plain-text assistant history (the failed generation was not JSON), and 200 with valid output when the same prior reply was encoded in the requested structure. This is a reproduced contributing cause, not proof that every provider failure has the same cause. The prior prompt-only comparison was insufficient to establish recovery.

Context now reconstructs assistant history in the reply format instead of demonstrating plain-text replies to a model required to produce JSON. It counts the encoded UTF-8 bytes against the existing 12,000-byte budget and handles legacy replies without activity metadata. Saved messages and the mobile contract are unchanged.

The Groq adapter also permits one retry for an HTTP 400 whose parsed error code is exactly `json_validate_failed`. Error bodies share the existing 64,000-byte read limit and 45-second deadline. The retry uses the same model, schema and messages, waits 400 ms, and shares the two-attempt limit with rate-limit/server-error recovery. Other 400s and auth errors are not retried. Raw error messages and `failed_generation` are never logged, displayed or accepted as replies. A retried response still passes the complete-response check, Zod validation and crisis handling.

Five live synthetic cases passed on the corrected path: the exact declined-affirmation follow-up, declined breathing, a disappointing breathing result, breathing customization and indirect crisis detection. All used one HTTP 200 request, taking 0.305–1.104 seconds locally. Tests cover successful/exhausted recovery, unchanged strict request settings, malformed/oversized error bodies, shared retry/deadline limits, history escaping/budget and recovered safety flags. Render must deploy this backend change before the saved phone turn can verify recovery; no new APK or migration is needed.
