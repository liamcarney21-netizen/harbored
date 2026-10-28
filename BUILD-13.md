# Build 13: tell Harbored about them

Written 2026-10-27. Status: phases 1 and 2 built and deployed to the website 2026-10-27 with the
recommended answers to all five decisions; the iOS build isn't made yet.

## Why

Liam on build 12 (TestFlight, October 27): the choices are "the right idea", but the setup
screens aren't user friendly: too many buttons on one screen. Each person's quiz screen asks
three things at once with every option open (six "How do you know them" chips, six prompt
cards, three to five choice chips under every theme), about 22 things to tap before "Save and
next". What he wants: "map a detailed description of the relationship, but in a simple, clean
UI".

The answer is to stop collecting detail one button at a time. People describe the
relationship the way they'd tell a friend, by talking or typing, and Harbored maps it into one
clean card they confirm. The detail comes from their words, not from the screen. Build 12's
data and server rules stay as they are; this build changes how the information gets in.

## What the person sees

### 1. Describe (one screen per person)

```
●●○○○                                              Skip
Tell Harbored about you and Colin
How you know each other, what you talk about, what's going on with him.

┌──────────────────────────────────────────────┐
│ We played basketball together at High Point. │
│ He lives in Orange County now, works at      │
│ Bernhardt. Huge Avalanche fan, we text       │
│ during playoff games. Just had his first kid │
│ in August.                                   │
└──────────────────────────────────────────────┘
(mic)                                    [ Map it ]
                  I'll add things myself
```

- One big text box and a mic. The iPhone keyboard's own dictation works too.
- "Map it" needs a sentence or two (the button stays enabled; too little text gets a short
  note asking for a bit more).
- "I'll add things myself" goes straight to an empty card (below), for people who won't type
  or talk.
- "Skip" (top right) skips this person, as "Skip for now" does today.

### 2. The card: "You and Colin"

```
CP  You and Colin
    Teammates at High Point · close                        ›

You'd text him about
    Colorado Avalanche                                      ›
    Big games & playoffs, trades & signings
    Orange County                                           ›
    Wildfires & storms, big local events
    Bernhardt                                               ›
    Big launches & deals, new leaders
    + Add something you share

Good to know
    New dad since August                                    ›

             Change what I said
[                    Looks right                    ]
```

- Every line is one thing, and tapping it opens a small sheet for just that thing (below).
  No chips on the card itself.
- Each theme line is its name, with the choices that are on underneath as plain text. While
  a theme is still being worked out, its second line says so.
- "Looks right" saves the card and moves to the next person. Nothing is saved before it.
- "Change what I said" goes back to the description, still filled in, to adjust and map
  again.
- Reached through "I'll add things myself", the same card starts empty: "Add how you know
  Colin" on top, and the add field open under "You'd text him about" with three quiet
  suggestions (their company from the contact card, "A team", "A place").

### 3. Edit sheets (one per kind of line)

- **How you know them:** the six choices (Family, Friend, Teammate, Classmate, Coworker, Work
  contact), "How close are you?" (Close · Catch up now and then · Loosely), and an optional
  short "Where from" field ("at High Point"). Done.
- **A theme:** its name as the title, what Harbored watches as the subtitle, the choices to
  toggle (build 12's chips, now only here), "Stop watching" and Done. A bare category shows its
  narrower picks instead, and picking one replaces it.
- **Good to know:** the line in a text field, Remove and Done.
- **Add something you share:** the add field and the three suggestions.

### 4. Afterward: the profile and the themes manager

- The profile shows the same card: the relation line under the name, "You'd text Colin
  about" with the same one-line rows and sheets, and a "Tell Harbored more about Colin"
  button that runs Describe again. A second description adds to the card: new themes and
  facts are added, a stated relation replaces the old one, and nothing is removed.
- The themes manager uses the same one-line rows.
- Today is unchanged (build 12's "Not something I'd send" and the Why line stay).

## What Harbored maps from a description

| On the card | Saved as | What it does |
|---|---|---|
| How you know them ("Teammates") | contact `relation` (build 12's six) | Tone of drafts and redrafts |
| Where from ("at High Point") | contact `relationNote`, at most 40 characters | Shown with the relation; part of the relation the scorer and redraft see |
| How close ("close") | contact `closeness`: `close` · `regular` · `loose` | When a quiet stretch becomes a drift card (decision 1) |
| What you'd text about | themes, each with its choices on or off | Exactly as in build 12: the checked choices are what counts |
| Where they work, if the contact card has no company | contact `company` | Grounds refinement and drafts (decision 4) |
| Good to know ("New dad since August") | appended to the contact's Notes | Shown on the profile; not used in scoring or drafts yet |

The description itself isn't stored (decision 3); the privacy policy already says text you use
to describe someone is sent for analysis and not kept.

## How it works

Two steps, so the card appears quickly and fills in:

1. **Map** (`/api/discover`, new mode `relationship`): one call reads the description and
   returns the relation, where-from, closeness, a company if one is named, up to five themes
   (each with a name, a kind, and `said`: what the person said about it, such as "we text
   during playoff games"), up to three good-to-know facts, and what was set aside. The prompt
   allows only what was said: nothing inferred about the contact, no invented details.
2. **Refine each theme** (`/api/refine-theme`, as today, in parallel): it now also takes
   `said`, and checks the choices that match it first ("we text during playoff games" turns
   on "Big games & playoffs"). Everything build 12 enforces still applies: the place rules,
   never offering a choice that never counts, bare categories, the clamps.

The card shows the relation, facts and theme names as soon as step 1 returns (a few
seconds), and each theme's choices as its refinement lands.

## Data

| Where | Field | Shape |
|---|---|---|
| contact | `relationNote` | string, at most 40 characters, one line |
| contact | `closeness` | `close` · `regular` · `loose`, or absent (treated as `regular`) |

`relation`, the theme fields and Notes are unchanged from build 12. `normalize` validates the
two new fields like the rest; build 12's app keeps unknown fields when it saves, so both
builds can share an account.

## Work, by file

### Phase 1: server

- `server/discoverHandler.js`: the `relationship` mode (prompt, JSON shape, clamps: relation
  must be one of the six, `relationNote` ≤ 40, `closeness` one of three, ≤ 5 themes with
  `said` ≤ 200, ≤ 3 facts ≤ 80 characters each, company ≤ 60; descriptions up to 2,000
  characters). Without a key it returns the keyword themes and nothing else.
- `server/refineHandler.js`: accept `said` (≤ 200 characters) and use it for which choices
  start checked; a `said` that names a kind of story that never counts changes nothing.
- `server/llm.js` labels and `vite.config.js`'s dev route need no change (same endpoints).
- Tests: the relationship shape and clamps, an off-list relation dropped, invented-field
  guards, `said` reaching the refine prompt, the 2,000-character limit.
- Done when: deployed, and live calls map five test descriptions sensibly (Colin's; one line;
  a long ramble; biography only; one with instructions inside it).

### Phase 2: the app

- `src/services/discovery.js`: `mapRelationship(text, contact)`.
- `src/services/themes.js`: `refineTheme` passes `said`.
- `src/components/ThemeComposerModal.jsx`: rewritten as Describe → card per person, keeping
  the progress bar, Skip, the mic, and what the first session does after the last person.
- New `src/components/RelationshipCard.jsx`: the card, used by the quiz and the profile.
- New `src/components/CardSheets.jsx`: the four edit sheets.
- `src/pages/app/ContactProfile.jsx`: the card in place of the relation line and theme rows,
  plus "Tell Harbored more about Colin".
- `src/pages/app/CommonGround.jsx`: the themes manager uses the one-line rows.
- `src/store/snapshot.js` and `dataStore.js`: the two new contact fields, `setRelation` taking
  where-from and closeness, `addNotes` (append facts, skipping ones already there), filling an
  empty company.
- `src/store/dataStore.js` `selectNudges` and `src/lib/status.js`: drift timing by closeness.
- `src/services/events.js` calls: `relationship_mapped` {themes, facts, voice},
  `card_confirmed` {edited}, `card_started_empty`.
- `src/pages/Privacy.jsx`: how close you are and where you know them from, saved with your
  account; good-to-know lines saved to Notes.
- Demo: sample people get a where-from and a closeness; the demo quiz maps for real on the
  website.
- Build 12's `ThemeRow` (chips on every row) is retired; `TextAboutChips`, `RelationPicker`
  and `NotForThemSheet` stay.

### Phase 3: check it, then ship

- Deploy the website; Liam tries the quiz in the demo and on his own account.
- iOS build 13 (decision 5), TestFlight, Liam's walkthrough: import three people, describe
  one by voice and one by typing, add things yourself for the third, edit a line of each kind,
  then "Tell Harbored more" from a profile.

## What we'll watch afterward

From the `events` table, counts only: how many people get described versus started empty,
how often a card is confirmed without edits (the mapping was right), and whether the first
session still finishes at the same rate.

## Risks

- **The mapping gets something wrong or invents it.** The prompt allows only what was said,
  code clamps every field, and nothing is saved until "Looks right", with every line visible
  and tappable.
- **Speed.** Mapping takes a few seconds and each theme a few more; the card fills in as it
  goes rather than waiting for everything.
- **People who won't type or talk.** "I'll add things myself" gives them a clean empty card.
- **Rate limits.** Five imported people is five map calls and about fifteen refinements,
  within today's limits (40 and 150 an hour per network).

## Decisions (answered 2026-10-27: all five as recommended)

1. **How close, and what it changes.** Three levels: Close (a quiet stretch becomes a drift
   card after 30 days), Catch up now and then (45 days, today's rule for everyone), Loosely
   (90 days). Recommended as written.
2. **Good to know goes into Notes,** where you already see it, and isn't used in drafts or
   scoring yet. Recommended yes.
3. **The description itself isn't kept,** only what was mapped. Recommended yes: it matches
   the privacy policy, and the card is the record.
4. **Fill an empty company** from the description (it shows on the card before anything is
   saved). Recommended yes.
5. **Version.** If 1.1.0 hasn't gone to review when this is ready, it ships as 1.1.0 (13);
   otherwise as 1.2.0.

## Not in this build

- Using Notes or good-to-know facts in drafts or scoring.
- Learning from messages you send.
- Reading anything from Messages or other apps.
- Changing Today, the scorer or push.
