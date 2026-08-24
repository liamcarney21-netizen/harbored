# Harbored — App Store Connect paste sheet

Everything below is ready to paste, in the order App Store Connect asks for it.
Reconciled to the CURRENT app (no Prep Briefs, no "Claude" in marketing copy).
Counts shown for every length-limited field.

═══════════════════════════════════════════════
## 1 · New App  (My Apps → + → New App)
═══════════════════════════════════════════════

- Platform: **iOS**
- Name → paste:  `Harbored`   (8 / 30)
- Primary language: **English (U.S.)**
- Bundle ID: select **app.harbored**
- SKU → paste:  `harbored-001`
- User access: **Full Access**

═══════════════════════════════════════════════
## 2 · App Information  (left sidebar → General → App Information)
═══════════════════════════════════════════════

- Subtitle → paste:  `Stay in touch, on purpose`   (25 / 30)
- Primary category: **Productivity**
- Secondary category: **Social Networking**
- Age rating: answer all "None" → **4+**

Privacy Policy URL → paste:
`https://harbored-three.vercel.app/privacy`

═══════════════════════════════════════════════
## 3 · Pricing  (Pricing and Availability)
═══════════════════════════════════════════════

- Price: **Free**
- Availability: **All countries/regions**

═══════════════════════════════════════════════
## 4 · Version details  (the 1.0 version page)
═══════════════════════════════════════════════

### Promotional text  (170 max)  — 168 chars
```
Tell Harbored what you share with the people who matter. It watches for real reasons to reconnect and drafts the message — so you never go quiet or sound generic again.
```

### Keywords  (100 max, no spaces after commas)  — 96 chars
```
network,contacts,relationships,keep in touch,networking,CRM,reminders,follow up,outreach,connect
```

### Support URL → paste:
`https://harbored-three.vercel.app/support`

### Marketing URL (optional) → paste:
`https://harbored-three.vercel.app`

### Description  (4000 max)
```
Your network is growing. Don't lose touch.

Staying genuinely in touch is hard. You can't always see what's happening in someone's world, so you go quiet — or you reach out and it sounds generic. Harbored fixes the part that actually breaks: knowing when there's a real reason to reconnect, and what to say.

HOW IT WORKS

Tell Harbored the themes you share with each person — the team you both follow, the city they moved to, the market they work in, the hobby you have in common. Those themes become standing reasons to talk. Harbored watches them across live news, around the clock, and scores each development for significance. When something clears the bar, it tells you — and hands you a message already drafted, ready to review and send.

WHAT YOU GET

• Common Ground — per-person shared themes, monitored continuously and scored so you're only interrupted when something genuinely matters.
• Drafted outreach — a message written for the moment, sent through your own email or Messages. You review every one; nothing goes out without you.
• Push when it counts — a notification the moment an update clears your reach-out bar, not a firehose of noise.
• Weekly digest — a quiet roundup of everyone worth reaching out to this week.
• Discovery — just met someone? Tell Harbored what you talked about and it surfaces the themes worth watching.
• Worth sending — Harbored also flags things worth forwarding as a no-ask favor, so you show up useful, not needy.

IMPORT IN SECONDS

Bring your people in straight from your iPhone contacts — pick who you want, and only the details Harbored needs come across. No spreadsheets, no retyping.

PRIVATE BY DESIGN

Harbored never sells your data and never uses your contacts for advertising. You choose who to import, you control what's stored, and you can clear it anytime. The messages you send go through your own apps — their content never touches our servers. Read the full policy at harbored-three.vercel.app/privacy.

Your network is your most valuable asset. Harbored makes sure you never let it drift.
```

### What's New in This Version
```
The first release of Harbored.
• Import your people straight from iPhone Contacts — pick who you want in a single tap.
• Tell Harbored what you have in common, and get a nudge only when there's a real reason to reach out.
• A message drafted for you, sent from your own email or Messages.
```

═══════════════════════════════════════════════
## 5 · App Privacy  (App Privacy → Get Started)
═══════════════════════════════════════════════

Answer YES to "Do you collect data?" Then declare exactly these; for every one,
**Linked to you = Yes, Used for tracking = No.**

| Data type (Apple's wording) | Purpose to pick |
|---|---|
| Contacts | App Functionality |
| Contact Info → Email Address | App Functionality |
| User Content → Other User Content (themes, notes) | App Functionality |
| Identifiers → Device ID (push token) | App Functionality |

Do NOT declare: Usage Data, Diagnostics, Location, Financial, Health. (The app collects none.)

If asked "used to track you across apps/websites?" for any of them → **No.**
If asked "shared with third parties?" → No third party uses it for their own purposes
(storage / AI processing / email / push are service providers only).

═══════════════════════════════════════════════
## 6 · Screenshots  (6.9" — iPhone 16 Pro Max sim; Cmd+S)
═══════════════════════════════════════════════

Log in with your real account (real themes + results look best). Five shots:
1. Common Ground "Reach out" list with significance scores  →  the hero shot
2. A cleared update tapped open — the "Harbored's read" rationale panel
3. Shared Themes tab — the per-contact theme chips
4. Import Contacts — the native picker / import modal
5. Weekly Digest — the roundup

Optional captions (benefit, not feature):
- "Know the moment there's a real reason to reach out"
- "See why it cleared the bar"
- "The themes that connect you, watched for you"
- "Bring your people in with one tap"
- "Your week in relationships, on one page"

═══════════════════════════════════════════════
## 7 · Before you hit Submit
═══════════════════════════════════════════════

- [ ] Push Notifications enabled on the App ID (Apple Developer → Identifiers → app.harbored)
- [ ] Build uploaded from Xcode and selected on the version page
- [ ] All five screenshots uploaded
- [ ] Description, keywords, promo text, support URL, privacy URL filled
- [ ] App Privacy answered (section 5)
- [ ] Export compliance: the app uses only standard HTTPS → answer "No" to the
      encryption question (ITSAppUsesNonExemptEncryption=false is already in Info.plist)
- [ ] REVIEWER ACCESS — the native app opens on the LOGIN screen (no marketing page,
      no demo button there yet). Apple review WILL fail without a way in. Pick one:
      (A) Add a "Try a live demo" button to the native login screen (recommended — good
          UX + no credentials to hand Apple). Small code change; ask Claude.
      (B) Provide a working demo account in App Store Connect → "Sign-In Information."
- [ ] Export compliance: standard HTTPS only → the encryption question is auto-answered
      by ITSAppUsesNonExemptEncryption=false already in Info.plist.

Review notes (use if you went with option A — the demo button) → paste:
```
Tap "Try a live demo" on the sign-in screen to explore Harbored with a full sample
network, no account needed. Outreach opens the user's own Mail/Messages with a
prefilled draft — nothing is ever sent automatically.
```
