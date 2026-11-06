# DESIGN.md — Solace AI

Source of truth for every visual and interaction decision. Status: **v1 approved provisionally on 6 November 2026; the user asked to continue with splash and onboarding.** If you need to deviate, propose the change and update this file first.

Phase 1 uses the existing foundation tokens for a temporary sign-in and signed-in account screen. It uses Google's native branded button, a plain privacy/care notice, loading and recoverable error states, sign-out, and confirmed account deletion. Full onboarding, profile questions, fonts, sky, and mascot remain Phase 2 work. The Phase 2 prototype gate applies to the full visual implementation; it does not block the earlier authentication slice.

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

## 9. Daily ritual and retention (ethical by design)

Goal: people open the app daily because it is fresh, kind and quick, not because of guilt.

1. **Under 60 seconds, with closure.** Open → Sol greets → one-tap mood → Sol responds → one small suggestion → *"That's enough for today."* No infinite feeds, no bottomless content.
2. **Something new each day:** a new affirmation, a new tiny challenge, a Sol line that references something real (if memory is consented), and a sky that is different at every hour.
3. **Gentle progress:** "days with Sol" dots, one **rest day per week** that keeps the streak, a warm "welcome back" after a gap, a Sunday weekly note, milestone moments with Sol celebrating (rare, so it stays special).
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

First send explains that chat is saved in the account and sent to VyceAi for replies; Sol is an AI companion, not a therapist. Context includes only this conversation. Cross-conversation memories, mood context and summaries wait for Phase 7's server-side consent and deletion controls. Failed sends preserve input or the saved user turn and retry the same request ID. Conversation deletion requires confirmation; no sensitive text appears in URLs or logs.

Support is available before sign-in and from every conversation. A country picker (India, United States, elsewhere) chooses configured, verified resources; it never infers location from timezone. The crisis path stays conversational and directs to trusted people or local emergency services. No calling happens automatically. Loading, empty, failed-send, deleted-thread and offline support states must remain recoverable.
