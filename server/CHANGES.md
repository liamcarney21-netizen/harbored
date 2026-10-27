# Backend hardening (branch `polish`, October 21, 2026)

What changed in `server/`, `api/`, `supabase/migrations/` and the dev routes in `vite.config.js`, and why. Findings referenced as "audit N" are in `AUDIT-backend.md`. Nothing here was deployed or run against real data. Every test stubs Supabase and the network.

## What changed and why

1. **One Anthropic caller (`server/llm.js`).** Score, refine, redraft and discover all go through `callClaude`. It has a per-attempt timeout and an optional overall deadline. It retries twice with backoff and jitter on 408/409/429/5xx/529 and network errors, and honours `retry-after`. A result only counts as success when `stop_reason` is `end_turn` or `stop_sequence`; `max_tokens` and `refusal` count as failures. JSON parsing tries the whole text, then a code fence, then the first balanced object; brace-slicing is only the last resort. Failures are logged with the reason and HTTP status, never prompt text or model output. Scoring uses temperature 0. `temperature` is left out for models that reject it (Opus 4.7+, every 5.x model), so an `ANTHROPIC_MODEL` override can't turn every call into a 400. The model is still `process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'`. (Audit 1, 15, 21, 23.)
2. **No silent keyword fallback in the cron.** `scoreItems(items, { allowFallback })` and `handleScoreRequest(body, { allowFallback })` both take the option. The public `/api/score` keeps the fallback for the demo, but every result now says which engine produced it (`claude`/`heuristic`), and the top-level `engine` is `mixed` when a batch used both. The cron and rescan use `allowFallback: false`. If a user's Claude call fails, their stored rows are left exactly as they were, they get no push, and the run counts them as errored. Items the model leaves out are stored as `engine: 'unscored'` (`above_bar` false, `score` 0, `relevant` false), never keyword-scored. A reply with no usable results counts as a failed call. (Audit 1.)
3. **Per-user isolation and atomic-enough writes.** Each user is scanned in their own try/catch with stage-tagged errors (`news`/`score`/`read`/`insert`). New rows are inserted before the rows they replace are deleted, so a failed insert can't wipe a user's results. Scores are rounded and clamped to integers 0–100. Result ids are positional and validated, so unknown or duplicate ids are ignored. Push runs after the user loop even when users errored; those users are excluded. A failed read of a user's existing rows now stops that user instead of making every story look new. Users are read in pages of 500, least recently scanned first, using `user_data.last_scanned_at` (set after a complete cron scan). Users the budget doesn't reach are reported as `users_skipped` and go first next time. The run stops starting new users after 34s, so push and the run record still fit in the 60s function. (Audit 2, 4, 18.)
4. **Sample contacts are never scanned.** Contacts with `seed: true` are left out of theme pairs, birthday rows and birthday detection, and their old rows are cleared. (Audit 10.)
5. **Observability (`server/scanRun.js`).** Every `/api/scan` run writes one `scan_runs` row (it tolerates the table not existing yet) and logs a one-line JSON summary with counts and 8-character user ids only. The run is **healthy** when no user errored (including failed row cleanup), `items_fallback` is 0 (every item was scored by Claude), and push neither threw nor had a failed send. An unhealthy run emails `ALERT_EMAIL` (default `harboredsupport@gmail.com`) through Resend from `Harbored <onboarding@resend.dev>`, if `RESEND_API_KEY` is set. A healthy run sends a GET to `HEARTBEAT_URL`, if set. The URL is never logged. (Audit 5.)
6. **Preferences.** `data.prefs.push === false` skips push for that user. `data.prefs.digest === false` skips the weekly email. If the digest can't read preferences, it sends nothing rather than risk mailing someone who opted out. (Audit 11.)
7. **Fresh news and real dates.** Google News queries get `when:3d`. The RSS parser now reads `guid` and `link` and parses `pubDate` into `publishedAt` (ISO). It sorts newest first, returns at most 8 items, and decodes entities in a single pass, including numeric ones like `&#8217;` (`&amp;lt;` stays `&lt;`). The scan fetches up to 8 items per theme, drops anything without a date or older than 72h, and scores only the freshest, so cost is still one item per theme. Rows now store `published_at`, `engine`, `story_key` and `relevant` (migration 0005). If those columns are missing, the insert is retried without them and the run logs it once. (Audit 6, 22.)
8. **Durable dedupe.** `story_key` is the sha1 of the article link with `utm_*`/`oc` and the fragment stripped; failing a link, of the guid; failing that, of the lowercased title with punctuation stripped. Push decides against `notified_stories` (migration 0006): it claims a story by inserting the row **before** sending and releases it only if no device accepted. A crash can lose a push but never send the same story twice. Push still sets `notified_at` on `scan_results`, including rows of the same story re-found later. Without the table, push falls back to `scan_results.notified_at`, the old one-scan-deep behaviour. `apns-collapse-id` is `harbored-<user8>-<YYYY-MM-DD>`. Push rows older than 90 days are pruned. (Audit 3.)
9. **Scoring prompt and push gate.** The scorer now sees each theme's resolved subject (quoted entities from the refined query, else the label), `subjectType` (entityType), `watchFor`, whether it was refined, and article age. It returns a separate `relevant` boolean plus `significance` 0–100. Items sit inside an `<items>` untrusted-data block, `<`/`>` are escaped so a headline can't close the block, and the model is told to ignore instructions inside it. Article links never reach the model. A draft containing any URL other than the article link fails the item closed: relevant becomes false, the draft is dropped, and score is capped at 20. Irrelevant items are capped at significance 20, and a missing verdict counts as not relevant. **Display:** `above_bar` = relevant and score ≥ 70, as before. **Push:** engine `claude`, relevant, score ≥ 80, published within 72h, and only rows from the current run (`/api/push` alone looks back 24h). Birthdays always pass. Caps are 2 stories per user per rolling 24h and 1 per contact per 7 days (birthdays are exempt from the contact cooldown). Rows from before migration 0005 lack the columns, so push relies on `above_bar`, score ≥ 80 and the current-run filter, all of which the new scan guarantees. (Audit 7, 8, 16, 17.)
10. **APNs hardening.** The HTTP/2 session has an `'error'` listener and reconnects if it dies. Each request has a 10s timeout. A stream close without a response counts as a failure. Tokens rejected with 410/`Unregistered` are deleted. `BadDeviceToken` ones are deleted only if some send in the same run succeeded, because a misconfigured `APNS_ENV` or topic makes every token look bad; until then they count as failures, which triggers the alert. Logs never include tokens or names (the old code logged the last 6 token characters). Sandbox/production selection is unchanged. (Audit 14.)
11. **`/api/rescan`** (`server/rescanHandler.js`, `api/rescan.js`, plus a dev route). It verifies the caller's Supabase JWT with `auth.getUser(token)`, the same way delete-account does. It scans only that user under the cron's rules, allows 3 per hour per user id (plus 30 per hour per IP in front of the token check), and doesn't push or move the user in the cron rotation. The contract is below.
12. **Input clamps on the public endpoints** (400 beyond the limit; existing per-IP limits unchanged): refine `label` ≤ 120 characters; discover `text` ≤ 12,000; score ≤ 20 items, each string field (and each `watchFor` entry) ≤ 500 and arrays ≤ 10 entries; redraft `contactName`/`headline`/`themeLabel`/`current` ≤ 2,000; `/api/news` `q` ≤ 500. (Audit 9.)
13. **Small fixes.** Comments that were wrong are corrected ("freshest headline", "neither push nor the digest re-alerts", the `api/push.js` header). Entity decoding is fixed (item 7). The waitlist log no longer prints names or emails; it logs only the plan. The digest no longer logs a failed address; it counts failures in `sendFailures`. The digest renders "Heads-up: <when>" instead of the raw `[Heads-up · …]` prefix and mentions the recap toggle. Dev middleware: `/api/scan`, `/api/digest` and `/api/push` now require `CRON_SECRET` to be set **and** sent as `Authorization: Bearer`; `?secret=` is gone. Dev `/api/scan` runs push in preview, writes no `scan_runs` row and sends no alert. The birthday push title keys on `theme_category === 'birthday'`, not the label. `eventWhen` is truncated to 25 characters so the client's 30-character heads-up regex always matches. Account deletion also deletes `notified_stories` and tolerates the table not existing yet. Rows older than 72h are cleared on the next scan of that user, so stale cards and rows for themes the cap no longer reaches stop lingering. (Audit 17, 22.)
14. **Tests.** 10 server test files, 88 tests, all with a network guard (`server/testing/guards.js`): every secret from `.env.local` is blanked and global `fetch` throws. `server/testing/fakeSupabase.js` is an in-memory Supabase that **applies** filters and ordering, rejects non-integer scores and duplicate keys like Postgres, and simulates missing tables and columns. `orchestration.test.js` now uses it, so dropping `.is('notified_at', null)` or the `above_bar` filter fails a test. The plan's tests map to: (a) `scanRun.test.js` "a Claude failure during the cron" (real `scoreItems` → real `callClaude` → fake 529s); (b) "H1 → H2 → H1", with default caps and with caps disabled so dedupe alone is proven; (c) "one user's insert error", which also stores a 72.5 as 73; (d) `scoreHandler.test.js` "score parsing" (code fences, 72.5, `"85"`, missing, unknown and duplicate ids); (e) `newsHandler.test.js` (ordering, 72h filter, `when:3d`, entities); (f) `pushHandler.test.js` "push gate" (relevant/engine/age/caps) plus live-send behaviour.

## Build 10 follow-ups (October 25, 2026)

From the October 23 audit. No migration needed; all of it works before 0004–0007 too.

1. **Every theme gets its turn.** Past `MAX_PAIRS_PER_USER` (6), `pairsForUser(data, max, { day })` scans a window of 6 pairs that moves forward by 6 each UTC day and wraps, so n pairs are all scanned within ceil(n / 6) days. The cron and `/api/rescan` use the same day. Pairs outside today's window are counted in `pairs_waiting`.
2. **Old rows are swept for everyone.** After the user loop, the cron deletes every `scan_results` row with `scanned_at` older than 72h (`rows_expired` in the summary; a failed delete counts as a cleanup error). Before this, accounts with no themes left kept their last rows forever.
3. **No pushes from broad themes.** A theme whose refinement resolved to `entityType: 'topic'` (a bare category such as "fintech startup" for a contact with no company) can show on Today but is gated as `broad-theme`. The scan hands each user's broad pairs to push; `/api/push` on its own reads them from `user_data`.
4. **Bad news.** The scorer marks deaths, violence, disasters, serious illness, layoffs, crime and scandal as `sensitive` (ordinary sports setbacks are not). Its draft must be a gentle check-in. Below `SENSITIVE_PUSH_THRESHOLD` (90) the score is held at 79, so it can show on Today but never push.
5. **Favors come from the scorer.** For a relevant, non-sensitive story below the bar that's worth forwarding (a guide, ranking, schedule, report), the scorer writes `passAlong`, a short note without a link. The scan stores it in `draft_message` on that below-bar row; the app shows a favor only for such rows, so the client's keyword list is gone. Older app builds ignore `draft_message` below the bar.

## Build 11 (October 26, 2026)

1. **The best of a few stories per theme.** The scan scores the freshest three items per theme (fewer when a user has more than six themes, so one Claude call never exceeds 20 items) and keeps one row per theme: the relevant story with the highest score, the newer one on a tie; when none is relevant, the strongest of the rest, so "What Harbored checked" still has a headline and verdict. Before, only the newest item was scored, so a morning preview beat yesterday's trade. Rows, push and the client are unchanged in shape.
2. **The notification budget.** Pushes carry no sound. They only land between 8 AM and 9 PM in the person's own time zone (`prefs.tz`, written by the app; unknown zones count as inside), and the daily cron moved from 13:00 to 16:00 UTC, which is 8 AM to noon across the continental US year-round (13:00 UTC was 5 AM Pacific once daylight saving ends). On top of one notification a day and one per contact a week, there's a cap of three notifications a week (distinct `notified_at` times in the last seven days); birthdays get through it. The breaker holds every push when a run would notify at least 5 people and more than half of everyone with a device, marks the run unhealthy and so alerts the owner; `PUSH_BREAKER_OFF=1` lets one deliberate run through. The weekly recap is opt-in only (`prefs.recap === true`; the old default-on `prefs.digest` no longer counts) and its Monday cron is gone. `server/notificationBudget.test.js` pins all of it.
3. **`events` (migration 0008).** Funnel events written by the client (RLS: insert own only, no read policy); delete-account clears them. Apply 0008 before relying on the funnel; until then inserts fail quietly in the browser console.

## Place and topic themes (October 26, 2026)

From the build 11 walkthrough. A "Southern California" theme, set up for a contact who lives in Orange County, surfaced a PR Newswire release about a robotics acquisition. It scored 65 and was offered as a favor "given your SoCal focus". A dry run of the same account's scan then showed broad topic themes turning up stories that never named them (items 5 and 6). Server only: no app build, no migration.

1. **A place is searched as the place itself.** Refinement no longer gives a place an OR-group of event types. It quotes the place and adds the theme's own words only when they name a kind of news there ("Orange County real estate"). For themes refined before this, `newsQueryFor` drops a place query's OR-group of plain lowercase terms (`(startup OR funding OR real estate OR tech OR business)`) and keeps a group that names things (`(Broncos OR Avalanche)`).
2. **Place news means life there.** The scorer judges a place theme by one rule. Either the story is the kind of news the theme's own wording names, or people who live there will still be talking about it next week: a wildfire, a hurricane, a big event, a local team's big moment, a landmark, a major civic change. Routine local coverage doesn't count: weather advisories and routine coastal flooding, traffic, everyday crime, campus happenings. Neither does news that is merely set there, such as a Super Bowl halftime headliner at SoFi or a celebrity. A company's deal, funding, launch, earnings or press release is not place news just because the company is based there. A place's stored `watchFor` is no longer sent to the scorer, since older refinements filled it with business terms. Bad news about a place is a check-in only when it could have touched the contact.
3. **Press releases.** `isPressRelease` recognises the wires by source name: PR Newswire, Business Wire, GlobeNewswire, Accesswire, EIN Presswire, PRWeb, Newsfile and a few more. The scan drops them before scoring for every theme except company and person themes, so they never take a theme's slot. A press release is never passed along.
4. **Narrower pass-along.** A favor must be an article this contact would personally enjoy because of what the two of you share. It is never an announcement, a deal, funding or market news, or anything whose connection to them needs explaining.
5. **A topic counts only when the headline names it.** `headlineNamesSubject` checks that a word of the theme's subject or of its label appears in the headline. Plurals, hyphenated forms and longer forms count ("mid-century", "midcentury", "modernism"). The scan drops topic stories that fail before scoring (`scorableFor`, which also drops the press releases), and the scorer overrules a model that connects a topic to a headline that never names it. "Vacant Galveston hotel vies for landmark status" no longer counts as mid-century modern architecture.
6. **Bare categories produce nothing.** A theme that is only a broad field, such as "health and wellness", "basketball" or "real estate", gets no reasons or favors, refined or not. Before, only unrefined ones were held back. The model is told this. `isBareCategory` also enforces it for any topic theme made only of broad field words (health, wellness, real estate, sports, tech, music and so on): the scan scores none of its stories, and the scorer overrules the model on it. A topic's stored `watchFor` ("wellness studies") is no longer sent to the scorer, because it talked the model out of the rule. Only company, team and person themes send `watchFor` now. The app already shows bare themes as "Too broad to watch well".
7. **Ordinary games aren't reasons.** For a "Colorado Avalanche" team theme, the scorer called a FOX Sports "Devils vs. Avalanche – Live Score" page for a regular-season game "a marquee game" and scored it 75 with a "you watching?" draft. The prompt now defines a marquee game: a playoff or championship game, a rivalry with real stakes, a season opener, or a record or milestone moment. An ordinary regular-season game is routine. `isListingPage` recognises live-score, box-score, scoreboard and TV listing headlines. The scan drops them before scoring, and the scorer holds them at `ROUTINE_MAX` (40) with no draft or favor. The scorer also has to label any single-game headline as playoff, championship, rivalry, opener, milestone or regular, and a game it labels "regular" is held at `ROUTINE_MAX` too, so a losing streak or a "must-win" can't argue an ordinary game past the bar.

Old place themes keep their stored `display` line ("…for business news") until the app re-refines them.

## Migrations to apply, in order

Paste each into Supabase → SQL Editor. All are idempotent (`if not exists`), and the code runs without any of them. Each missing one is logged once per run with the migration number. Apply them in number order: 0004 → 0005 → 0006 → 0007. 0005 unlocks the full push gate. Apply it no later than 0006: without `story_key`, push records the `content_key` in `notified_stories` instead of the sha1. Push dedupe is only fully durable from the moment 0006 exists, so a story pushed in the few days before it could be re-pushed once in that window.

### `supabase/migrations/0004_scan_runs.sql`

```sql
create table if not exists public.scan_runs (
  id               bigserial primary key,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  users_total      integer not null default 0,
  users_scanned    integer not null default 0,
  users_skipped    integer not null default 0,
  users_errored    integer not null default 0,
  items_claude     integer not null default 0,
  items_fallback   integer not null default 0,
  above_bar        integer not null default 0,
  pushes_attempted integer not null default 0,
  pushes_ok        integer not null default 0,
  pushes_failed    integer not null default 0,
  healthy          boolean not null default false,
  error            text
);

create index if not exists scan_runs_started_idx
  on public.scan_runs (started_at desc);

alter table public.scan_runs enable row level security;
```

### `supabase/migrations/0005_scan_results_story_fields.sql`

```sql
alter table public.scan_results
  add column if not exists published_at timestamptz,
  add column if not exists engine       text,
  add column if not exists story_key    text,
  add column if not exists relevant     boolean;

create index if not exists scan_results_push_candidates_idx
  on public.scan_results (scanned_at)
  where above_bar and notified_at is null;
```

### `supabase/migrations/0006_notified_stories.sql`

```sql
create table if not exists public.notified_stories (
  user_id     uuid not null references auth.users (id) on delete cascade,
  contact_id  text,
  story_key   text not null,
  notified_at timestamptz not null default now(),
  primary key (user_id, story_key)
);

create index if not exists notified_stories_user_time_idx
  on public.notified_stories (user_id, notified_at desc);

create index if not exists notified_stories_time_idx
  on public.notified_stories (notified_at);

alter table public.notified_stories enable row level security;
```

### `supabase/migrations/0007_user_data_last_scanned.sql`

```sql
alter table public.user_data
  add column if not exists last_scanned_at timestamptz;

create index if not exists user_data_last_scanned_idx
  on public.user_data (last_scanned_at asc nulls first);
```

## New environment variables

| Var | Default | Used for |
|---|---|---|
| `ALERT_EMAIL` | `harboredsupport@gmail.com` | Where the unhealthy-run alert goes. Uses the existing `RESEND_API_KEY` and the existing sender `Harbored <onboarding@resend.dev>`, which only delivers to the Resend account owner, so a different address won't receive anything until a domain is verified. |
| `HEARTBEAT_URL` | unset (no ping) | Dead-man's switch (e.g. a Healthchecks.io or Better Stack heartbeat URL). Gets a GET only after a **healthy** run, so missed pings mean the cron broke or ran unhealthy. Never logged. |

No other env vars changed. `ANTHROPIC_MODEL`, `CRON_SECRET`, `RESEND_API_KEY`, `APNS_*` and `SUPABASE_*` behave as before.

## `scan_results` fields the client can rely on

All additive; `content_key`, `score`, `above_bar`, `rationale` (with the `[Heads-up · …]` prefix), `draft_message`, `notified_at` and `scanned_at` keep their meaning. Until migration 0005 is applied the four new fields are **absent** (`row.x` is `undefined`), so treat missing as unknown.

| Field | Meaning |
|---|---|
| `published_at` | The article's own publish time from the RSS `pubDate` (ISO). Use it for "x hours ago" instead of `scanned_at`. News rows from the new scan are always ≤ 72h old when written. Birthday rows use the scan time. |
| `engine` | `'claude'` (scored by Claude), `'unscored'` (Claude left it out: `score` 0, `above_bar` false, `rationale` null; show it as "not scored", not as a judgment), or `'birthday'`. The cron never writes `'heuristic'`. `null` = a row from before this change. |
| `relevant` | Claude's verdict on whether the headline is about the watched subject. `above_bar` implies `relevant`. Irrelevant rows have `score` ≤ 20, so the client's `score >= 70` rule stays consistent with `above_bar`. |
| `story_key` | sha1 of the article link (40 hex chars); the same story has the same key under any theme or headline wording. Good for de-duplicating cards. `content_key` stays the right key for per-card sent/skipped state. |

Behaviour the client will notice:
- A theme with no news in the last 72h produces **no row** (it used to get whatever stale item Google ranked first), and rows older than 72h are removed on that user's next scan. Expect emptier decks on quiet days. Old App Store builds fall back to their live scan when a user has no rows at all, which means a few more `/api/score` calls.
- Sample (seed) contacts never get rows.
- `score` for Claude rows is a relevance-gated significance: ≥ 70 = worth showing, ≥ 80 (plus relevant, fresh) = eligible to push.

## `POST /api/rescan` contract

- Request: `POST /api/rescan` with `Authorization: Bearer <supabase access token>`. No body.
- Scans only the caller's account under the cron's rules: Claude only, seeds skipped, newest 6 theme pairs, freshest item ≤ 72h per theme. It doesn't push and doesn't change the user's place in the cron rotation. On success it replaces the refreshed rows exactly like the cron does, so re-read `scan_results` afterwards.
- Responses:
  - `200 { ok: true, status: 'scanned', themes, news_ok, news_failed, items_found, items_claude, items_unscored, above_bar, rows_written, rows_deleted, cleanup_error }`
  - `200 { ok: true, status: 'idle', … }` when there is nothing to scan (no themes, no birthday today).
  - `401 { ok: false, status: 'unauthorized', error }` for a missing, invalid or expired token.
  - `429 { ok: false, status: 'rate_limited', error }` for more than 3 per hour per user (30 per hour per IP in front).
  - `502 { ok: false, status: 'scoring_unavailable' | 'news_unavailable', error }`. Stored results were left untouched.
  - `500 { ok: false, status: 'error', error }`.
- `405` for anything but POST. Limits are in memory per serverless instance, like the other endpoints.

## Other response changes (all additive)

- `/api/score`: each result gains `engine`, `relevant` and `significance` (`score` is still there and equal to `significance`). The body gains `model`, plus `unscored`/`fallback` counts when relevant. Top-level `engine` can be `mixed`. Errors are 400 for oversized input; 502 only happens with `allowFallback: false`, which the public route never uses.
- `/api/news`: queries carry `when:3d`. Items are sorted newest first, capped at 8, and gain `guid` and `publishedAt`. `q` over 500 characters is a 400.
- `/api/scan`: keeps `ok`, `usersScanned`, `usersWithThemes`, `resultsWritten` and `push`, and adds the full counters (`users_total/scanned/skipped/errored/idle`, `items_claude`, `items_fallback`, `above_bar`, `rows_written`, `errors[]` with short ids) and `run` (the `scan_runs` row). It returns 500 only when the run couldn't scan at all.
- `/api/push` (manual): only rows scanned in the last 24h. The summary adds `live`, `dedupe`, `gated`, `deduped`, `capped_daily`, `capped_contact`, `stories_pushed`, `pushes_*` and `tokens_pruned`.
- `/api/digest`: summary adds `skippedOptOut` and `sendFailures`.

## Deliberately not done (follow-ups)

- **Structured outputs** (`output_config.format` with a JSON schema; Haiku 4.5 supports it). Not turned on because it can't be checked against the live API here, and a schema the API rejects would fail every scoring call. The prompt plus the robust parser cover it for now; `llm.js` is the single place to add it.
- **Fan-out**: one invocation per user (queue/QStash/Inngest/pg_cron). The run is still one sequential 60s function with rotation and a 34s user budget; at roughly 7 users per run, users past that rotate onto later days.
- **Real transactional upsert** via a Postgres function (`rpc`). Insert-then-delete-by-id covers the data-loss case; if the delete fails, a user can briefly see old and new rows together (logged and alerted).
- **Per-token APNs environment** (audit 14), and **making a token belong to one user / deleting it on sign-out** (audit 12, mostly client).
- **JWT on score/refine/redraft/discover** and a shared rate-limit store (audit 9). The clamps limit the cost per call, but the per-IP limits are still in memory per instance.
- **Digest**: a verified sending domain, unsubscribe link, a "sent this week" marker, and reading a full week of history (audit 13). `auth.admin.listUsers` is still a single page of 1000.
- **Timezones** (audit 19): the cron is still 13:00 UTC, and birthdays and "today" are still computed in UTC.
- **Re-refining themes stored with the heuristic query** (audit 1); that's a client or one-off job. Refine now says `engine: 'heuristic'` honestly.
- **A labeled eval set** for the 70/80 bars (audit 8). The thresholds are constants in `scoreHandler.js` (`SIGNIFICANCE_THRESHOLD`, `PUSH_THRESHOLD`).
- **Excluding the App Review account by email.** Its sample contacts are `seed: true`, so it's already skipped.
- **Slimmer `user_data` reads** (`data->contacts` and so on). Left as `select('user_id, data')` because the JSON-path select syntax couldn't be verified against PostgREST here.
- **Waitlist**: signups are no longer written to logs, so a signup is lost if Resend is down or unset. That's the trade-off for keeping emails out of logs.
- **Dev routes still use whatever Supabase `.env.local` points at** (production). They now need the Bearer secret, and push and digest stay in preview, but dev `/api/scan` still writes real `scan_results`.
- Applied migrations 0001–0003 were left unedited, including the misleading 0002 header.
