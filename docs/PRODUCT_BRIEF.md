# Solace AI

Solace AI is Punith Moger's personal open-source project under the MIT license. Its AI companion, Sol, helps people check in with their mood, talk through their day, and make time for a small break. It is a companion, not a therapist or medical device.

The current Android app includes Google sign-in, mood check-ins, persistent chat and history, local scheduled reminders, breathing, affirmations, weekly progress, and four rotating daily questions with participation points. Sol uses the current conversation. Cross-conversation memory needs fresh consent and inspect/delete controls before implementation.

The established visual direction lives in [design/DESIGN.md](design/DESIGN.md): a sky that follows local time, Sol as an expressive character, and a short daily routine without guilt or pressure. The design uses sea-glass accents, Fraunces and Figtree, and shared tokens. The [README](../README.md) contains the user guide, app screenshots, APK, walkthrough, and build history.

Technology: React Native and Expo, Express and TypeScript, Neon Postgres with Drizzle, Render hosting, and Groq's OpenAI-compatible API. Provider and database credentials stay on the server; chat messages go to the configured provider for replies. Sharing a saved check-in or reflection opens an editable draft that the user sends explicitly. Users can delete their check-ins, conversations, and account data.

Build in small tested slices, use code review and meaningful device checks, and record outstanding work in [qa-checklist.md](qa-checklist.md). The public preview uses Render's free tier, so its first request after inactivity can take about a minute or more.
