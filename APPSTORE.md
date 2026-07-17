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
> they moved to, the market they work in, the hobby you have in common. Those themes become
> standing reasons to talk. Harbored watches them across live news, around the clock, and
> scores each development for significance. When something clears the bar, it tells you — and
> hands you a message already drafted, ready to review and send.
>
> **What you get**
>
> • **Common Ground** — per-person shared themes, monitored continuously and scored so you're
>   only interrupted when something genuinely matters.
> • **Drafted outreach** — a message written for the moment, sent through your own email or
>   Messages. You review every one; nothing goes out without you.
> • **Push when it counts** — a notification the moment an update clears your reach-out bar,
>   not a firehose of noise.
> • **Weekly digest** — a quiet roundup of everyone worth reaching out to this week.
> • **Discovery** — just met someone? Tell Harbored what you talked about and it surfaces the
>   themes worth watching.
> • **Prep briefs** — walking into a meeting? Get a one-page brief with the latest on them and
>   talking points that don't feel forced.
> • **Worth sending** — Harbored also flags things worth forwarding as a no-ask favor, so you
>   show up useful, not needy.
>
> **Import in seconds**
>
> Bring your people in straight from your iPhone contacts — pick who you want, and only the
> details Harbored needs come across. No spreadsheets, no retyping.
>
> **Private by design**
>
> Harbored never sells your data and never uses your contacts for advertising. You choose who
> to import, you control what's stored, and you can clear it anytime. The messages you send go
> through your own apps — their content never touches our servers. Read the full policy at
> harbored-three.vercel.app/privacy.
>
> Your network is your most valuable asset. Harbored makes sure you never let it drift.

## What's New (for this version)

> • Import contacts directly from your iPhone — pick who you want in a single tap.
> • Push notifications when an update clears your reach-out bar.
> • Faster, calmer, and more private than ever.

---

## Privacy nutrition labels (App Store Connect → App Privacy)

Declare these. **Nothing is used for tracking; nothing is sold.** Match this to the policy.

| Data type | Collected? | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| Contacts (name, email, phone, company) | Yes | Yes | No | App Functionality |
| Contact Info — your email address | Yes | Yes | No | App Functionality (account) |
| User Content — themes, notes | Yes | Yes | No | App Functionality |
| Identifiers — push device token | Yes | Yes | No | App Functionality (notifications) |
| Usage / Diagnostics | No | — | — | — |

Notes when Apple asks per data type:
- **Contacts**: collected only for the contacts the user explicitly imports; used to monitor
  news and draft outreach on the user's behalf. Not used to track across apps/sites. Not shared
  with third parties for their own use (sub-processors are storage/AI/email/push only).
- **The Anthropic (Claude) processing** is app functionality, not tracking — it scores
  significance and extracts themes; Anthropic does not train on the data.

---

## Screenshots to capture (6.7" + 6.5" + 5.5" required sizes)

Shoot these from the simulator (demo mode gives a full sample network with no login):
1. **Common Ground** — the "Worth reaching out" list with significance scores. The hero shot.
2. **A cleared update** — detail panel with the Claude "why this cleared the bar" rationale.
3. **Import from Contacts** — the native picker / import modal (Phase 4).
4. **Prep brief** — the meeting one-pager.
5. **Weekly digest** — the roundup view.

Caption each with the benefit, not the feature (e.g. "Know the moment there's a reason to reach out").

---

## Pre-submission checklist

- [ ] Privacy Policy URL live and reachable (`/privacy` — ships when `phase4-contacts`/this branch deploys)
- [x] Support URL resolves to something real (`/support` page — deploys with this branch)
- [ ] Nutrition labels entered to match the table above
- [ ] `NSContactsUsageDescription` present in Info.plist (done — Phase 4)
- [ ] Push Notifications capability enabled on the App ID (Apple Developer)
- [ ] Screenshots at all required sizes
- [ ] Keywords string ≤ 100 chars
- [ ] Build uploaded via Xcode / TestFlight
