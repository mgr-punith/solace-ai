# Solace: assessment against the hackathon brief

Reviewed 8 November 2026. Source: [official Solace AI Hackathon Task](https://humanity-founders.notion.site/solace-ai-hackathon-task). This assessment covers the written brief, current source and actual vivo Android 14 testing. The embedded reference video was not evaluated. Scores below are subjective product judgments, not an official rubric or a prediction of ranking.

**Verdict: a solid functional prototype, about 6.5–7/10 overall; not yet a distinctive, connected AI wellness experience.** Engineering is ahead of the product experience. The recent density, buttons, Back and Sol changes improve usability, but polishing decoration alone will not close the main gap.

## What the brief actually prioritizes

The brief explicitly asks for an AI experience that is “more than a regular chatbot,” retained conversations, functional notifications while closed, a simple daily journey, a working API-driven backend and a beautiful, personal mobile experience. It also says “Doing one part extremely well is better than doing everything poorly” and “You are not required to reproduce every existing feature.” Assessments, plans, achievements, resources and other listed ideas are options, not a compulsory feature checklist. Submission requires an APK and demo video; TestFlight is later.

The generic “follow, post, message” line conflicts with the wellness-specific scope and looks like reused template language. Do not add a social network because of that line; clarify only if the organizers say those flows apply.

## Current position

| Area                                | Judgment                    | Evidence and limit                                                                                                                                                                                                                                                                                                      |
| ----------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional foundation               | Strong, roughly 8/10        | Real Google session, Render API, Neon persistence, chat history/continue/delete, mood history, breathing saves, favorites and reminders. 186 automated tests pass. Real closed-app reminder tap and original-data preservation confirmed. Clean-install auth, iOS and broad device coverage remain release checks.      |
| UI and daily usability              | Improving, roughly 6.5/10   | Consistent type/icons, quieter composition, useful buttons, clear selected tabs and working Android Back. Still too much explanation, repeated choices and long setup screens. First impressions are calmer, but not yet notably distinctive.                                                                           |
| AI intelligence and personalization | Biggest gap, roughly 4.5/10 | Groq replies work and retain the current thread. Server context is limited to at most 20 recent messages and a byte budget. It does not include check-ins, preferences, cross-conversation memory or summaries; there are no structured activity suggestions. The prompt explicitly forbids claiming other-chat memory. |
| Companion and emotional engagement  | Promising, roughly 6/10     | Original Sol, mood color/expression, wave/smile/wink and hold-to-breathe. These are local scripted interactions. Sol's animation is not evidence that the AI understands the person; expression and chat state need a meaningful connection.                                                                            |
| Submission readiness                | Partial                     | Signed standalone APK exists and is installed. No finished demo video yet. Focused device QA passes; full accessibility/performance/clean-install checklist remains open.                                                                                                                                               |

## What is good and should stay

- Real end-to-end behavior: this is more than a collection of mock screens. Chat replies, persistence, deletion and reminders are visible on a real phone.
- A restrained, consistent visual foundation and original Sol character. Keep the Fraunces/Figtree pairing, sea-glass actions and one coherent icon family.
- Breathing can become the signature moment. It already has timed guidance, background pause, explicit resume and saved progress.
- Privacy controls, explicit consent, safety handling, recoverable errors and retry idempotency. These earn trust even when they are not the most visible part of the demo.
- Existing local build workflow and backend. A framework/provider rewrite would consume effort without fixing the product gap.

## What to remove, hide or postpone

1. **Repeated explanatory prose and generic wellness phrases.** “A little space,” “a little room” and “a moment for you” recur without telling users what happens next. Use concrete labels and context-sensitive copy.
2. **Persistent provider paragraphs inside the composer.** Explain processing before the first send and keep privacy details one tap away. Preserve transparency while returning space to the conversation.
3. **An actionable memory toggle for an unavailable feature.** Until memory actually works, avoid presenting it as an enabled capability. When implemented, make consent real and add visible, deletable memories.
4. **Redundant destinations.** The reminder landing page currently adds a tap before the actual affirmation or breathing screen. Deep-link to the relevant feature; never auto-start a timer. Consider four primary tabs—Today, Sol, Wellness, Progress—with profile/settings accessible from the header, after validating discoverability.
5. **Advanced setup before the first breathing session.** Lead with a sensible one-minute rhythm. Put pattern, duration and optional mood detail behind “Customize.” Keep controls available after starting.
6. **Extra scope now:** assessments, badges, challenges, a resources library, elaborate plans, more AI providers, Skia rewrites or additional ambient animation. None solves our biggest weakness.
7. **Future-facing promises and development copy.** The release already hides the design preview. Keep implementation details, inactive-feature discussion and technical phrasing out of main product flows where a concise explanation is enough.

Do not remove history/deletion, reminders, accessibility, privacy, safety support or error recovery to make the demo shorter.

## The improvements that would change the whole app

### 1. Connect one daily loop first

A user checks in as Low and selects Tired. With explicit consent, Sol can reference that recent check-in without guessing or diagnosing, ask one relevant question and offer one optional action. A structured “Try a one-minute breathing break” button opens the existing breathing setup. After completion, show a simple optional reflection and record the action in Progress. Returning tomorrow should feel like continuity, with clear controls over what is remembered.

Acceptance: the suggestion actually follows the saved check-in; declining is easy; deep-link works; only completed saves count; disabling personalization prevents use of that context. Keep the emotional outcome primary, not the streak.

### 2. Make chat feel like a conversation

Open the recent thread immediately or offer an obvious resume action. Replace identical “Conversation with Sol” titles with useful, privacy-conscious labels. Use a compact inline send control, more room for replies and reliable scrolling to the latest reply while respecting someone reading older messages. Reveal chat history through a clearly labelled control. Review actual responses for repetitive reflection/questions and generic encouragement; a stronger experience comes from context and response quality, not just model choice. Streaming is secondary if fast complete replies feel responsive.

### 3. Give Sol a purpose in each state

Welcome on arrival, react to a selected mood, attend while composing, show a restrained thinking response and guide breathing. Taps remain playful but do not pretend to be generated conversation. Keep Reduce Motion and haptics preferences. Replace exaggerated reactions to difficult moods with a steady, caring expression.

### 4. Simplify Home, reminders and Progress

Home should answer “What would help me now?” with one dominant next action; stop repeating the same invitations after completion. Use a preferred display name and a natural late-night greeting. Reminders should start with one useful choice and an accessible time picker, with weekday/quiet-hour controls available when needed. Progress should lead with a short, factual week summary and a readable chart, moving raw history below or behind a clear link; never invent psychological insights from a few points.

### 5. Prove the finished story

Before adding more scope: test first-run onboarding and Google auth, fresh install, offline/retry, large text, TalkBack, Android Back, closed-app notification taps and actual frame behavior on the final APK. Record a short demo that demonstrates the connected loop, persistence and control. A smooth 90–120 second story will communicate quality better than a tour of every settings screen.

## Recommended order

1. Keep the current polished APK as the stable baseline and merge the reviewed UI/navigation fix.
2. Build consent-based mood context plus one structured breathing suggestion as the next small vertical slice.
3. Add user-visible/deletable memory and summaries, with clear opt-out behavior.
4. Tighten chat, Home and reminder entry points around that loop; then complete release QA and record the demo.

Do not begin a broad redesign or a collection of new wellness modules. The highest-value change is making the existing parts understand and support the same user journey.
