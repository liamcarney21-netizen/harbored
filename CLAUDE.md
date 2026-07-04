# Harbored — Project Context

## What is this?
Harbored is a React + Vite landing page for a network intelligence app. Tagline: "Your network is growing. Don't lose touch." It tracks life events, promotions, and milestones so you can stay connected with your network.

## Stack
- React 19 + Vite 8
- Tailwind CSS v4
- Framer Motion (animations)
- React Router DOM (routing)
- Zustand (state management)

## Local Development
```bash
cd ~/harbored
npm run dev
```
Runs on http://localhost:5178

## Project Structure
- `src/pages/` — Landing, Login, Signup (routed) + legacy Feed/Jobs/Messages/Network/Profile (unrouted)
- `src/pages/app/` — the app: CommonGround (home at /dashboard), Dashboard (as /dashboard/overview), Alerts, Network, ContactProfile (/dashboard/contact/:id), PrepBrief (/dashboard/prep/:id — meeting one-pager with live theme updates + talking points; meetings stored in dataStore, scheduled from profiles with a Google Calendar deep link), Digest (/dashboard/digest), Messages, Analytics, Settings
- `src/components/` — AppLayout, AppSidebar, Onboarding (first-login walkthrough → hands off to AddContactModal), AddContactModal, Avatar, PlatformBadge, LakeScene
- `src/store/` — dataStore (Zustand + localStorage persist: contacts, themes, touches, notes; health derived from days-since-last-touch in `healthFromLastTouch`), authStore (legacy)
- `src/services/` — monitoring (live theme updates: /api/news fetch + heuristic significance scoring + template drafts; swap for a Claude call to go full AI), outreach (mailto/sms deep-link sending), discovery (client for /api/discover)
- `src/data/` — appData (alerts/messages seeds), commonGround (curated theme updates + SIGNIFICANCE_THRESHOLD)
- `server/newsHandler.js` — keyless Google News RSS fetcher, shared by vite dev middleware (vite.config.js) and the Vercel function `api/news.js`
- `server/discoverHandler.js` — Common Ground discovery (POST /api/discover): extracts shared themes from pasted conversation text. Uses the Claude API when ANTHROPIC_API_KEY is set (shell env in dev, Vercel project env in prod; model override via ANTHROPIC_MODEL), otherwise a keyword-taxonomy fallback. UI entry: "Discover" button on contact profiles (DiscoverThemesModal).
- `server/waitlistHandler.js` — waitlist signups (POST /api/waitlist): emails the owner via Resend when RESEND_API_KEY is set, otherwise logs to function logs. Landing WaitlistModal POSTs here (localStorage kept as client backup).
- `server/rateLimit.js` — per-IP in-memory rate limiting on the Vercel functions (discover 10/hr, news 120/hr, waitlist 5/hr). Not applied in dev middleware.
- Sample data: seed contacts are tagged `seed: true` (persist migration v2); Settings has clear/restore controls. Alerts page is marked as sample until real event detection exists.
- `public/` — static assets

## Key Behaviors
- Sending is real: Send buttons open prefilled mailto:/sms: links and record a touch in the store; touches drive relationship health and appear in Messages + profile timelines.
- Zustand gotcha: never subscribe with selectors that build new arrays (causes "getSnapshot should be cached" loop) — select stable slices, derive in render.

## Design System — "Editorial Harbor"
Warm paper canvas #F6F4EF, white cards with warm borders (#E6E2D8 family), deep harbor teal
accent #0D5C63 (hover #09454B), brass highlight #A97E2F (wordmark anchor, above-bar gauge
crests), ink text #1C2B33 / #5C6B73. Type: Fraunces (Google Fonts) for display headings,
wordmark ("Harbored", never all-caps), and stat/score numerals; Inter for UI. Signature: the
significance gauge is a "tide line" — teal fill cresting into brass past the threshold.
Health: strong #2E7D5B, cooling #A97E2F, at-risk #B4423A. Do NOT reintroduce LinkedIn blue.
Common Ground is the product's core feature: per-contact shared themes → significance scoring
(threshold 70) → reach-out prompts with drafted messages.

## Live Deployment
- **Live URL:** https://harbored-three.vercel.app
- **Vercel project:** liamcarney21-netizens-projects/harbored
- **GitHub repo:** https://github.com/liamcarney21-netizen/harbored

## How to Redeploy
```bash
cd ~/harbored
npx vercel --prod
```

## GitHub Push (when needed)
The remote is set up but auth was tricky. Use the token-embedded URL:
```bash
git remote set-url origin https://liamcarney21-netizen:TOKEN@github.com/liamcarney21-netizen/harbored.git
git push
```
Replace TOKEN with a fresh Personal Access Token from github.com/settings/tokens.

## Owner
Liam Carney — liamcarney21@gmail.com
