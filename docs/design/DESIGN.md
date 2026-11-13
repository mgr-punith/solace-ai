# DESIGN.md — Solace AI

Source of truth for every visual and interaction decision. Status: **v1 approved provisionally on 6 November 2026; the user asked to continue with splash and onboarding.** If you need to deviate, propose the change and update this file first.

Phase 1 uses the existing foundation tokens for a temporary sign-in and signed-in account screen. It uses Google's native branded button, a plain privacy/care notice, loading and recoverable error states, sign-out, and confirmed account deletion. Full onboarding, profile questions, fonts, sky, and mascot remain Phase 2 work. The Phase 2 prototype gate applies to the full visual implementation; it does not block the earlier authentication slice.

The native Google sign-in button is required on both iOS and Android, including iOS builds distributed through TestFlight. Keep the existing full-width branded button, theme, pending state and recoverable errors. Only browser previews show “Open the iOS or Android app to sign in with Google.”

```text
+----------------------------+
| Solace                     |
| Take a breath. You're here.|
|                            |
| Sign in to keep your space.|
| [ Sign in with Google    ] |
| Care and privacy notice    |
+----------------------------+
| Welcome, Maya.             |
| Your space is ready.       |
| [ Sign out               ] |
| [ Delete account         ] |
+----------------------------+
```

## 1. Design idea

> **A quiet sky, and a small friend who is glad you're here.**

Three pillars:

1. **Sky.** The whole app sits on a soft gradient that follows the user's local time (first light, day, dusk, night). Opening the app at 8 am and at 11 pm feels different. This is the app's ambient identity, and it costs almost nothing to run.
2. **Sol** (working name, from *Solace*; the user may rename it, keep it in one constant `COMPANION_NAME`). A small glowing character with a face. It greets, listens, reacts to mood, guides breathing and delivers suggestions. **This is where boldness is spent.** Everything else stays quiet.
3. **Ritual.** A daily loop that takes under 60 seconds, always ends with closure ("that's enough for today"), and is never boring because something small is new each day (§9).

Feelings to evoke: calm, held, unhurried, a little bit delighted. Never clinical, never childish, never pushy.

Avoid the generic wellness look: stock blue-to-purple gradients, cream plus terracotta, identical rounded cards with the same grey shadow, decorative gradient washes, ALL-CAPS tracked labels, a lone accented word in headlines.

## 2. Color

Base palette (names are for communication; code uses semantic tokens):

| Name | Hex | Role |
|---|---|---|
| Dawn Mist | `#EEF3F2` | Light base surface |
| Sea Glass | `#9CC9BF` | Primary calm accent, buttons, user bubbles |
| Deep Tide | `#1F3A44` | Primary text (day), dark accents |
| Rose Quartz | `#F2B6C1` | Loving accent: blush, hearts, favorites, highlights |
| Lantern | `#FFD58A` | Sol's glow, success warmth, streak glow |
| Night Ink | `#0F1A24` | Dark base |

**Sky keyframes** (interpolate continuously by minute of the local day with `interpolateColor`; never hard-switch):

| Time | Top | Bottom | Name |
|---|---|---|---|
| 00:00 | `#17283A` | `#0E1A26` | Night |
| 05:30 | `#3B4A63` | `#C9A3A8` | First light |
| 07:30 | `#F3D6D2` | `#CFE6E1` | Dawn |
| 11:00 | `#D3EAEE` | `#F1F6F0` | Day |
| 16:00 | `#D9ECEA` | `#F3E3DA` | Afternoon |
| 18:30 | `#EBBFC6` | `#8C9DB8` | Dusk |
| 20:30 | `#2B3550` | `#141F2D` | Evening |

Wrap 20:30 back to 00:00 smoothly. User setting: Auto / Always day / Always night.

**Text and surfaces**

| Token | Day | Night |
|---|---|---|
| `text.primary` | `#1F3A44` | `#EAF3F2` |
| `text.secondary` | `#4B6670` | `#B7CBD0` |
| `text.disabled` (exempt from contrast rule) | `#9DB0B6` | `#5E7480` |
| `surface.glass` | `rgba(255,255,255,0.62)` | `rgba(255,255,255,0.08)` |
| `surface.glassBorder` | `rgba(255,255,255,0.80)` | `rgba(255,255,255,0.14)` |
| `action.primary` bg / text | `#9CC9BF` / `#12303A` | `#9CC9BF` / `#0F1A24` |
| `feedback.error` | `#B4536A` (soft clay-rose, never alarm red) | `#E59AAB` |

**Mood scale** (never rely on color alone: always pair with a label and a face shape):

| 1 Heavy | 2 Low | 3 Okay | 4 Good | 5 Glowing |
|---|---|---|---|---|
| `#7C8FB8` | `#8FB3C4` | `#9CC9BF` | `#E3D58F` | `#FFC76B` |

**Contrast rules.** Body text ≥ 4.5:1. Text on the bare sky only if it is ≥ 24sp and ≥ 3:1 at *every* time of day; everything smaller sits on a glass surface. The dev build ships a **time-travel slider** (`__DEV__` only) so you can check 06:00, 19:00, 19:30, 20:00 and the rest. The sky interpolates continuously. Text and its backing surface change together between day and night; do not crossfade foreground text through a low-contrast midpoint. Body text uses a stable, sufficiently opaque surface.

## 3. Typography

Two families via `@expo-google-fonts/*` (verify the package names exist; fall back to the closest soft serif/humanist sans if not):

- **Fraunces** (soft serif): greetings, titles, affirmations, Sol's big moments. Weight 500.
- **Figtree** (friendly geometric sans): everything functional.

| Style | Font | Size / line | Notes |
|---|---|---|---|
| `display` | Fraunces 500 | 34 / 40 | Home greeting, splash tagline |
| `title` | Fraunces 500 | 26 / 32 | Screen titles, affirmation text |
| `heading` | Figtree 600 | 20 / 26 | Section headers |
| `body` | Figtree 400 | 17 / 26 | Chat and content |
| `bodySmall` | Figtree 400 | 15 / 22 | Secondary text |
| `caption` | Figtree 500 | 13 / 18 | Timestamps, hints (sentence case) |
| `button` | Figtree 600 | 17 / 20 | Letter-spacing 0 |

Sentence case everywhere. No all-caps labels. Support dynamic type up to 130% without clipping.

## 4. Spacing, radii, surfaces

- Spacing scale (4-pt): `4, 8, 12, 16, 20, 24, 32, 40, 56`. Screen horizontal padding `24`. Generous vertical rhythm; when in doubt add space.
- **Radii differ by role** (not one radius for everything): buttons and chips `pill`, glass surfaces `28`, inputs `22`, sheets `32` top, small tags `12`.
- **Glass, not drop shadows.** Surfaces are translucent fills with a 1 px light border. Glow shadows only for Sol and primary actions, tinted (Sea Glass or Lantern at ≤ 25%), never grey.
- **Android:** blur is costly and inconsistent. On Android use a more opaque tinted fill (day `rgba(255,255,255,0.78)`, night `rgba(24,38,52,0.72)`); use real blur (`expo-blur`) on iOS only, or on Android only if proven smooth on a mid-range phone.
- Vary the *form* of home content so it never looks like a stack of identical cards (see Home).

## 5. Motion and haptics

| Token | Value | Use |
|---|---|---|
| `dur.press` | 120 ms | Press feedback |
| `dur.quick` | 220 ms | Small state changes |
| `dur.calm` | 420 ms | Screen transitions, sheets |
| `dur.slow` | 700 ms | Sky shifts, Sol mood morphs |
| `ease.out` | `bezier(0.22, 1, 0.36, 1)` | Entrances |
| `spring.gentle` | damping 18, stiffness 120 | Layout, Sol |
| `spring.press` | damping 15, stiffness 220 | Buttons (scale to 0.97) |

Rules: motion answers a user action, **except** two ambient things: Sol idling and the sky. No staggered fade-in on every section. Everything runs on the UI thread. **Reduce Motion** replaces motion with crossfades and a static Sol.

**Haptics** (one wrapper, user-toggleable): mood dot step → `selection`; mood saved → soft `success`; Sol tapped → light impact; breathing → soft impact at each phase change (inhale, hold, exhale); destructive confirm → warning. Never haptics on scroll or passive events.

## 6. Sol, the companion

Built with `@shopify/react-native-skia`, driven by Reanimated shared values. **Time-box the prototype to about half a day; if it janks on a mid-range Android phone, use the fallback** (`react-native-svg` + Reanimated, same states, simpler glow).

**Look.** A soft, slightly organic blob (circle radius perturbed by slow noise, about 2.5%), radial gradient from Lantern at the core to the current *mood tint* at the edge, a blurred glow behind it, two simple oval eyes in Deep Tide, a small curved mouth, two Rose Quartz blush circles at 35% opacity. Friendly and warm, not a corporate "AI orb".

**Mood tint.** Blend the mood color at about 30% into Sol's edge gradient; morph over `dur.slow`.

**States**

| State | Trigger | Behavior |
|---|---|---|
| `idle` | Default | Scale 1↔1.03 over 6 s, float ±4 dp over 7 s, random blink every 3.5–7 s (140 ms) |
| `greeting` | Screen focus, first open of the day | Small hop, eyes glance at the user, mouth smiles |
| `listening` | Chat input focused | Leans toward input, eyes widen slightly |
| `thinking` | Awaiting AI reply | Eyes look up-right, 3 tiny light motes orbit slowly |
| `speaking` | Reply streaming or arriving | Soft pulses at word arrival |
| `caring` | Mood 1–2 or sad content | Dimmer glow, softer eyes, slower motion, no bounce |
| `celebrating` | Milestones only (rare) | One light bloom and gentle sparkle |
| `sleepy` | After 22:00 or night mode | Half-closed eyes, dim glow, occasional yawn |
| `breathing` | Breathing session | Eyes closed; scale follows the breath guide (0.72 → 1.0) |

**Delight.** Tapping Sol squishes it and plays a light haptic with a happy blink. Pull-to-refresh on Home stretches Sol. After 22:00 Sol yawns when you open the app.

**Sizes.** `hero` 220 dp (Home, breathing), `compact` 56 dp (chat header, thinking indicator), `mini` 28 dp (message avatar).

**Performance.** One Skia canvas per Sol instance, at most about 25 draw operations, no React state in the loop, paused when the screen is unfocused or the app is backgrounded.

## 7. SkyBackground

- One `SkyBackground` component mounted **once in the root layout** (never per screen) so there is no flash between screens.
- Vertical gradient from the keyframes in §2, updated once per minute.
- Optional: two very large blurred light blobs drifting extremely slowly at ≤ 12% opacity; at night, at most 6 faint stars with a slow twinkle. Both disabled with Reduce Motion.
- Status bar style follows day/night.

## 8. Navigation and screens

**Floating glass tab bar** with five tabs: **Home · Wellness · Talk (center, a small Sol face; opens chat) · Progress · You**. Native sheets (Expo Router modal / form sheet) for check-in details and pickers; avoid a bottom-sheet library unless needed.

### Splash
Native splash: static Dawn Mist with the Sol mark (night variant for dark mode) → animated splash fades to the live sky. Sol wakes (eyes open, glow blooms), tagline in Fraunces: *"Take a breath. You're here."* **First launch ≤ 2.2 s; every launch after ≤ 0.9 s**, tap to skip. Never make daily openers wait.

### Onboarding (4 screens, skippable, progress dots, one pill CTA)
1. **Meet Sol.** "Hi, I'm Sol. I'm here to listen, help you find your calm, and remember what helps."
2. **Notice how you feel.** Interactive: five mood dots; tapping one changes Sol's color and face live. "A few seconds a day shows patterns you can't see in the moment."
3. **Talk it through.** Animated sample chat where Sol replies and offers a suggestion chip. "Say what's on your mind. I'll listen first, then offer small things that might help."
4. **Yours, and private.** "You choose what I remember." · "Delete anything, anytime." · "I'm a caring companion, not a therapist. If you're in crisis, I'll point you to people who can help." Consent toggle: *"Let Sol remember what helps me"* (off by default, explained). CTA: **Continue with Google**.

### Sign-in and profile setup
Follow Google's button branding rules. After sign-in, three light steps in one flow: *"What should I call you?"* (prefilled), *"What brings you here?"* (chips: stress, sleep, focus, low mood, just curious), *"When would you like a gentle check-in?"* (time picker, then the notification permission priming screen). End with Sol: *"Nice to meet you, Maya."*

### Home
```
+----------------------------+
| Thu, 5 Nov             (A) |
|                            |
|        (  Sol 220  )       |
|                            |
|   Good evening, Maya.      |  display
|   Tuesday felt heavy.      |  Sol's line (memory
|   How are you arriving?    |  callback if consented)
|    o   o   o   o   o       |  5 mood dots
|                            |
|  +- Sol suggests --------+ |  one glass card,
|  | 3 minutes of slow     | |  one action
|  | breathing    [Begin]  | |
|  +-----------------------+ |
|  Take a moment             |
|  [ Breathe ]  "a serif     |  different forms:
|  live mini    affirmation  |  breathe = live mini-Sol pill,
|  Sol          of the day"  |  affirmation = text-forward,
|  [ Reflect: a prompt ]     |  reflect = ruled-line note
|  Days with Sol  o o o . .  |  7 soft dots
|  Home Well (Talk) Prog You |
+----------------------------+
```
- Mood dots: tap saves immediately (optimistic, soft haptic, Sol morphs). A native sheet then *optionally* offers emotion tags and a note ("Add more"). The fast path takes about 5 seconds.
- After check-in the mood row collapses into Sol's response and two chips ("Talk about it", "Breathe first").
- After check-in plus one activity, show the closure card: *"That's enough for today. See you tomorrow."*

### Chat (Talk)
```
+----------------------------+
| (Sol 56)  Sol          ... |  menu: history, new chat, need support
|                            |
|  (s) That sounds tiring.   |  Sol: no bubble, body text,
|      What part of the day  |  mini avatar on first of a group
|      felt heaviest?        |
|           [ Breathe 3 min ]|  suggestion chip(s)
|                            |
|      Mostly the meeting. ->|  user: Sea Glass bubble
|                            |
| ( Say anything...    (o) ) |  floating glass composer
+----------------------------+
```
- Empty state: Sol says "Say anything. I'm listening." plus three starter chips chosen by time of day and last mood ("I feel anxious", "I need to vent", "Help me wind down").
- Typing indicator is compact Sol in `thinking`. Failed send shows an inline "Tap to retry" and never loses text. Keyboard uses `react-native-keyboard-controller` so the composer rides smoothly.
- Suggestion chips deep-link into breathing, affirmation, reflection or challenge.
- Menu always includes **Need support now?** (helplines from config).

### Chat history
Grouped *Today / Yesterday / Earlier*. Row: AI-written title, first line, time. Tap to continue. Swipe to delete with an **undo snackbar** (delay the API call until the undo window of about 5 s expires). "New conversation" is a prominent button.

### Breathing
Full screen, Sol at hero size, sky slightly dimmed. Phase word in Fraunces ("Breathe in", "Hold", "Breathe out"), a thin progress ring, soft haptic at each phase change. Patterns: **Box** 4-4-4-4, **Calm** 4-7-8, **Coherent** 5.5 in / 5.5 out. Durations: 1, 3, 5 min. Optional ambient sound is P2. End: *"Nice. How do you feel now?"* with a mini mood row; the **before/after mood** is logged and later shown in Progress (a strong demo moment).

### Wellness
Four distinct sections, not identical tiles: **Breathe** (patterns), **Affirmations** (today's, saved favorites), **Reflect** (today's prompt opens a guided reflection with Sol, stored as a conversation of type `reflection`), **Tiny challenge** (one per day, mark done with a soft bloom). Plans are P2.

### Progress
Week mood line (custom, soft area under the curve, dots tinted by mood), month "days with Sol" dots, breathing minutes, before/after mood improvements, and a weekly note written by Sol ("This week you felt best on days you walked."). Milestones at 3, 7, 14 and 30 days.

### You
Profile, **Reminders** (per type: on/off, time, days, quiet hours), **What Sol remembers** (view/delete, personalization toggle), Appearance (Auto/Day/Night), Haptics, **Need support now?**, Data (export, delete account), About and "not a substitute for professional care".

### Phase 5 reminder slice

Keep the existing sky, Sol and tokens. You → Reminders opens a scrollable settings screen. Every type starts off. One chosen time per type and selected weekdays keep this first slice small; quiet hours skip matching reminders rather than moving them to another day. Times follow the phone's local timezone. Save updates the encrypted device cache and account; a visible pending-sync state offers retry. Saving preferences does not itself request permission: a separate explanation and **Allow notifications** action does.

Mood notifications open Home. Until Phase 6 introduces full activities, other types open a small reminder page containing their affirmation, gentle breathing invitation, self-care prompt or custom text, with actions to check in or talk with Sol. Do not claim that a breathing timer or activity logging exists. Notification contents are visible on the lock screen; tell the user beside the custom-text input. No engagement tracking or escalating reminders in this slice.

```text
Reminders                    Reminder
+-----------------------+    +-----------------------+
| Back        Reminders |    | Back              Sol |
| Choose a gentle nudge |    | A moment for you      |
| Allow notifications   |    | [reminder's message]  |
| Mood / Affirmation /  |    | Check in              |
| Breath / Care / Custom|    | Talk with Sol         |
| On/off · Time · Days  |    | Edit reminders        |
| Quiet hours · from/to |    +-----------------------+
| Save reminders        |
| Saved / pending sync  |
+-----------------------+
```

## 9. Daily ritual and retention (ethical by design)

Goal: people open the app daily because it is fresh, kind and quick, not because of guilt.

1. **Under 60 seconds, with closure.** Open → Sol greets → one-tap mood → Sol responds → one small suggestion → *"That's enough for today."* No infinite feeds, no bottomless content.
2. **Something new each day:** a new affirmation, a new tiny challenge, a Sol line that references something real (if memory is consented), and a sky that is different at every hour.
3. **Gentle progress:** actual consecutive local days with a saved wellness action, a warm "welcome back" after a gap, and no streak-loss warnings. No artificial rest-day credit. Weekly AI notes and milestone moments are later enhancements.
4. **Reminders that respect people:** default at most one per day, user-chosen time and days, quiet hours. If three reminders in a row go unopened, Sol *asks* "Want me to check in at a different time?" instead of nagging.
5. **Relationship:** Sol remembers (with consent), has time-aware moods (sleepy at night), and reacts to being tapped.
6. **P2 delights:** seasonal sky tints, small cosmetic unlocks for Sol, ambient breathing sounds.

Never: guilt copy, fake urgency, countdowns, streak-loss threats, red badges that don't mean something.

## 10. Voice and content

**Sol's voice:** warm, plain, short (one to three sentences), reflects before suggesting, asks at most one question, no clichés ("everything happens for a reason"), no medical claims, never pretends to be human.

| Moment | Copy |
|---|---|
| Mood prompt | "How are you arriving?" |
| Empty chat | "Say anything. I'm listening." |
| Check-in saved | "Got it. Thanks for telling me." |
| Network error | "I can't reach the server. Your message is saved, and I'll try again when you're back online." |
| After a gap | "Welcome back. No pressure, I'm glad you're here." |
| Delete conversation | Snackbar: "Conversation deleted. Undo" |

Buttons state the result ("Save check-in", not "Submit"). Errors say what happened and what to do, with no over-apology.

**Content to author (original, not copied from quote sites):** 60 affirmations (`content/affirmations.json`, grounded and specific rather than grand), 30 reflection prompts, 30 tiny challenges ("Name three things you can hear"), breathing pattern definitions. Use short, human lines; no medical or outcome promises.

## 11. Stability and performance bar ("no glitches")

1. Hold the native splash (`SplashScreen.preventAutoHideAsync`) until fonts are loaded, the session is restored from SecureStore, and the first Home data is read from cache. No flash of unstyled text or the wrong screen.
2. **Home opens instantly** from a persisted TanStack Query cache, then refreshes silently.
3. **Optimistic UI** for mood save and chat send; failures are recoverable inline.
4. Skeletons shaped like the final content; reserve space to prevent layout shift.
5. One `SkyBackground` in the root layout, never remounted.
6. Animation only on the UI thread (Reanimated worklets/Skia). No `setState` in animation loops. Pause when unfocused or backgrounded.
7. FlashList for chat and history, stable keys, memoized rows; `expo-image` with fixed sizes.
8. Error boundaries per route group, a quiet global offline banner, never a raw error.
9. **Budgets, measured on a preview/release build on a mid-range Android phone** (not the dev build): cold start to interactive ≤ 2.5 s; 60 fps on Home, Chat and Breathing (use the Perf Monitor); tap feedback < 100 ms.
10. Test on a small phone (about 360×640 dp), a large phone, 130% font size and Reduce Motion.

## 12. Accessibility

Contrast per §2; touch targets ≥ 44 pt; every interactive element has an accessibility label and role; mood dots expose their label ("Okay, 3 of 5"); dynamic type; Reduce Motion fallback; haptics optional; never color alone; screen-reader-friendly chat order.

## 13. Assets

- **App icon:** Sol's face on a Sea Glass → Lantern gradient. Provide Android adaptive layers (foreground, background, monochrome) and a 1024 px iOS icon. Keep the source SVG in `assets/source/` and generate PNGs by script.
- **Splash:** Sol mark, static, matching the native splash colors.
- Sol itself is drawn in code (no raster mascot to export).

## 14. Design QA checklist (run on every UI slice)

- [ ] Uses tokens only; matches this file
- [ ] Looks right at 06:00, 12:00, 19:30, 23:00 (time-travel slider) and in forced day/night
- [ ] Contrast and ≥ 44 pt targets; labels present
- [ ] Loading, error and empty states designed
- [ ] Reduce Motion path works; haptics respect the setting
- [ ] Keyboard never covers or jumps the composer
- [ ] No layout shift, no flash on launch or navigation
- [ ] 60 fps on a real mid-range Android (preview build)
- [ ] Copy follows §10

**Screenshot loop.** Inspect phone screenshots through ADB when available. Otherwise the user provides a screenshot or short screen recording; compare it with this file and fix mismatches before moving on.

## 15. Phase 2 prototype gate

Before building any other screen, build and show: `theme/tokens.ts`, `SkyBackground`, Sol with `idle`, `greeting`, `thinking` and `breathing`, and a skeleton Home. Record about 20 seconds on a real phone. The user approves or adjusts the direction. Only then continue. If Skia is janky, switch to the SVG fallback and record the decision in `docs/decisions/`.


## 16. Phase 2a preview implementation

The user confirmed the existing sky + Sol direction on 6 November 2026. Build the §15 preview first; splash, onboarding, saved check-ins, and real Home follow after the phone review. The preview is available only in development, from the signed-in account screen and `/design-preview`. Mood choices in this preview change Sol without saving health data.

The preview uses SDK-compatible Skia 2 and Reanimated 4, bundled Fraunces/Figtree fonts, one root sky, and shared text, button and surface components. The Home sketch has a Sol hero followed by a single reading surface, an interactive mood row, a short breathing preview, and a text-led affirmation. Do not show inactive navigation tabs or fabricate streaks. Preview controls are separated below the sketch and hidden outside development: time slider, Auto/Day/Night, four Sol states, Reduce Motion, and Haptics.

```text
+----------------------------+
| [Back]         [Fri, 6 Nov] |
|                            |
|        ( glowing Sol )     |
|                            |
| Good evening, Puneet.      |
| Take a breath. You're here.|
|                            |
| How are you arriving?      |
| o    o    o    o    o      |
| Heavy Low Okay Good Glowing|
|                            |
| [Take a slow breath]       |
| You can take this moment   |
| one breath at a time.      |
+----------------------------+
| Preview controls           |
| Sky time  ---o---------    |
| Auto / Day / Night         |
| Rest / Greet / Think /     |
| Breathe                    |
| Reduce Motion     [toggle] |
| Haptics           [toggle] |
+----------------------------+
```

Readability correction: use 94% Dawn Mist or Night Ink for the main reading surface so all body, secondary and feedback text meets 4.5:1 across the sky. Day error text is deepened to `#914359`; the previous `#B4536A` did not reliably meet body-text contrast. Large greetings use the same safe surface. The sky remains visible around the character and page edges. Day/night foregrounds and their surfaces switch together; only the sky and mascot colors interpolate. Tests sample every local minute and surface position.

Use EAS **local Android builds** with the existing signing profile on this Linux machine (the user confirmed local builds). No phone was attached at implementation start. Real-device performance and the roughly 20-second recording remain the gate; browser rendering and automated tests cannot establish 60 fps on Android.


## 17. Phase 2b splash, onboarding and privacy

The user accepted the current direction as “okayish” and asked to move on. Continue the existing tokens and character, with later visual refinement allowed. The release performance check remains pending; it does not block this authorized slice.

Native launch shows the static Sol mark on Dawn Mist / Night Ink. A short in-app greeting bridges into onboarding; returning visits spend no more than 700 ms on it. Reduce Motion skips this greeting delay. Loading and recovery text appear if local storage or session restoration is slow; never wait indefinitely on a decorative splash.

Four pages introduce Sol, a practice mood choice (never saved), a clearly labeled example conversation, and privacy. Back preserves progress; **Skip intro** goes directly to privacy. The final page always explains that Sol is an AI companion and not a substitute for professional care. Personalization is off by default. Saving is explicit, with a recoverable error if secure storage fails. A signed-out visitor proceeds to Google's branded sign-in; an existing signed-in user continues to their account screen.

The onboarding header uses equal left and right action zones so the progress pill stays at the true horizontal center even when “Back,” “Close,” and “Skip intro” have different widths. Keep the four markers and “1 of 4” together as one compact control. Onboarding cards start directly with their title; decorative sparkle, heart, chat and privacy icons do not sit above the copy. The practice check-in remains inline inside page 2 and never opens a modal.

Local scope for this slice: onboarding progress is installation-wide, and the personalization preference is saved separately for each account in SecureStore. A pending pre-sign-in choice may be claimed once by the next signed-in account; it must never silently transfer to another account. Account deletion clears its local preference, and privacy settings allow changing the choice. No memory collection or LLM call is enabled by this preference yet. On Android reinstall or a new device, users choose again. iOS Keychain may persist through reinstall; do not assume it clears there. Phase 7 must migrate preferences to the backend and implement memory view/delete before using personalization.

```text
Splash                 Meet Sol / Notice / Talk
+------------------+   +-------------------------+
|                  |   | Back    1 of 4   Skip   |
|    (Sol mark)    |   |         (Sol)           |
| Take a breath.   |   | A little space for you. |
| You're here.     |   | Short plain explanation|
|                  |   | Example / practice     |
| [Continue]       |   | [Continue]              |
+------------------+   +-------------------------+
Privacy                Account / sign-in
+------------------+   +-------------------------+
| Back     4 of 4  |   | (Sol) Welcome, name.     |
| Your choice.    |   | Your space is ready.    |
| AI + data notice|   | [Privacy and memory]    |
| Remember [off]  |   | [Review introduction]   |
| Local preference|   | [Sign out] [Delete]     |
| [Save & continue]|  | Or Google's sign-in    |
+------------------+   +-------------------------+
```

Profile questions and reminder permission are deferred to their functional slices: Home/profile and reminders. Avoid collecting goals or notification times before they are used. These screens do not claim that chat or saved check-ins exist yet; the demo conversation is explicitly an example.


## 18. Phase 3 Home and saved mood

Keep the accepted sky, Fraunces/Figtree and Sol. Ship only functional tabs: Home, Progress (saved check-in history), You (account/privacy). Wellness and Talk join when their features work. Phase 3 uses an explicit Save check-in button after choosing a mood; this supersedes the earlier instant-save sketch to avoid persisting accidental exploratory taps. Optional emotion tags and a short note are revealed in the same scrollable form. Failed saves preserve input and offer retry; success appears only after the API confirms it. A request key prevents retries from duplicating an entry.

Home shows a name/time greeting, Sol, today's latest saved mood or a warm empty state, the check-in form and a link to history. No invented AI suggestions, streaks or activity completion. Progress lists actual entries with pagination and delete; charts and streaks remain Phase 6. Dates use the phone's IANA timezone, saved to the profile with each check-in. Reading today groups timestamps in the current timezone, including daylight-saving changes.

```text
Home                       Progress                 You
+----------------------+   +---------------------+  +--------------------+
| Date      (Sol)      |   | Your check-ins      |  | Welcome, name      |
| Good evening, Maya.  |   | Latest first        |  | Privacy and memory |
| How are you arriving?|   | Date / mood / tags  |  | Review intro       |
| Heavy ... Glowing    |   | Note     [Delete]   |  | Sign out           |
| [Add a little more]  |   | ... [Load more]     |  | Delete account     |
| tags / optional note|   | or: no entries yet  |  |                    |
| [Save check-in]      |   | [Check in]          |  |                    |
| Today: saved mood    |   |                     |  |                    |
| [View check-ins]     |   |                     |  |                    |
+ Home / Progress / You+   +Home / Progress / You+  +Home / Progress / You+
```

The query cache stays in memory, scoped to account ID, and clears on logout. Sensitive notes are not persisted in unencrypted cache storage. Auth restores independently of Home loading; a slow API displays recovery without holding the splash. This supersedes the earlier persisted-cache startup sketch for this slice.

## Phase 4 functional chat slice

Keep the accepted sky, Sol and typography. Add Talk beside Home, Progress and You. Talk opens saved conversations with a clear New conversation action. Each thread has a compact Sol text header, Chats and Support actions, a chronological virtualized message list with Load earlier messages, and a multiline composer. Use React Native FlatList already in the app rather than adding FlashList in this slice. KeyboardAvoidingView uses padding on both platforms, following SDK 58 edge-to-edge guidance.

```
Talk history                  Conversation
| Talk with Sol           |   | Back   Sol    Support |
| [New conversation]      |   | [Earlier messages]    |
| Nov 6 · Conversation    |   | You: ...              |
| [Continue] [Delete]     |   | Sol: ...              |
| Empty: start anywhere  |   | Thinking / retry      |
| Home Talk Progress You |   | [Message Sol...] Send |
```

Chat displays the AI provider currently configured on Render, fetched from the public `/v1/chat-provider` endpoint; it never guesses a provider when details cannot load. Send/retry waits for those details, with a reload action, while history and Support remain accessible. The notice explains that messages are saved in the account and sent to the named provider for replies; Sol is an AI companion, not a therapist. Context includes only this conversation. Cross-conversation memories, mood context and summaries wait for Phase 7's server-side consent and deletion controls. Failed sends preserve input or the saved user turn and retry the same request ID. Conversation deletion requires confirmation; no sensitive text appears in URLs or logs.

Support is available before sign-in and from every conversation. A country picker (India, United States, elsewhere) chooses configured, verified resources; it never infers location from timezone. The crisis path stays conversational and directs to trusted people or local emergency services. No calling happens automatically. Loading, empty, failed-send, deleted-thread and offline support states must remain recoverable.

## Phase 6 breathing, affirmations and progress

Keep the approved sky, Sol, Fraunces/Figtree and semantic tokens. Add the functional Wellness tab between Home and Talk. Home gains a short daily affirmation, a breathing shortcut and real days-with-Sol count. No AI-generated suggestions or summaries until Phase 7.

Wellness leads with a breathing invitation and links to today's original, curated affirmation and account favorites. Breathing offers Box (4/4/4/4), 4–7–8 (4/7/8), and Coherent (5.5/5.5), for 1, 3 or 5 minutes. The user may pause or stop at any time; the app pauses on losing focus or entering the background and requires an explicit resume. Time measures active practice, using a monotonic clock. Sol expands on inhale, stays still for holds and contracts on exhale. Text gives the phase and remaining time; a thin horizontal completion indicator supplements it. Reduce Motion keeps Sol static, with the same phase instructions. Haptics are optional and run through the existing wrapper. No medical benefit promises; breathe comfortably and stop if uncomfortable.

Completed practice offers optional before/after mood ratings and explicit Save session. Only completed, saved sessions count. Save failures retain the completion and retry key on this screen; leaving warns before discarding an unsaved session. Interrupted sessions are not logged. Affirmations rotate by the user's local date from 60 original lines, available offline in the app; explicit Mark as read logs a wellness action. Favorites are separate, account-owned and removable. Neither opening a page nor favoriting a line claims practice completion.

Progress adds seven local calendar days of average mood (gaps remain empty), activity-day indicators and breathing minutes, above the existing paginated check-in history. Every chart day also has a readable text label and value. Consecutive-day counts include mood check-ins, saved breathing sessions and affirmations explicitly marked read. Multiple actions count once per day. A streak ending yesterday remains current until today ends; a gap receives a warm welcome back. Dates are recomputed in the phone's current IANA timezone, so travel can regroup past actions. Server completion timestamps are authoritative; delayed saves count on the day saved. Deleting a mood removes that action from progress. Account deletion cascades activities and favorites. No extra persisted plaintext cache.

```text
Wellness                 Breathing                Affirmations
| A moment for you    |  | Back      Breathe    | | Today's words        |
| (Sol)              |  | Box / 4–7–8 / Coherent| | Original daily line  |
| Take a breathing   |  | 1 / 3 / 5 minutes    | | Mark as read         |
| break              |  |     (breathing Sol)   | | Save to favorites    |
| Today's words      |  | Breathe in / Hold /   | | Saved favorites      |
| Saved favorites    |  | Breathe out           | | line · Remove        |
| Home Wellness Talk |  | time · progress       | | loading/retry/empty  |
| Progress You       |  | Pause / Resume / Stop | +----------------------+
+--------------------+  | Complete · mood · Save|
Progress                 +-----------------------+
| Days with Sol · welcome back if needed |
| Last 7 days · mood and activity labels |
| Breathing minutes · saved sessions     |
| Your check-ins · existing history      |
+----------------------------------------+
```

Notification destinations keep their existing allowlisted reminder route for compatibility; breathing and affirmation reminder pages offer direct actions into the matching feature. No timer starts from a notification tap. Loading, unavailable-server, empty and retry states use existing stable reading surfaces; long labels wrap at enlarged text sizes.

## Phase 6 visual direction — a pocket of calm

The user delegated full-app UI/UX ownership on 7 November 2026, including icon selection. Refine the existing brand across onboarding, Home, Talk, Progress, Wellness and You. References inspected: [Headspace](https://www.headspace.com/) for clear hierarchy, succinct activity choices and expressive illustration; [Finch](https://finchcare.com/) for companion warmth and approachable daily actions. These are design references, not a claim about current app-store rankings. Calm's website denied access during research. Use original Sol artwork and copy; do not copy assets or screens.

Composition: a quiet reading background with the local-time sky informing the backdrop and Sol palette. The character, generous serif titles and sea-glass primary actions establish the first impression. Home starts with a compact date/profile row and a greeting beside Sol, followed immediately by the mood interaction. A featured breathing invitation, a typographic affirmation and a small progress row have different forms rather than repeating identical cards. Hide optional mood details until requested.

Use **Lucide** consistently: house, flower-2, message-circle, chart-no-axes-combined, user-round for the five tabs; wind for breathing; heart for favorites; bell for reminders; shield-check for privacy; life-buoy for support; chevrons for navigation. Stroke 1.8–2 at 22–24 dp, rounded caps, semantic colors. The selected tab icon sits in a sea-glass indicator; Talk follows the same selection rule as the other tabs. Tabs keep text labels. Icon-only controls have spoken labels and at least 48 dp targets. Lucide's maintained React Native package plus Expo-compatible SVG renderer replace placeholder shapes; this dependency earns its place through consistent app-wide navigation and actions.

Reading surfaces use a slightly smaller 24 dp radius, no grey shadows, and restrained borders. Reserve framed surfaces for grouped actions and content; headings and navigation rows should not each become cards. Primary buttons receive a short scale response via Reanimated; no motion when Reduce Motion is enabled. Every screen remains scrollable where needed. Chat uses distinct user bubbles and open Sol replies with a compact composer; history and settings use icon-led rows. Destructive actions stay clearly labeled and confirmed.

Visual QA correction: navigation scenes need an opaque base sampled from the current sky's lower color. Fully transparent retained scenes allowed the previous tab's text and controls to show through the next screen on web. The root sky remains the transition backdrop; each screen's calm opaque base prevents overlap. The greeting uses a small time-of-day line and a large name beside Sol so long greetings never break in the middle of a word. The tab bar reserves label height plus the device's bottom safe area.

### Phone sizing and navigation refinement

The first installed Phase 6 review found oversized text/icons and an ambiguous permanently highlighted Talk tab. Tighten the default scale: display 30/38, title 24/32, heading 18/26, body 16/24, supporting text 14/20, caption 12/17, button 16/22. Interior page headers use the title role. Icons use 16/22/28 dp; tab labels use 11/15. Keep 48 dp touch targets and native text scaling. Use 20 dp page gutters and gaps. Preserve the phone's display-density and font preferences.

Only the selected tab receives the sea-glass indicator and strong label; every tab follows the same rule. Android Back traverses visited tabs, then exits only at the root with no prior route. Screen Back actions pop the previous route, with a safe parent destination for direct entry. Breathing retains its unsaved-session confirmation.

Launcher icon: the original Sol face centered on Sea Glass, with a separate transparent 1024 px foreground for Android's adaptive mask. Uses the existing original mascot artwork; no external brand assets. Android adaptive safe-area composition must be checked in the installed preview.

### Density and character interaction — phone review

Button refinement requested during the phone review: primary actions use a 16 dp rounded rectangle in sea glass, with a steady semibold label and optional leading icon. Secondary actions use the same shape with a fine outline; optional disclosures and cancellation use quiet text controls. Keep pill shapes for tags and selections only. Press compresses to 98% over 120 ms and releases over 220 ms; Reduce Motion keeps the shape still. All variants retain 48 dp minimum targets, wrapping labels, disabled semantics and readable light/dark colors.

The user found the first pass too spacious and generic. Use an open page header, a compact greeting and a single framed mood form on Home. Follow with two short activity rows, an unboxed daily line and the latest check-in; remove duplicated progress panels and introductory prose. Talk puts New conversation directly below a compact Sol introduction, with a divided list of saved threads. Wellness pairs a small Sol with a breathing action and uses open typography for the daily line. Keep readable 16 dp body text, 48 dp hit targets and native text scaling; reduce container padding and repetition instead of shrinking accessibility.

Sol is the playful focal point. Tap cycles through a wave, delighted expression and wink, with a short visible response. Touch compresses the body; release gives a small spring-like rebound. Holding invites a slow breath with closed eyes until release, without logging an activity. Mood changes update color, expression and supportive copy. Reactions stop when the screen is inactive, release/cancel clears the hold, and Reduce Motion shows the same expressions and words without movement. Responses use local copy and never imply an AI-generated reply or a human companion.

```text
Home                         Talk                       Wellness
solace · date     bell       Talk with Sol              A moment for you
Greeting, name     (Sol)     (Sol) A place to talk      Breathe with Sol (Sol)
tap / hold hint              [New conversation]         [Start breathing]
[Mood choices             ] Your conversations         Today's words
[details       Save       ] thread · date        >     Daily line in open space
Breathe                  >  thread · date        >     Open affirmations      >
Talk with Sol            >  provider/privacy note      Saved words            >
Today's line                Support                    Reminders              >
Latest check-in
```

Native Back compatibility: Expo 58 / React Native 0.88 on the tested Android 14 phone did not deliver BackHandler events with predictive Back enabled. Disable the Expo predictive-back opt-in; preserve tab history and focused detail fallbacks. Verify Android 16+ separately. Open page content uses the contrast-tested `surfaceAt(sky, 1)` base instead of the raw sky gradient color.

## Connected daily experience — 8 November 2026

The user chose to improve the connections between existing features before adding anything else. The product is a short daily conversation with a useful pause: check in → choose what to share → talk → optionally breathe → return to the same conversation. Keep the existing five destinations and quiet sea-glass design. No new feature modules, decorative systems, assessments or achievement mechanics.

Home has one daily state. Before a check-in, the mood form is the primary action. After a save, including a return visit, it becomes a compact record of the latest mood, time, tags and note. Sol reflects that saved mood. “Talk about this” opens an editable draft containing the selected check-in; “Check in again” remains a quiet secondary choice. Do not repeat the saved entry in another section. A breathing shortcut, a short daily line and a Progress link support this flow without competing with it. Recompute the day in the phone's timezone and reset the form on a new day/account. Errors never masquerade as an empty day.

The check-in handoff is explicit sharing, not background AI personalization. Only the user-visible draft is sent, after the user taps Send. Drafts stay in the account-scoped memory cache, never in navigation parameters, logs or persistent plaintext storage; leaving a conversation preserves its draft during the current app session. Clear that cache on account changes and conversation deletion. Failed creation/sends retain their retry keys. The existing Render API accepts these ordinary messages; no server-side mood access or memory is implied.

Talk prioritizes continuing a conversation and starting a new one, then earlier history. Use readable dates for untitled threads rather than repeating “Conversation with Sol” everywhere. The conversation header identifies Sol as AI and keeps support accessible. The composer is one row with a multiline field and a 48 dp sea-glass send control. Keep a short, always-visible provider disclosure beside an expandable privacy explanation, and block sends when provider details cannot load. Full disclosures stay in onboarding and Privacy. Do not pull the reader away from older messages when a reply arrives; offer “Latest messages” instead.

Breathing opens with the one-minute coherent rhythm and a primary Start action. Put other rhythms, durations, starting mood and haptics behind “Customize”. A notification may open the screen but never start the timer. A breathing break entered from a chat keeps that thread in the navigation stack. After a completed save, an explicit reflection action may prepare an editable follow-up there; an existing draft always wins and is never replaced. No activity is claimed complete before the user saves it. Crisis replies show support rather than an activity invitation.

Remove the inactive memory toggle. Privacy describes current-conversation context, explicit check-in sharing, the configured AI-provider disclosure and real deletion controls. Existing device-local legacy preferences are preserved without activating or reinterpreting them; new onboarding defaults to no memory. Actual future memory must have fresh server-backed consent and inspect/delete controls before it is offered.

Known reminder payloads map directly to the feature: mood → Home, breathing → Breathe, affirmation → Affirmations, self-care → Wellness. Custom reminders keep a small message page because the custom text is the content. Old allowlisted payloads remain compatible; unknown routes/parameters are rejected. Keep pending taps through sign-in until the final destination commits.

```text
Home                         Conversation                   Breathe
solace · date      bell      Back  Sol · AI       Support   Back   Breathe
Greeting, name    (Sol)      Conversation / first prompt    (Sol)
[Today · Low · time       ]  Sol reply                      One minute · slow breathing
[tags / optional note    ]  [Take a breathing break]       [Start breathing]
[Talk about this         ]  [Latest messages, if needed]   Customize >
Review before sending       [Editable message ...] [↑]     ... practice / save ...
Check in again              Saved here · sent to provider  [Reflect with Sol]
Breathe for a minute >      Chat privacy                   Opens a draft in your chat
Today's words / Progress
```

Phone refinement: tighter message padding, a quiet breathing tool in the chat header instead of repeating an invitation after every reply, and two editable starter prompts for an empty conversation. The breathing tool is hidden during a crisis response. Neither starter prompts nor breathing reflections send automatically. The user explicitly requested a modern chat interface; give the reading area priority, use a compact arrow send control and preserve meaningful status feedback.

Verification focuses on saved-day/revisit/new-day states, explicit draft sharing and account isolation, create/send retries, conversation resumption, preserved drafts across breathing, completion/save/return, legacy reminder destinations, native Back and enlarged text. Preserve the connected phone's account, signing certificate and preferences. No new rating is claimed from a visual pass.

## Sol replies and activity suggestions — 8 November 2026

Copy refinement requested by the user: use the installed `stop-slop` guidance to remove repeated wellness slogans, filler and staged reassurance. Name the screen or action: “Reminders” instead of “Gentle reminders”, “Meet Sol” instead of “A little space for you”, and “Choose the days and times” instead of “A nudge, on your terms”. Keep ordinary questions where they help a conversation. Avoid granting permission for feelings, promising a better mood or implying Sol is human. Privacy, consent and urgent support remain explicit. Affirmations should use everyday first-person language and preserve the topic and stable ID of each saved line.

The user authorized comparing Uizze with the earlier `frontend-design` skill and keeping one. The comparison favored Uizze's `ui-taste` for this app: native controls, keyboard/state preservation and evidence-based review while respecting the established design. Fraunces gives short headings a friendly editorial character, Figtree keeps chat and controls readable, sea glass identifies actions, and Sol carries the expressive motion. New activity buttons reuse those tokens and native accessibility behavior. No new visual theme or decorative background is needed for this slice; compare copy and controls against the incumbent screens. Its optional paid reference service is not required or connected.

Sol responds to the specific thought or feeling in the current conversation. Keep replies brief and varied, with at most one relevant question; listening does not always need a question or an exercise. Respect requests to vent, declined suggestions and the user's own words after a practice. Shared check-ins remain explicit messages. No account context or cross-conversation memory is added.

A normal reply may include one optional activity: **Breathe for a minute** or **Read today’s words**. Use the existing outlined Action with a wind/book icon below the reply, a wrapping label and a 48 dp target. No extra card, badge or animation. The app owns all button labels and destinations; generated URLs or navigation parameters are never used. Breathing opens the existing one-minute coherent setup and waits for Start. Affirmations opens the existing daily words and waits for an explicit read/favorite action. Both preserve the conversation and its unsent draft, with Back returning to the chat. Reading an affirmation does not automatically send a reflection.

Suggestions are stored with the reply and survive history/retries. The next assistant reply cannot offer another activity immediately after one was offered. While a new message is pending, a send is unconfirmed, or the latest reply is crisis/fallback, hide all activity invitations in the visible transcript and the breathing shortcut. Crisis support stays accessible. Legacy messages without suggestions remain readable.

The provider returns a validated object containing reply text, an allowlisted activity or null, and an urgent-support flag. Groq's supported strict JSON schema mode constrains the format; server validation still rejects malformed or unsupported output. Either the deterministic safety check or the model's urgent-support flag selects the existing crisis response and suppresses activities. Invalid provider output uses the existing saved-message retry flow. Format validation is not proof of emotional quality, so assess synthetic multi-turn replies separately.

## Chat bubbles and send feedback — 8 November 2026

The user requested visible sending/thinking motion and a bubble around Sol's replies. This supersedes the open-reply treatment above. Keep the current sea-glass/Fraunces/Figtree identity: Figtree remains the readable chat face, sea glass marks the person's messages, and Sol's replies use a quiet blue-green surface. Use `#E1ECE9` by day and `#1B303A` by night for Sol, with the existing day/night foregrounds. Keep 24 dp outer corners and a 4 dp lower corner toward the speaker; 16 dp horizontal and 12 dp vertical padding. Sol's name sits inside its bubble. Activity buttons remain part of that reply, wrap at large text and keep 48 dp targets.

The constrained visual baseline is the current vivo V2168 capture `/tmp/solace-reply-qa/postdeploy-breathing-settled.png`, 1080 × 2400 pixels, portrait, night, 100% system text, plus the user's screenshot of the same conversation. Approved changes cover message surfaces and pending feedback only. No authorized image-generation tool or paid reference retrieval is connected; use the inspected native baseline and established app controls rather than claim a generated target.

On Send, place one pending user bubble in the thread immediately and show a small Sending status. Keep the original draft/request key for failure recovery. Display a compact Sol bubble with three moving dots and `Sol is thinking…` while the request runs. When the server responds, reconcile the pending row with the saved user message by request ID, then reveal the reply without duplicate bubbles. Never imply the server saved a message before confirmation; an unconfirmed send stops thinking and offers the existing retry with the same request key.

Use Reanimated 4.7's shared-value transforms and opacity: an 8 dp lift and short fade over 220 ms for a newly submitted message and a new normal reply, with a gentle 420 ms dot pulse while waiting. Do not animate recycled history rows, reanimate on Back, move older content for decoration, or delay a fast reply to show an animation. An urgent-support reply appears immediately. Reduce Motion shows static bubbles and dots with the same status text; backgrounding or leaving the chat stops the repeating motion. Keyboard, selection, chronological reading order, retry, activity navigation and the reading-position guard retain their existing behavior.

Sol's product instructions must describe the actual breathing controls: the default is one minute of Coherent breathing; Customize offers Coherent, Box and 4–7–8 plus 1, 3 and 5 minutes. When asked about changing a practice, explain those choices and the Customize path. The person changes settings and taps Start; Sol does not claim to have changed them, prescribe a pattern, or invent a rhythm. Keep activity suppression after a previous offer, decline or urgent-support turn while allowing factual navigation guidance.

```text
Back  Sol · AI                    Support
You: I could use a short pause.
Sol: A pause sounds welcome after that meeting.
     We can leave the rest here for a moment.
[wind  Breathe for a minute]

[Editable message ...]                 [↑]
```

## Appearance and daily moments — 9 November 2026

The user requested a visible Auto/Light/Dark choice, a lasting affirmation read state, playful check-ins inspired by their video, and daily wellness recommendations. These requests extend the earlier connected daily experience. Build these changes now; defer login investigation and physical-phone checks until the new update is ready. Keep the existing account, signing certificate and Render backend.

Reference: inspected the extracted contact sheet at `/tmp/solace-checkin-reference-contact.png` (1824 × 1367), from `/home/puneet/Videos/Video_2026-11-08_23-44-53.mkv`. Its short questions, completion feedback and next-action suggestions inform this change. Do not copy its screening questionnaires, medical claims, XP scores, visual identity or text. No image-generation tool or Uizze paid reference service is connected. Use this explicit change list and the established native design as the implementation target; physical-device visual verification is deferred at the user's request.

Retain Fraunces for greetings and daily words, Figtree for actions and explanations, sea glass for selection, and Lantern for a saved moment. The palette and spacing above remain authoritative. No extra fonts, dependencies, decorative backgrounds or persistent health-data cache.

- **You → Appearance:** a compact three-way radio control beneath the greeting, labeled Auto, Light and Dark. Auto follows local time, with that behavior explained below the control. Selection changes the app immediately and persists on this device. Loading disables changes; a failed write restores the previous saved choice and offers a retry. Design-preview overrides are temporary and must not overwrite this preference. Load appearance before revealing the app at startup.
- **Affirmations:** reading remains an explicit action, labeled “I’ve read this”. After confirmation show a checkmark and “Read today” as a status, plus “Saved in your progress”; remove the completed action. Derive this status from the authenticated user's saved activity for this affirmation on the current local day. Reopening, switching accounts and local midnight must show the right state. While status is unavailable, show an honest loading/retry state and keep the affirmation readable. Favorites remain independent. A retry keeps its original affirmation and request key, even across midnight; the server's completion day controls progress.
- **Check-in:** preserve the five labeled moods and optional tags/note. Add a short select/save step indicator and a responsive lift on the chosen face. Sol follows the choice. Saving remains explicit; only a confirmed save earns the “Check-in saved” stamp and one brief warm pulse. A low or heavy mood earns the same progress as any other. No scores for feelings, loss of points, streak penalties or reward for submitting repeatedly.
- **Daily moments:** a compact two-stop trail, “Check in” and “Breathe or read”, marks a saved check-in and at least one saved breathing session or affirmation for the local day. This is a suggested daily routine. One action can be enough; completing both shows “Both moments saved” and folds further suggestions behind “More ideas for today”. Derive completion from real account records. Repeated actions never fill extra stops. Keep this beside the daily suggestion, not as another competing dashboard card.
- **Daily suggestions:** offer a short curated activity using today's latest mood and optional selected tags. Give its specific reason, duration and action. Favor a one-minute breathing pause for tense/worried moods, an affirmation for tired/low moods, and a reflection for positive/calm moods; offer the other activities through “Other ideas”. Completed breathing/reading moves behind unfinished options. With no check-in, offer a general option and label it as such. A failed request is never interpreted as a missing check-in. These are wellness suggestions, with no diagnosis, prescription, guaranteed outcome or claimed clinician approval. Do not inspect private notes, call the LLM or activate memory. Reflection creates an editable draft that the user sends explicitly; opening any activity never marks it complete.

```text
You                         Home, before save           Home, after save
Hello, Maya.                Greeting, Maya      (Sol)   Greeting, Maya       (Sol)
Appearance                  How are you feeling?        Check-in saved ✓
[Auto | Light | Dark]       Choose a mood → Save        Today · Low · time
Auto follows local time     [five labeled faces]        [Talk about this]
Reminders                   [optional details]          Check in again
Privacy                     [Save check-in]
                            Your daily moments          Your daily moments
                            ○ Check in  ○ Breathe/read  ● Check in ○ Breathe/read
                            Today's suggestion          Try today's words · 1 min
                            reason · duration           You chose Tired today.
                            [Open activity]             [Read today's words]
                            Other ideas                 Other ideas

Affirmations
Today | Saved words
Today's affirmation in Fraunces
[I've read this] → ✓ Read today
                    Saved in your progress
[Save to favorites]
```

Use existing 48 dp targets, wrapping text and selected/checked accessibility semantics. Selection and the save stamp use Reanimated transforms/opacity; nothing animates on a return visit. Reduce Motion and inactive screens show static states with the same labels. Test account/day scoping, refresh and save failures, retry identity, selection persistence, explicit handoffs and completed status. Record the later native visual/motion/login checks separately from automated verification.

## Native layout correction — 9 November 2026

The user reports that several screens feel too large or cramped on the updated APK. The actual vivo display is 1080 × 2400 pixels with a 493 dpi display override, giving roughly 350 dp of width at 100% text. Do not change the phone's display size or text settings to make the app fit. Earlier isolated browser checks did not include the complete native tab/safe-area frame and were insufficient for this complaint.

Use the inspected native captures in `/tmp/solace-daily-native-evidence/` as the constrained baseline: `wellness-before-layout.png`, `progress-before-layout.png`, `you-baseline.png` and `completed-daily-moments.png`. The user also supplied two UI references (770 × 508 and 1600 × 1200), saved in `docs/reference/layout-dashboard.png` and `layout-controls.png`. Borrow their distinct surfaces, consistent internal alignment, compact metrics and grouped selected controls. Adapt those lessons to one mobile column; preserve Fraunces/Figtree, Sol, both palettes and the existing flows. These references and the explicit changes below are the target, without a generated replacement or a claim of a 1:1 copy.

- Below 380 dp wide, or on a short viewport below 740 dp, use 16 dp screen gutters, 12 dp top padding, 16 dp section gaps, 12 dp surface padding and 8 dp surface gaps. Keep body text at 16/24, captions at 12/17, dynamic text scaling and 48 dp touch targets. Compact display text uses 26/34 and page titles 22/28. Wide screens retain the existing scale.
- Bound each scroll viewport to the available screen and reserve visible breathing room after its last item. Tab screens scroll above the tab bar; standalone screens include the bottom safe area. Long content remains scrollable. Never crop a required action or shrink the entire app to force one viewport.
- Home uses an 88 dp companion on compact screens. Place “Check in again” alongside saved status instead of giving it another full-width row. Daily suggestions keep a reason, duration, action and alternatives; avoid repeating an instruction already clear from the button and draft disclosure. Preserve every error/retry path and explicit sharing consent.
- Wellness uses a 72 dp companion, with its explanatory text below the heading/mascot row rather than squeezed beside the illustration. Keep breathing and affirmation entry points together near the top. The breathing setup uses a 120 dp companion at compact widths; active breathing retains its dedicated animation.
- Progress uses a concise streak summary and a 108 dp chart on compact screens. Seven calendar columns stay aligned with the graph. History remains a virtualized list, with no dropped data or hidden deletion confirmation.
- You places the greeting with the page header, then appearance and its account rows. Shared quiet buttons use the smaller functional text role while retaining full touch targets; button wrappers and text must shrink/wrap within their containers. Keep selected states, labels and navigation consistent.
- Distinguish raised content from the page: white (`#FFFFFF`) surfaces on the existing day background, deep blue-green (`#192B35`) surfaces at night, and quiet decorative borders (`#DDE7E4` / `#2D424B`). Sea-glass stays the interactive accent; lantern stays the completion accent. Appearance is one inset segmented group with a filled checked option. Body/caption text must retain at least 4.5:1 contrast on both surfaces.
- The user explicitly asks to gamify check-ins. Make choosing and saving two visible steps, with progress advancing only after selection and completion only after a confirmed save. The selected mood lifts and changes Sol's expression. A short, one-time lantern stamp confirms saving; a two-stop daily trail shows the persisted check-in and breathing/reading completion with a clear completed state. Every mood receives the same credit. Repeated saves cannot add extra daily credit; failure, cancellation and return visits never award or replay completion. Reduce Motion keeps the same static state. No points for positive moods, leaderboards, streak penalties or new backend achievement model.

```text
Home                              Wellness
solace              reminders     Take a break
Greeting + name          Sol      [Breathe with Sol        Sol]
[Daily check-in / saved state]     [1 minute · adjustable       ]
[Choose a mood → Save           ]  [Take a breathing break      ]
[five expressive mood choices  ]  [Today's words               ]
[Save check-in                 ]  [Affirmation + open action    ]
[Today with Sol       0/2 saved ]  Saved words / Reminders
[  check-in —— breathe/read    ]
[Daily suggestion + action     ]
Progress                          You
Your progress                     You · Hello, name
[streak summary · total days   ]  [Appearance: Auto Light Dark ]
[Last seven days               ]  [Preferences + saved words   ]
[compact aligned mood chart   ]  [Support + introduction      ]
[breathing minutes + sessions ]  Account actions / AI notice
Your check-ins
[saved history entries        ]
```

Check these changes on the actual 350 dp phone and at 390 dp in the synthetic browser preview, including full tab chrome, light/dark, top and final scroll positions, selection/cancel and activity Back. Recheck a keyboard flow at normal text size. The user asked not to repeat 130% text testing. Do not claim the historical sign-out is fixed: this APK retained its session through cold restart and an animation-setting return, but the earlier failure remains unexplained.

## Daily four — 9 November 2026

The user defers session-reliability and final-release work and requests four daily questions with points. They confirmed that the questions should rotate. Build one short, four-question daily reflection, with a seven-day rotation of original questions about rest, energy, focus and connection. This is everyday reflection, not a health assessment. Every answer, including “Prefer to skip”, has equal participation value. Finishing all four earns 40 points once per local date; returning or retrying cannot earn another award. Missed days never subtract points. No leaderboard, clinical score, redemption system or new AI call.

Use the existing compact Home and saved-state screenshots in `apps/mobile/dist/qa/native-layout-2026-11-09/` plus the supplied references in `docs/reference/` as the visual baseline. Keep Fraunces headings, Figtree controls, sea-glass selection, lantern completion, both palettes and 48 dp touch targets. This is an extension of the approved system; no image-generation service is connected. A small card on Home introduces “Your daily four”, the 40-point award and the total earned so far. A compact total appears in Progress; Wellness offers a second entry point.

The user confirmed a modal presentation. Open one protected native modal for the whole flow, with a visible Close control and one question at a time, its topic, “Question 1 of 4”, and four full-width radio choices. Selecting never auto-advances or sends. Next moves forward; Back revisits the previous answer. A four-segment progress strip reflects answered questions. After question four, show a review of the chosen labels and an explicit “Finish and earn 40 points” button. Offer “Prefer to skip” on each question without withholding points. Keep the whole form scrollable at 350 dp and larger text sizes. Closing preserves an account-scoped draft for the current app session; reopening resumes the same question. Avoid nesting a new modal for each question.

Only a confirmed server response shows the completed state and points. Reopening a completed day shows “40 points saved today” and the running total. The answers guide one optional next step in the current app session, using existing breathing, affirmation or Talk destinations. Opening a destination never starts/saves an activity or sends answers into chat. Store only completion, date, timezone and awarded points on the server; answers are validated for the save but not retained or logged. Explain this beneath the review: “Solace saves your completion and points. Your answers aren’t stored.” An account-scoped in-memory draft survives Back, tab changes and retries during this app session; it does not become a plaintext device record. Account changes clear it.

The server determines the day using its clock and the validated IANA timezone. A new save for an expired question set is rejected with a clear new-day action; already-accepted retries return their original completion, even after midnight. Pending saves freeze their exact day and answers. Failed saves retain the draft and offer a deliberate retry. Unknown points/completion are shown as loading or unavailable, never as zero. Day changes refresh the Home card without silently discarding an open questionnaire draft.

```text
Home card                       Daily four                     Review / saved
Your daily four      +40 pts     [Back] Your daily four         Your four answers
Four questions. About a minute. Question 2 of 4 · Energy       Rest       Chosen label
120 points so far               ━━━ ━━━ ─── ───                Energy     Chosen label
[Answer today's four]           How much energy ...?           Focus      Chosen label
                                ( ) Not much                   Connection Chosen label
Completed                       ( ) Enough for a few things    [Edit answers]
✓ 40 points saved today         ( ) I have some to spare       [Finish and earn 40 points]
160 points so far               ( ) Prefer to skip             → ✓ Your points are saved
[See today's result]            [Next question]                   160 points total
                                                                  Optional existing activity
```

Verify deterministic four-question rotation, strict question/option matching, owner isolation, one award under concurrent requests, local midnight and DST, retry after midnight, account deletion cascade, draft/review/back behavior, no premature credit, loading/error recovery and reduced-motion static completion. Add a generated migration; deploy it on Render before installed-app testing. The user's deferred broad release checks remain deferred.

## Modern mobile hierarchy and Solace confirmations — 11 November 2026

The user supplied a 1024 × 768 mobile finance reference and a 576 × 1280 native Talk capture. Use the reference for hierarchy, density and surface discipline: strong sans-serif page titles, compact section labels, crisp white/deep surfaces, thin separators and clear primary actions. Do not copy its finance content, blue brand color, navigation labels or exact card composition. Solace keeps Sol, sea glass, lantern, its day/night palettes and its current flows.

Use Figtree as the application workhorse. Page titles, section headings, controls, lists, sheets and functional metrics use Figtree with clear 700/600/500 weight steps. Reserve Fraunces for short reflective or emotional content: greetings, affirmations, breathing phases and Sol's expressive moments. This removes the oversized editorial feel from utility screens while preserving the established Solace identity. Keep native text scaling, readable line heights and the existing compact rules for the 351 dp vivo viewport.

Replace every app-authored `Alert.alert` and browser `window.confirm` with one shared centered Solace confirmation dialog. Android and Google system permission/update prompts remain platform-owned. The dialog sits above a dimmed scrim, follows the current light/dark theme, keeps its icon, title and consequence together, and places the safe action before the destructive action. It closes through the safe action, Android Back or the scrim when no request is pending. Destructive actions use the semantic error color and plain labels such as “Delete conversation”; they do not use all caps. Pending actions disable dismissal and preserve the underlying data until the request resolves.

Talk is the first full screen-level application of the new hierarchy. Keep a concise header and Sol introduction, feature the newest conversation in one clean raised surface, place “New conversation” as an obvious compact action, and render earlier conversations as aligned divided rows. Keep delete targets at 48 dp, preserve pull-to-refresh, pagination, errors, provider disclosure and support. All shared surface, header and action changes must remain compatible with Home, Wellness, Progress and You in both themes.

Verify the sheet for conversation, check-in and account deletion plus breathing stop/leave paths. On the physical Android phone, inspect Talk with the sheet closed and open, cancel and confirm without touching private chat content, then check light/dark rendering, Back dismissal, screen-reader labels, 48 dp targets and the 351 dp layout. Fast Refresh may verify JavaScript-only changes; rebuild the APK only if native configuration or dependencies change.

Home keeps the daily check-in visible without placing the whole form in the feed. Before a check-in, show one compact status surface with a clear “Check in” action. Open the five mood choices in a centered, theme-aware modal; reuse that modal for “Check in again.” The modal uses one compact row of 48 dp mood targets, a visible selected state, “Add details,” “Save” and “Cancel” labels, with fuller intent retained in accessibility labels. Android Back, the close control and Cancel dismiss without saving. The form may scroll when details or the keyboard increase its height.

Use one shared five-choice mood selector in the inline onboarding practice and the signed-in modal. Every equal-width choice shows its face and the plain labels Heavy, Low, Okay, Good and Glowing. Keep all five choices in one deliberate row at normal phone text sizes; scale the faces and spacing to the available width instead of wrapping the last choice onto a second line. Selection and haptic behavior stay identical in both contexts, while only the signed-in form can reveal notes and save data.

The selected mood uses depth instead of an outline: sea-glass fill, a short upward lift, a soft bottom shadow and a small check badge. Unselected moods remain flat. Pressing the selected tile settles it toward the surface, giving the control a restrained physical response without making all five choices look like raised cards.

Keep the mood row quickly scannable with one short label beneath each face. Announce the selected mood and Sol's response below the row; each face retains its full accessible label and position in the five-choice set.

Every face stays centered in an equal-width slot. Selection lifts the tile, not the face inside it; scaling remains centered so the chosen expression does not jump toward an edge.

Use a pearl top surface for the selected mood so each face color remains distinct. A sea-glass base supplies the visible 3D edge. The centered mood name and raised tile communicate selection without a corner badge. In dark mode, use the equivalent raised deep-slate surface and muted sea-glass base.

Optional feeling words use compact 32 dp visual pills with 13 px labels. Their surrounding press targets remain at least 48 dp, so words such as Calm and Grateful look light without becoming difficult to tap. Selected pills use sea glass; unselected pills use the current background and outline tokens.

Place Cancel and Save side by side at the bottom of the check-in modal. Cancel uses the secondary treatment and comes first; Save uses the primary treatment. Both retain 48 dp targets and concise visible labels.

## Two-font consolidation — 12 November 2026

The user reduced the app to two font families. Figtree remains the normal interface family for page titles, lists, controls, chat and supporting copy. Geist replaces Fraunces for expressive text: affirmations, breathing phases, onboarding moments and Sol's short reflective lines. Remove the Fraunces package and do not introduce a third family.

Use Geist Medium at 18/25 for “Today’s words” and saved affirmations. Utility titles use Figtree Bold at 19/24; headings 15/20; body 14/21; small body 13/18; buttons 14/19. Keep dynamic text scaling and 48 dp targets. Long reflective copy should wrap with calm line height instead of becoming a large card headline.

## Progress and check-in archive — 12 November 2026

Progress must remain a summary, not an infinitely growing feed. Show at most the three newest check-ins beneath the weekly progress and points, using compact divided rows inside one surface. Add a clear “View all check-ins” action that pushes a dedicated archive screen.

The archive owns the virtualized cursor-paginated list, pull-to-refresh, empty/loading/error states and per-item deletion. It loads ten records at a time and exposes “Load earlier” only while another cursor exists. Deleting an archive item refreshes both the archive and the three-item Progress preview. Android Back returns to Progress without losing tab state.

Talk uses the same archive density. Earlier conversations are compact divided rows with a small leading chat icon, title and timestamp in one text block, a row-wide open target, and a separate 48 dp delete target. The newest conversation remains featured but uses compact padding and a short Continue action so the first history rows stay visible.

Talk is also a summary rather than an unbounded feed: feature the newest conversation, show only the next three recent rows, and use “View all” to open a dedicated conversation archive. Give each divided conversation row a small 8 dp vertical breathing area while preserving the 48 dp open and delete targets. The archive owns the virtualized cursor-paginated history, pull-to-refresh, loading/error/empty states and centered delete confirmation; Android Back returns to Talk.
