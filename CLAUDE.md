# Harbored — project context

## What it is
Harbored is an iPhone app (with a web demo and companion) that keeps you in touch with the
people you choose, on purpose. For each person you name a few **themes** — things you share:
a team, a city, a company, a market. A server scan every morning (16:00 UTC) reads the news for those
themes, scores what it finds with Claude, and when something is genuinely worth a message it
becomes a **reason**: the headline, the person, and a short draft. Reasons reach you by push
and show on the Today screen. Drifting relationships (no message in 45+ days) and birthdays
become reasons too. Harbored never sends anything: every message opens in your own Messages
or Mail.

The phone app is the product. The website is its demo and a desktop companion. There is one
layout for every screen (phone-width, centered on desktop); do not add desktop-only layouts.

## Stack
- React 19 + Vite, Zustand, framer-motion (fades/slides only), react-router. Capacitor 8
  wraps the same build for iOS (Swift Package Manager, not CocoaPods). WidgetKit widget in
  `ios/App/HarboredWidget`.
- Supabase: auth + Postgres (`user_data` one JSON blob per user, `scan_results`,
  `device_tokens`, plus the tables in `supabase/migrations/`). Row-level security is on.
- Vercel: static site + serverless functions in `api/` (handlers in `server/`), crons in
  `vercel.json` (daily scan at 16:00 UTC with push chained; the weekly recap email has no
  schedule while it's opt-in only and has no sending domain).
- Anthropic API (`server/llm.js`) for scoring, refining themes, drafting, redrafting.
  Pin a model id explicitly; never fall back to keyword scoring in the cron path.
- APNs via `server/pushHandler.js`; Resend for the digest and owner alerts.

## Where things live
- `src/pages/app/` — the app: `CommonGround.jsx` (Today, the deck of reasons + draft screen
  + themes manager), `Network.jsx` (Crew), `ContactProfile.jsx`, `Settings.jsx` (You).
- `src/components/` — shell (`AppLayout`, `BottomTabBar`), `Onboarding`, the import flow
  (`ImportContactsModal`, `AddContactModal`), the theme quiz (`ThemeComposerModal`),
  `ThemeAdder` (the one non-quiz way to add a theme), `WhyDisclosure`, `StreamText`.
- `src/ui/` — tokens (`T`), `Button`, `Card`/`Row`/`Eyebrow`/`PageTitle`, `Field`
  (`Input`, `TextArea`, `Label`, `Toggle`, `ErrorText`), `Sheet` (the only modal), `toast`.
  New UI uses these; don't re-declare colors or hand-roll buttons.
- `src/store/dataStore.js` — the account's data and its sync (see below). `snapshot.js` —
  the pure snapshot helpers it uses (shape, repairs, three-way merge), importable from
  scripts. `authStore.js`, `demoStore.js` (no-auth demo over seed data; never active for a
  signed-in user).
- `src/services/` — `scanResults` (read the server's reasons), `monitoring` (live scan,
  demo only), `themes` (refine), `outreach` (mailto/sms deep links), `push`, `session`
  (sign-out that leaves nothing behind), `widget`, `contacts` (native picker), `speech`,
  `events` (funnel events into the `events` table: names and small counts, never names,
  contact details, headlines or message text; the app can insert but never read them).
- `src/pages/` — website: `Landing`, `Privacy`, `Terms`, `Support`, auth pages.
- `server/` + `api/` — backend; `server/CHANGES.md` documents the latest hardening.

## Data model and sync (read before touching dataStore)
- One snapshot per user: `contacts`, `themesByContact`, `touches`, `meetings` (legacy),
  `prefs` (`push`, `tz`, `recap`; the old `digest` flag is ignored), `reasonState`
  (sent/dismissed per reason key, with `why` for "Not something I'd send").
- Build 12 fields (`src/lib/relations.js`, `src/lib/themeChoices.js`; `normalize` validates them
  and the server clamps them again): a contact's `relation`; a theme's `textAbout` choices
  (`[{ label, on }]`, the checked ones define what counts), `textAboutConfirmed`, `bare` and
  `narrower`, `bar` (raised by "Too small to text about"), `favors: false`, `notAbout` headlines.
- `hydrate()` renders the cached copy at once, then reconciles with the server. A failed
  read sets `loadError` and **never writes**. A missing row is created with an insert that
  cannot overwrite.
- Writes are debounced, one in flight, conditional on the `updated_at` last seen. On a
  conflict (or a dirty cache at launch) the server copy is three-way merged against the
  copy the server last confirmed: a removal on either side sticks, and a field changed on
  this device keeps this device's value. An edit made while a save is out stays dirty until
  its own write lands. Local edits are cached (dirty, with that base) so they survive
  relaunch and offline use.
- Every load runs `repairSnapshot`: theme ids made unique per person (`id~2`, `id~3`;
  update, remove and merge all address themes by id, so never mint one from `Date.now()`
  alone), sample people (`seed: true`) removed outside the App Review account
  (`REVIEW_EMAILS`), made-up `@example.com` emails blanked. A repair is saved like an edit.
- First session: import suggests 3 to 5 people and the quiz covers at most 5; when a new
  account's quiz ends, Today waits for the theme refinements and the save, then runs
  `/api/rescan` with narration, lands on what it found (or "What Harbored checked"), and only
  then offers notifications behind a short explainer.
- Writes happen only when `ownerId` is the signed-in user, the server has been reconciled
  (`synced`), and demo is off. Zustand: select stable slices; derive in render.

## Rules
- Copy: never "track/tracking" for people. No internal scoring vocabulary in the UI ("bar",
  "significance 70", "giveable"). The trust line is "Drafted for you. Nothing sends itself."
  Pitch outcomes, not Claude.
- The push gate is the product: a wrong push is worse than a missed one. Relevance first.
  A place theme means life there (what people who live there would notice), never news from
  companies based there; press releases only count for company and person themes. A topic
  counts only when the headline names it, and a bare category ("health and wellness") produces
  nothing. An ordinary regular-season game or a live-score page is never a reason. When a theme
  has checked "What would you text them about?" choices (`textAbout`), they define what counts:
  the scorer must name the one a story is, and code drops any story that names none. Choices
  only narrow; they never loosen these rules.
- Notification budget (the promise on the You tab; pinned by
  `server/notificationBudget.test.js`): only the morning scan pushes (never "Check again" or
  the first scan); at most one notification a day (two stories bundled) and three a week
  (birthdays get through), one per person a week; only between 8 AM and 9 PM in the person's
  own time zone (`prefs.tz`, kept current by the app); never a sound; the breaker holds any run
  that would notify most people at once and alerts instead. Email is opt-in only
  (`prefs.recap`). Loosening any of this is a product decision, not a tweak.
- Fonts are self-hosted (@fontsource); no third-party CSS imports.
- Pricing: none yet. The app is free. Don't invent tiers in copy.

## Dev
```bash
cd ~/harbored && npm run dev          # http://localhost:5173 (dev middleware mirrors /api)
npm test                              # vitest
npm run lint                          # eslint (src + server + api)
npm run build && npx cap sync ios     # then open ios/App/App.xcodeproj or build via xcodebuild
```
`.env.local` holds the production Supabase service-role key: never call `/api/scan` against
the dev server.

## Deploy
Web: `npx vercel --prod` from `main`. iOS: bump `CURRENT_PROJECT_VERSION`/`MARKETING_VERSION`
in `ios/App/App.xcodeproj/project.pbxproj`, `xcodebuild archive` to `/private/tmp/hb-archiveN`,
then upload with `xcodebuild -exportArchive -allowProvisioningUpdates` and export options
`method app-store-connect`, `destination upload`, `teamID PAGZC8A3US` (it uses the Apple
Account signed in under Xcode → Settings → Apple Accounts; Organizer's Distribute App also works).
Live: https://harbored-three.vercel.app · App Store id 6812816966 · GitHub
liamcarney21-netizen/harbored (public: keep audits and secrets out).

## Owner
Liam Carney — liamcarney21@gmail.com · support inbox harboredsupport@gmail.com
