# Solace AI

Solace is a mobile wellness companion named Sol. It helps people check in with their mood, talk through their day, and return to small caring routines. It is a companion, not a therapist or medical device.

Build phase by phase with an Android phone as the primary test device. The first complete product must support Google sign-in, mood check-ins, persistent chat and history, and scheduled reminders. Breathing, affirmations, progress, and consent-based personalization follow. The final deliverable is an installable Android APK and a demo video.

The proposed visual direction lives in [design/DESIGN.md](design/DESIGN.md): a quiet sky that follows local time, Sol as a warm expressive character, and a short daily ritual without guilt or pressure. Its prototype is reviewed on a real phone in Phase 2.

Technology: React Native and Expo, Express and TypeScript, Neon Postgres with Drizzle, Render hosting, and VyceAi's OpenAI-format API. Keys and sensitive data stay on the server. The user controls personalization and deletion.
