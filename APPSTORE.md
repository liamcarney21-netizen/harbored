# Harbored — App Store Connect listing

Copy-paste source for the App Store Connect listing + the privacy nutrition labels.
Character limits noted where Apple enforces them. Everything here must stay truthful to
`src/pages/Privacy.jsx` — if the data handling changes, update both.

---

## Basics

- **App name** (30 chars max): `Harbored`
- **Subtitle** (30 chars max): `Stay in touch, on purpose` — 25 chars
- **Primary category**: Productivity
- **Secondary category**: Social Networking
- **Bundle ID**: `app.harbored`
- **Age rating**: 4+ (no objectionable content)

## URLs

- **Privacy Policy URL**: https://harbored-three.vercel.app/privacy
- **Support URL**: https://harbored-three.vercel.app/support
- **Marketing URL** (optional): https://harbored-three.vercel.app

---

## Promotional text (170 chars max — editable without a new build)

> Tell Harbored what you share with the people who matter. It watches for real reasons to
> reconnect and drafts the message — so you never go quiet or sound generic again.

(168 chars)

## Keywords (100 chars max, comma-separated, no spaces after commas)

```
network,contacts,relationships,keep in touch,networking,CRM,reminders,follow up,outreach,connect
```

(Count before submitting — Apple counts the whole string incl. commas. Trim from the end if over 100.)

---

## Description (4000 chars max)

> **Your network is growing. Don't lose touch.**
>
> Staying genuinely in touch is hard. You can't always see what's happening in someone's
> world, so you go quiet — or you reach out and it sounds generic. Harbored fixes the part
> that actually breaks: knowing *when* there's a real reason to reconnect, and *what* to say.
>
> **How it works**
>
> Tell Harbored the themes you share with each person — the team you both follow, the city
> they moved to, the company they work at, the market they're in. Every morning Harbored reads
> the news on those themes and judges what it finds. Most of it is routine, and you never hear
> about it. When something genuinely matters to that person, it becomes a reason: the
> headline, the person, and a message already drafted for you to review and send.
>
> **What you get**
>
> • **Today** — one reason at a time, like a front page about your people.
> • **A draft for every reason** — written for that person and that news, opened in your own
>   Messages or Mail. You review every one; nothing sends itself.
> • **A push only when it counts** — Harbored stays quiet unless something is worth a message.
> • **Check-ins when it's been a while** — a nudge and a short draft for people going quiet.
> • **Birthdays** — a reminder on the day, with a note ready.
> • **Worth passing along** — articles a friend would want to read, with a note to send them.
> • **Just talk** — describe someone in your own words and Harbored turns it into themes.
> • **A home-screen widget** — today's best reason, at a glance.
>
> **Import in seconds**
>
> Bring your people in straight from your iPhone contacts — pick who you want, and only the
> details Harbored needs come across. No spreadsheets, no retyping.
>
> **Private by design**
>
> Harbored never sells your data and never uses your contacts for advertising. You choose who
> to import, and you can delete your account and everything in it at any time. Messages are
> sent by you, from your own apps; Harbored keeps the text of what you sent in your history so
> it knows when you last talked. Read the full policy at harbored-three.vercel.app/privacy.
>
> Your network is your most valuable asset. Harbored makes sure you never let it drift.

## What's New (1.1.0) — draft for the build 13 submission

> • Tell Harbored about someone the way you'd tell a friend, by talking or typing. It sets
>   them up from what you say: how you know them, how close you are, and what you'd text them
>   about.
> • Only the stories you'd text each person about become reasons: storms near their home, big
>   games, news at their company.
> • "Not something I'd send" on any suggestion teaches Harbored what to skip next time.
> • How you know someone sets the tone of every draft, and how close you are decides when a
>   quiet stretch becomes a reason to reach out.
> • Your first session ends on what Harbored found, not a promise.
> • Notifications stay rare and quiet: at most one a day and three a week, only between 8 AM
>   and 9 PM, and never a sound.

## What's New (1.0.2)

> • Your home-screen widget now shows today's best reason to reach out.
> • Tapping a notification opens Today with the latest reasons.
> • Edits made offline or on two devices no longer get lost or come back after you remove them.
> • Bad news gets a gentle check-in draft, never an upbeat one.
> • Every theme gets watched, however many you have.
> • A calmer, faster app throughout, and the icon badge clears when you open it.

---

## Privacy nutrition labels (App Store Connect → App Privacy)

Declare these. **Nothing is used for tracking; nothing is sold.** Match this to the policy.

| Data type | Collected? | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| Contacts (name, email, phone, company) | Yes | Yes | No | App Functionality |
| Contact Info — your email address | Yes | Yes | No | App Functionality (account) |
| Contact Info — your name | Yes | Yes | No | App Functionality (account) |
| User Content — themes, what you'd text each person about, how you know them, notes, text of messages you sent (Other User Content) | Yes | Yes | No | App Functionality |
| Identifiers — push device token | Yes | Yes | No | App Functionality (notifications) |
| Usage Data — Product Interaction (funnel events, from build 11) | Yes | Yes | No | Analytics |
| Diagnostics | No | — | — | — |

Notes when Apple asks per data type:
- **Contacts**: collected only for the contacts the user explicitly imports; used to monitor
  news and draft outreach on the user's behalf. Not used to track across apps/sites. Not shared
  with third parties for their own use (sub-processors are storage/AI/email/push only).
- **The Anthropic (Claude) processing** is app functionality, not tracking — it scores
  significance and extracts themes; Anthropic does not train on the data.

---

## Screenshots to capture (one 6.9" set — iPhone 16 Pro Max simulator; Apple scales the rest)

The app is iPhone-only, so no iPad set is needed. Shoot from the simulator **logged in as a
real account with themes and scan results** (the native shell skips the marketing page and
demo mode — real data reads better in screenshots anyway). Cmd+S saves a native-resolution PNG.
1. **Common Ground** — the "Worth reaching out" list with significance scores. The hero shot.
2. **A cleared update** — detail panel showing "why this cleared the bar" (the "Harbored's read" rationale).
3. **Shared Themes** — per-contact theme chips (the core mental model in one glance).
4. **Import from Contacts** — the native picker / import modal.
5. **Weekly digest** — the roundup view.

Caption each with the benefit, not the feature (e.g. "Know the moment there's a reason to reach out").

---

## Pre-submission checklist

- [x] Privacy Policy URL live and reachable (`/privacy` — verified 200 on prod)
- [x] Support URL resolves to something real (`/support` — verified 200 on prod)
- [ ] Nutrition labels entered to match the table above *(manual — App Store Connect)*
- [x] `NSContactsUsageDescription` present in Info.plist (Phase 4)
- [x] Push entitlement wired in the repo — `ios/App/App/App.entitlements`
  (`aps-environment`) referenced by `CODE_SIGN_ENTITLEMENTS` in both build configs
- [ ] Push Notifications capability enabled on the App ID *(Apple Developer portal)*
      — in Xcode, Signing & Capabilities → the entitlement above is already present;
      toggling "Push Notifications" will register it on the App ID
- [ ] Screenshots at all required sizes *(shoot from simulator, demo mode)*
- [x] Keywords string ≤ 100 chars (96 chars — verified)
- [ ] Build uploaded via Xcode / TestFlight *(manual — needs Xcode + Apple ID)*
