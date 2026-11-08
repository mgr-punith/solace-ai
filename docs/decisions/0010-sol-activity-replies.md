# 0010: Structured Sol replies and optional activities

Date: 2026-11-08
Status: implemented; Render deployment and phone suggestion flow pending

Sol's plain-text replies could suggest a break but offered no way to open the activity. This change adds one optional activity to a saved reply, using the existing breathing and affirmation screens. The user also requested less formulaic copy throughout the app.

The provider returns `{ content, activity, needsSupport }`. Groq GPT-OSS supports strict JSON schema output; all fields are required, objects reject extra properties and `activity` accepts only `breathing`, `affirmation` or null. Zod validates the result again and caps new reply content at 1,600 characters. Existing 8,000-character messages remain readable. The optional VyceAi adapter uses the same prompt/schema validation without assuming support for Groq's transport options. Only Groq was evaluated against a live provider for this slice.

`generateSolReply` owns deterministic safety, context, provider validation and the activity policy. It receives only the current conversation, strips stored metadata before the provider request and prevents adjacent activity offers. The existing deterministic support path runs before loading context; a model support flag also selects that response. Neither support nor fallback replies can contain an activity. These layers reduce failure modes; they do not prove complete crisis detection or clinical suitability.

Migration `0006_chat_activities.sql` adds a nullable `messages.activity` column and a check constraint. Only complete, normal assistant messages can carry an allowlisted activity. The existing transaction saves text and activity together; the same request ID returns both unchanged, and a failed-turn retry clears any old activity. Authorization, leases, pagination and deletion use the existing message repository.

Mobile validates activity metadata and maps it to app-owned labels, icons and routes. Model text cannot supply a URL or navigation parameters. Tapping opens the activity without starting, completing or logging it. A conversation ID supports Back/return while the existing account-scoped draft cache preserves unsent text. Affirmations do not automatically send a reflection. While a message is pending/unconfirmed or the latest reply is crisis/fallback, the transcript and header hide activity invitations, including earlier ones.

The v2 prompt asks for specific, concise responses, respects requests to listen and discourages repeated reassurance. Screen copy names the actual action and state. The 60 affirmation IDs and subjects stay stable while wording changes to everyday first-person statements, so favorites remain associated with their subjects. Old notification text may remain until the normal startup reconciler reschedules it.

Deployment uses the existing Render start command, which runs migrations before serving. Old mobile builds ignore the added response field; new builds accept old messages without it. Merging remains user-owned. Android testing uses Render only. The synthetic evaluation calls the actual configured provider but does not read or write the application database.

Sources checked for this change:

- https://console.groq.com/docs/structured-outputs
- https://docs.expo.dev/versions/v58.0.0/sdk/router/
- Uizze `ui-taste` mobile controls and state/verification playbooks (free skill; no paid MCP connected)
- Hardik Pandya's `stop-slop` copy guidance
