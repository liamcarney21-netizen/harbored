# Harbored — Native App Roadmap

Goal: take Harbored from the shipped web product (harbored-three.vercel.app) to a
legitimate App Store iOS app. Written 2026-07-15, during the Claude Corps sprint
(application due 2026-07-17 — **prod stays frozen until submission**).

## The core architectural shift

Today, theme monitoring runs **client-side** (scanned when the app is opened). A native
app's entire value is the inverse: *Harbored noticed something while you weren't looking
and pinged you.* Everything below hangs off that inversion:

1. **Server-side scheduled scanning** — cron scans every user's themes on a schedule and
   writes results to Supabase (instead of scanning on page load)
2. **Push notifications** — APNs delivery when an update clears the significance bar

This is also what clears Apple's **Guideline 4.2 (minimum functionality)** — the rule used
to reject "website in a shell" apps. Push + native Contacts access = a real app.

## Stack decision

**Capacitor.** Keeps 100% of the existing React app; native capability arrives via plugins:
- `@capacitor/push-notifications` → APNs
- `@capacitor-community/contacts` → live CNContactStore picker (no vCard-export step)

React Native / SwiftUI would mean rewriting a UI that already shipped, for no user-visible
gain at this stage. Revisit only if webview performance actually bites.

## Apple admin checklist

- App ID + signing — Xcode automatic signing (Apple Developer account already enrolled)
- App Store Connect listing — name, screenshots, description
- **Privacy policy URL** — required, and substantive here (contacts data)
- Privacy nutrition labels — declare contacts/email collection
- Sign in with Apple — only required if third-party social login is offered; Supabase
  email/password does NOT trigger the rule (adding it anyway is a nice native touch)
- TestFlight (own phone + testers, no review) → App Store review (1–3 days + plan for one
  rejection/resubmit cycle)

## Phases

| Phase | Work | Rough effort |
|---|---|---|
| 1 | Server-side scanning: Vercel Cron + scan results stored in Supabase | ~1 week |
| 2 | Capacitor wrapper building + running on-device via Xcode | 2–3 days |
| 3 | Push end-to-end: APNs setup, device tokens, send on threshold | ~1 week |
| 4 | Native Contacts picker replacing vCard-export flow on iOS | 2–3 days |
| 5 | Privacy policy, App Store listing, TestFlight beta | 2–3 days |
| 6 | App Store submission + review cycle | 1–2 weeks calendar |

~4–6 weeks part-time to a submitted app.

**Phase 1 pays for itself even without native:** the same cron + stored results powers a
weekly-digest email — most of the retention value with zero Apple involvement.

## Phase 1 notes (first up)

- New Supabase table for scan results (user_id, contact_id, theme, headline, score,
  rationale, link, scanned_at) — separate from the `user_data` JSON blob
- `/api/scan` Vercel function, invoked by Vercel Cron with a shared secret; iterates
  users' themes via the Supabase **service-role key** (new server-only env var), reuses
  the existing news + score handlers, writes results
- Client reads stored results (live-scan stays as the demo-mode/dev fallback)
- Constraint: Vercel Hobby cron minimum interval is daily — fine for digest cadence;
  hourly/timely push cadence later needs Vercel Pro or an external scheduler
