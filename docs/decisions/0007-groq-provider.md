# 0007: Groq for responsive prototype chat

Date: 2026-11-06
Status: accepted; deployed phone chat flow verified on 6 November 2026

## Evidence and choice

On the installed phone, Render saved the first chat message and returned the provider fallback. Retrying did not duplicate the turn; a force-stop/reopen restored the message, fallback and retry action. A direct synthetic call to the configured VyceAi model returned a valid reply after 15.9 seconds, exceeding the adapter's old 12-second deadline. That is a likely cause, not direct evidence of the Render-side error.

Matched synthetic comparisons on VyceAi returned four GLM replies in 24–31 seconds and three DeepSeek replies in 28–33 seconds with a fourth timing out after 45 seconds. The user chose to try Groq's free tier and privately configured its API key. An initial Groq GPT-OSS 120B request returned in 0.6 seconds. Six further Sol provider scenarios returned in 0.3–1.1 seconds, including refusal of dangerous requests and therapist/medication impersonation. The crisis case used the existing deterministic response instead of a provider call. This is a small local-machine sample, not a latency guarantee or comprehensive safety evaluation.

## Configuration and transport

`LLM_PROVIDER=groq`, `LLM_BASE_URL=https://api.groq.com/openai/v1`, and `LLM_MODEL=openai/gpt-oss-120b` select the default. GPT-OSS 20B is also supported. Groq configuration rejects a mismatched host/path before sending credentials. GPT-OSS receives `reasoning_effort: low`, `include_reasoning: false`, and `max_completion_tokens: 1024`. The budget includes reasoning; only a complete, validated final message is accepted. No model tools are enabled and reasoning fields never enter the conversation.

VyceAi remains explicitly selectable so the compatibility release can deploy before Render variables change. There is no automatic cross-provider fallback. Both adapters share HTTPS-only, redirect-rejecting transport with bounded response bytes, at most two attempts, and one 45-second deadline including backoff and body reading. This leaves time before the 60-second phone timeout and conversation lease. Honor a bounded Retry-After and stop when it cannot fit in the deadline. Success and failure clear the timer; failed provider requests preserve the existing saved retryable turn.

## Disclosure and deployment

The backend publishes only the provider ID at `GET /v1/chat-provider` with no-store caching. Mobile maps that ID to Groq or VyceAi, displaying the provider at Talk and at the composer. The onboarding notice explains that the named chat provider receives messages. If details fail, show a reload action and block sending/retrying rather than name a provider incorrectly. Saved history, deletion and Support remain usable. No keys or private settings reach the phone.

Enable Zero Data Retention in Groq's organization Data Controls before real-user conversations. Groq's documentation says this disables reliability/abuse content retention; usage metadata remains collected. Free-tier quotas apply to the organization/model, not each Solace user; check the Groq console as limits may change. Automated tests never call real models.

Deploy this backward-compatible backend first using the existing Render variables. Then change all four LLM variables to Groq together and redeploy. Confirm `/v1/chat-provider` reports Groq before phone send/reopen/continue/delete QA. This change requires no database migration or native rebuild.

## Official references

- https://console.groq.com/docs/openai
- https://console.groq.com/docs/reasoning
- https://console.groq.com/docs/api-reference
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/your-data

## Deployed verification

After PR #7 merged and the user updated Render, the API reported Groq and database readiness. On vivo V2168, the saved QA turn retried successfully without duplication; its reply survived force-stop/reopen, a follow-up used the same conversation context, and confirmed deletion persisted after refreshing history. Full accessibility, offline and long-history release QA remains listed in the manual checklist.
