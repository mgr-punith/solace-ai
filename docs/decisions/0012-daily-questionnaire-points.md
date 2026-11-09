# Daily questions reward participation

9 November 2026

The user requested four questions each day and points, and chose a rotating set. Use seven curated sets of four original wellness prompts. The date selects the set; no provider request or medical instrument is needed.

Each completed set earns 40 points regardless of choices, including an explicit skip. A unique `(user_id, day)` completion row is the award ledger. The server computes the date in a validated IANA timezone, validates the four expected question/option IDs and sets the points itself. Concurrent saves and retries return the same row. A new late submission is rejected; retrying an already accepted day remains safe after midnight. Travel can change the current local date, but repeating a calendar date or changing zones within it cannot produce another award.

Store completion and points, not answers. Answers are transient request input used for validation; the app can display a recap and suggest an existing activity from its in-memory draft. Logs contain neither answers nor questionnaire text. This limits sensitive data while allowing account-backed totals across devices. Account deletion cascades completion rows. The client cache is account-scoped and clears on identity changes. No persistent draft storage or automatic offline submission is added.

Completing the questionnaire counts as a wellness action in the existing streak summary. It does not change the mood chart, invent a mood score or mark breathing/affirmation as complete. Points have no monetary value, redemption or competitive ranking in this prototype.
