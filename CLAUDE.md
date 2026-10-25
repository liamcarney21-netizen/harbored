# Harbored — project context

## What it is
Harbored is an iPhone app (with a web demo and companion) that keeps you in touch with the
people you choose, on purpose. For each person you name a few **themes** — things you share:
a team, a city, a company, a market. A nightly server scan watches the news for those
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
  `vercel.json` (daily scan at 13:00 UTC with push chained; weekly digest Monday 14:00 UTC).
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
  (sign-out that leaves nothing behind), `widget`, `contacts` (native picker), `speech`.
- `src/pages/` — website: `Landing`, `Privacy`, `Terms`, `Support`, auth pages.
- `server/` + `api/` — backend; `server/CHANGES.md` documents the latest hardening.

## Data model and sync (read before touching dataStore)
- One snapshot per user: `contacts`, `themesByContact`, `touches`, `meetings` (legacy),
  `prefs` (`push`, `digest`), `reasonState` (sent/dismissed per reason key).
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
- Writes happen only when `ownerId` is the signed-in user, the server has been reconciled
  (`synced`), and demo is off. Zustand: select stable slices; derive in render.

## Rules
- Copy: never "track/tracking" for people. No internal scoring vocabulary in the UI ("bar",
  "significance 70", "giveable"). The trust line is "Drafted for you. Nothing sends itself."
  Pitch outcomes, not Claude.
- The push gate is the product: a wrong push is worse than a missed one. Relevance first.
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
upload through Xcode Organizer (the CLI export can't use the signed-in Apple account).
Live: https://harbored-three.vercel.app · App Store id 6812816966 · GitHub
liamcarney21-netizen/harbored (public: keep audits and secrets out).

## Owner
Liam Carney — liamcarney21@gmail.com · support inbox harboredsupport@gmail.com
