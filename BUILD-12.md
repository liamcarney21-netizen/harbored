# Build 12: what you'd text them about

Written 2026-10-27. Status: phase 1 (server) built and deployed 2026-10-27, migration 0009
applied the same day. Phase 2 (the app) built 2026-10-27 and deployed to the website, and
1.1.0 (12) was uploaded to App Store Connect the same day. Next: Liam's TestFlight walkthrough
(phase 3). Liam took the recommended answer to all four decisions below.

## Why

The October 26 scoring fixes are guardrails: they say what never counts (press releases
for a place, a topic the headline doesn't name, an ordinary regular-season game). They
removed whole categories of junk, but what's left depends on the person, and Harbored
can't know that from a theme label. "Southern California" for Colin, who lives in Orange
County, could mean wildfires and big events, or the Dodgers, or real estate. Today the
refine step guesses (`watchFor`), the guess is invisible, and the model fills the gap
differently from one batch to the next: the same Avalanche game recap scored 40 in one
dry run and came back as a 65 pass-along in the next.

So we ask. Three taps, no typing, all optional:

1. **How do you know Colin?** One tap per person. It sets the tone of drafts.
2. **What would you text Colin about?** For each theme, a few choices that Harbored
   proposes and pre-checks. The checked ones become the definition of what counts.
3. **Not something I'd send.** On every card, with one-tap reasons, so each theme
   learns from what you skip.

This keeps the July rule: confirm, don't make people write more.

## What the person sees

### 1. How do you know them

In the quiz, at the top of each person's screen, under the question:

```
How do you know Colin?
[Family] [Friend] [Teammate] [Classmate]
[Coworker] [Work contact]
```

One tap, never required; "Save & next" works without it. Tapping one also moves the
matching prompt card first (coworker or work contact puts "Their company" first, teammate
puts "A team you both follow" first, family puts "A place that matters to you both" first).
On the profile it shows under the name ("Teammate"), and tapping it opens a Sheet with
the same six choices. Import and Add contact don't ask: they stay fast.

What it changes:
- **Draft tone** (score, redraft, and the drifting-friend opener): a teammate can take
  some ribbing, a work contact gets friendly and professional, family gets warm.
- **Which choices start checked** for that person's themes (below).
- **It never changes whether something counts or how strong it is.** Relevance stays
  about the subject and the choices.

### 2. What you'd text them about

Each answer card in the quiz gets a row of choices under its "Watching …" line, with
one caption above the list:

```
Tap what you'd text Colin about.

✓ Southern California                      ×
  Watching Southern California, where Colin lives.
  [✓ Wildfires & storms] [✓ Big local events]
  [ Dodgers & Angels ] [ Real estate ]
```

Refine proposes three to five choices and pre-checks the two or three likeliest, using
the contact's company, role and relation. Examples it should produce:

| Theme type | Choices (✓ = usually pre-checked) |
|---|---|
| Place | ✓ Wildfires & storms · ✓ Big local events · Local teams' big moments · Real estate · Big changes to the area |
| Team | ✓ Big games · ✓ Trades & signings · Records & milestones · Coaching changes |
| Company | ✓ Big launches & deals · ✓ New leaders · Hiring & layoffs · Awards & rankings |
| Person | ✓ New role or award · ✓ Big news about them · Interviews & features |
| Topic | Kinds of stories within the subject: for mid-century modern, ✓ Famous houses · ✓ Design events · Preservation fights |

Never offer a choice the rules already reject ("Every game", "Weather", "Funding" for a
place).

The same row of choices shows on the profile ("What you share") and in the themes
manager, tap to toggle. If every choice is off, the theme is paused: the scan skips it and
the row says "Not watching anything here. Tap what you'd text Colin about."

**Bare categories** ("Health and wellness") get no choices. Their row says "Too broad to
watch. Pick one to watch instead:" with three or four narrower subjects from refine
([Running] [Yoga] [Nutrition]). Tapping one replaces the theme. This turns today's dead
end into one tap.

**Topic themes stop showing "Too broad to watch well."** Only bare categories get that
line now. Today every topic theme shows it, including fine ones like "Mid-century modern
architecture".

### 3. Not something I'd send

On each reason and pass-along card, a quiet link next to "Why Harbored flagged this":
**Not something I'd send.** On the draft screen, "Skip this one" becomes the same button.
Both open a Sheet:

```
Why not this one?
─────────────────────────────────
It's not about Southern California
Colin wouldn't care about this
Too small to text about            (on a pass-along: "Not worth passing along")
Just not now
```

| Choice | What Harbored does |
|---|---|
| It's not about {theme} | Hides the card. Keeps the headline on the theme (last 5) as an example of what isn't about it; the scorer sees those. |
| {first} wouldn't care about this | If the story matched a choice, asks once: "Stop watching big local events for Colin?" **[Stop watching] [Just this story]**. If the theme has no choices yet (an older theme), shows its choices right there to set. |
| Too small to text about | That theme needs bigger news before it becomes a reason: its bar rises 5, up to 85. The profile row says "Only big news · Reset". |
| Not worth passing along (pass-alongs) | That theme stops offering pass-alongs. The profile row says "No pass-alongs · Reset". |
| Just not now | Hides the card, as "Skip this one" does today. |

Every choice except "Just not now" ends with a short toast ("Got it. Colin won't see
stories like this."), with Undo where something changed.

### "Why Harbored flagged this" says why in your words

When a story matched a choice, the first line of the Why panel is "You'd text Colin about
wildfires & storms." If the person never confirmed that theme's choices (older themes,
filled in by the backfill below), it reads "Harbored guessed you'd text Colin about big
local events. Change", and Change opens the choices. That's how existing themes get asked:
the first time they surface a card, not in a questionnaire.

## How scoring changes

The pattern that worked on October 26 applies again: the model labels, code decides.

1. **Choices are the definition.** Each scorer item gets `textAbout`: the theme's
   choices, checked and unchecked (the model sees the unchecked ones as `notTextAbout`).
   Prompt rule: name the one kind the headline squarely is, from either list
   (`"textAbout": "Wildfires & storms"`, copied exactly); it's relevant only if that kind is
   checked. Code: if the item has choices and the result names no checked one, it isn't
   relevant (significance capped at 20, no draft, hold reason "Records & milestones isn't
   one of the things you'd text Colin about."). The code check can only drop a story; it
   can't catch a story filed under the wrong checked choice, which is why the model sees
   the unchecked ones too. With only the checked ones, the first live run filed a points
   record under "Trades & signings".
2. **Choices never loosen the rules.** Routine coverage, ordinary games, live-score pages
   and press releases outside company and person themes still never count. The topic
   headline check stays. Topic themes still never push.
3. **`watchFor` is retired where choices exist.** Themes without choices (build 11 users,
   themes not yet backfilled) keep exactly today's behavior.
4. **Relation sets tone only.** Items carry `relation`; the prompt uses it for
   `draftMessage` and `passAlong` and says it never changes relevance or significance.
5. **Skipped headlines teach.** Items carry `notAbout` (the theme's kept "not about"
   headlines). Prompt: a story like those is not relevant.
6. **Per-theme bar.** A theme's reasons need its own bar (70 by default, up to 85 after
   "Too small"). Push needs that bar plus 10 (at least 80; sensitive still 90).
7. **Pass-alongs off.** A theme with pass-alongs off never stores one.

## Data

All per-person and per-theme state lives in the snapshot (`user_data`), so it syncs and
merges like everything else. One new column.

| Where | Field | Shape |
|---|---|---|
| contact | `relation` | `family` · `friend` · `teammate` · `classmate` · `coworker` · `work`, or absent |
| theme | `textAbout` | `[{ label, on }]`, at most 6, labels unique and under 40 characters |
| theme | `textAboutConfirmed` | `true` once the person saved the quiz screen, toggled a choice, or chose from a card |
| theme | `bare`, `narrower` | from refine: `true` for a bare category, plus 3 or 4 narrower subjects |
| theme | `bar` | 70 to 85; absent means 70 |
| theme | `favors` | `false` turns pass-alongs off; absent means on |
| theme | `notAbout` | `[{ headline, at }]`, last 5, dropped after 60 days |
| reasonState | `why` | added to `{ state: 'dismissed', at }`: `off_subject` · `not_their_thing` · `too_small` · `no_favor` · `not_now` |
| scan_results | `text_about` | the matched choice (migration `0009_scan_results_text_about.sql`) |

`textAbout` is one field, so two devices toggling choices at once resolve last-write-wins
for that theme, which is fine. Until 0009 is applied, the scan writes rows without
`text_about`. That needs its own fallback: adding it to `NEW_ROW_FIELDS` would also strip
the 0005 columns (`published_at`, `story_key` and the rest) whenever 0009 is missing.

The name is `textAbout`, not "angle": the draft screen already uses "angle" for
redrafts (`ANGLE_ROTATION`, `/api/redraft`'s `angle`).

## Work, by file

### Phase 1: server (deployable alone; changes nothing for themes without the new fields)

- `supabase/migrations/0009_scan_results_text_about.sql`: `add column if not exists text_about text`. Liam applies it in the SQL editor before the deploy.
- `server/refineHandler.js`: return `textAbout` (3 to 5, with `on`), and for a bare category `bare: true` plus `narrower`. Take `relation` as input for pre-checks. Clamp everything (count, length, duplicates). Keep `watchFor` and `display` for build 11.
- `server/scoreHandler.js`: `textAbout`, `relation` and `notAbout` in `modelItem`; the three prompt rules; the code gate in `shapeClaudeResult`; return the matched `textAbout`. Don't send `watchFor` when `textAbout` is present.
- `server/scanHandler.js`: pass the new fields (only the checked labels, clamped again: the snapshot is user-writable); `scorableFor` returns nothing for a theme with every choice off; `shapeResultRows` uses the theme's bar, drops pass-alongs when `favors === false`, and writes `text_about`.
- `server/pushHandler.js`: it already reads each user's `user_data` for prefs and broad themes. Also read each theme's bar and require bar + 10.
- `server/redraftHandler.js` and `api/redraft.js`: accept `relation` for tone.
- Tests: refine shape and clamps; the gate (no match, a label not in the list, a match); `watchFor` not sent alongside `textAbout`; relation in the prompt and not in relevance; per-theme bar for reasons and push; paused theme skipped; pass-alongs off; row written without `text_about` when 0009 is missing; `publicEndpoints.test.js` for refine's new fields.
- Done when: tests and lint pass, it's deployed, and live `/api/score` calls with `textAbout` items behave (a matching story kept and labeled, an off-choice story dropped, a regular-season game still capped). The score endpoint allows 20 calls an hour.

**Phase 1 result (2026-10-27).** Deployed (last: `dpl_9pN1wXJu3EVTUt72CpvC4d85of8i`), 214
tests, lint clean, not committed. Live checks on the deployed endpoints:
- Refine proposed choices with no business choices for a place (Southern California: ✓ Wildfires &
  storms, ✓ Big local events, Local teams' big moments, Real estate & development) and narrower picks
  for "Health and wellness" (Marathon running, Yoga, Plant-based eating).
- `/api/score` with stored choices: the Irvine wildfire kept as "Wildfires & storms" (sensitive, so
  Today only), the Makar extension kept as "Trades & signings", the Frey house kept; the robotics
  release, a robotics startup, Jay-Z at SoFi, OC home prices (unchecked), the Dodgers parade (filed
  under unchecked local teams) and MacKinnon's points record (unchecked) all dropped; a
  regular-season game held at 35–40; a company theme without choices scored as before.
- A dry run of the walkthrough account (themes without choices) behaved as on October 26.
Two fixes came out of the live runs: the scorer now sees the unchecked choices too (shown only the
checked ones, it filed the points record under "Trades & signings"), and a rationale that names a
prompt field ("it's in notTextAbout") is replaced with a plain line. Migration 0009 is not applied
yet; until it is, rows are written without `text_about`. Apply it before phase 2 ships.

### Phase 2: the app (build 12)

- `src/store/snapshot.js`: validate the new contact and theme fields in `normalize` (drop anything malformed, prune `notAbout` past 60 days) and cover them in the snapshot tests.
- `src/store/dataStore.js`: `addTheme` and `updateTheme` carry `textAbout`, `bare`, `narrower`; new `setRelation`, `setTextAbout`, `resetTheme` (bar and pass-alongs), and `notForThem(row, why)` that applies the effects in the table above; `markReason` takes `why`.
- `src/services/themes.js`: `refineTheme` passes `relation` and returns the new fields. `refineMissingThemes` also backfills themes that have a real refinement but no `textAbout`, up to 8 a session (refine allows 150 an hour). From the backfill it takes the choices, `bare` and `narrower` only, except for **place** themes, which take the whole new refinement: that also fixes older place themes whose line still says "business news".
- `src/components/ThemeComposerModal.jsx`: the relation row, prompt-card order, the caption, choices under each answer card. Saving a person's screen marks their themes' choices confirmed.
- New `src/components/TextAboutChips.jsx`: the toggle row (quiz, profile, themes manager, the "wouldn't care" step).
- `src/pages/app/ContactProfile.jsx`: relation under the name, choices on each theme row, "Only big news · Reset" and "No pass-alongs · Reset", the bare-category narrower row.
- `src/pages/app/CommonGround.jsx`: "Not something I'd send" on news and pass-along cards and on the draft screen; the reasons Sheet; toasts with Undo; choices in `ThemesManager`.
- `src/components/WhyDisclosure.jsx`: the "You'd text Colin about …" line and Change.
- `src/lib/status.js`: `themeWatch` marks only bare categories broad, so the "What Harbored checked" lines change with it.
- `src/services/scanResults.js`: map `text_about` onto the update.
- `src/store/dataStore.js` nudges: the drifting-friend opener uses the relation.
- `src/services/events.js` calls: `relation_set` {relation}, `text_about_saved` {on, off}, `not_for_them` {why, kind}, `text_about_off`. Counts and short codes only, as `cleanProps` enforces.
- `src/pages/Privacy.jsx`: the "How you use the app" list gains "choosing how you know someone or what you'd text them about, and skipping a suggestion with the reason you picked"; the data list mentions that how you know someone and what you'd text them about are saved with your account. No new App Store data types beyond the Product Interaction label that 1.1.0 already needs.
- Demo seed people get a relation and choices so the website demo shows the feature.
- Then build 12: bump versions, archive, upload, TestFlight.

### Phase 3: check it, then ship

- Deploy web (the same UI ships to the website companion first, so it can be tried in a browser).
- Liam makes a fresh test account through the new quiz on the web and sets choices; then run the dry-run harness (real news, live scorer, no writes) to compare against October 26: the robotics release, Jay-Z and the Avalanche recap should not appear unless a checked choice covers them.
- Liam's walkthrough on TestFlight: quiz, profile, a skip with each reason, Undo, a reset.
- Submit for review.

## What we'll watch afterward

From the `events` table, counts only:
- Of the cards people skip, how many say "not about" or "wouldn't care". That share should fall
  week over week as choices take hold.
- How many themes have confirmed choices after a week.
- Whether the first session still finishes at the same rate: the quiz gains one optional tap
  per person, and nothing new is required.

## Risks

- **Fewer reasons.** The gate fails closed, so some days Today will be empty more often.
  "What Harbored checked" already covers empty days; its lines can name the choices
  ("Nothing about wildfires & storms or big local events in three days").
- **Labels vary between batches**, as the game labels did. The code gate means a bad label
  costs a story, never a false push.
- **Over-correcting from one skip.** "Wouldn't care" asks before turning a choice off;
  "Too small" is capped at 85 and resettable.

## Decisions (answered 2026-10-27: all four as recommended)

1. **The six "How do you know" choices**: Family, Friend, Teammate, Classmate, Coworker, Work
   contact. Recommended as written; "Work contact" covers networking, clients and mentors.
2. **Should guessed choices count before the person confirms them?** Recommended yes: they
   only narrow what counts compared with today, and the Why line says they were guessed.
3. **Should "Too small to text about" raise that theme's bar?** Recommended yes, by 5 up
   to 85, shown on the profile with Reset.
4. **Version.** If 1.1.0 (11) still hasn't gone to review when build 12 is ready, submit
   build 12 as 1.1.0 (12) and skip 11. Otherwise build 12 is 1.2.0.

## Not in build 12

- Typing your own choices. To watch something the choices don't cover, add it as its own theme.
- Using Notes in scoring or drafts.
- A "Not for Colin" action on the notification itself (needs native notification categories).
- Learning across accounts (for example, choices most people turn off for places).
- A server-side backfill for people still on build 11. They keep today's rules until they update.
