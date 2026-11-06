# 0006: Persistent non-streaming Sol chat

Date: 2026-11-06
Status: accepted for Phase 4

## Behavior

Authenticated users create, list, continue and delete conversations. User and assistant messages persist in Neon. Deleting a conversation or account cascades its messages. All repository operations first filter or lock the conversation by its owner. Titles are generic to avoid putting sensitive message text in lists or metadata.

Every creation and turn has a client request ID. A transaction locks the conversation, reserves both message sequence numbers and obtains a 60-second lease before calling the provider outside the transaction. A duplicate completed turn returns the saved reply. Concurrent sends return a recoverable conflict; an interrupted turn can be reclaimed with the same request ID after lease expiry. Completion requires the same lease, so a delayed worker cannot overwrite a retry or resurrect deleted data. A failed provider reply remains visible and retryable; older failed turns cannot be regenerated after newer messages.

VyceAi is behind an `LLMProvider` interface. Its public documentation confirms bearer-authenticated `/v1/chat/completions` and OpenAI-shaped responses. The adapter uses non-streaming text, a 12-second request deadline, at most one bounded retry for HTTP 429/5xx, no redirects, bounded response bytes and output tokens. Secrets, messages and raw provider errors are never logged. The configured key/model must exist at startup; Render must receive those values before deployment.

## Context and safety

Only the current conversation enters context: fixed versioned Sol instructions and the newest bounded messages. At most 20 messages and 12,000 UTF-8 bytes of conversation are included. This is a conservative byte-based bound, not exact provider token accounting. Profile, moods, summaries and memories wait for Phase 7 server-side consent controls. The assistant must not claim cross-conversation memory.

Deterministic crisis patterns bypass the model and persist a warm response directing users to trusted people and urgent human support. They are a limited safety layer, not comprehensive crisis detection; the system prompt also covers crisis handling. India Tele-MANAS and US 988 resources are public shared configuration, verified from primary sources on 6 November 2026. A region picker avoids guessing location. The Support screen works offline and requires an explicit tap to open the dialer. Reverify numbers before submission.

## Mobile and verification

Talk lists conversations; chat uses the existing FlatList and SDK 58 KeyboardAvoidingView guidance without new native dependencies. Server state stays in an account-keyed memory cache that clears on sign-out. Failed sends keep the same request ID; server-saved pending or failed turns remain retryable after reopening. Unsent drafts are not persisted after app termination.

Automated tests mock the LLM and use disposable PostgreSQL for real migrations, ownership, pagination, concurrency, persistence and deletion. Real VyceAi smoke/evaluation requests use only synthetic prompts. Phone QA uses Render after the feature is merged/deployed; no local API or tunnel is used.
