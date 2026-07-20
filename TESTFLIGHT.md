# Screenshots + TestFlight run sheet

Prep already done for you: iPhone-only target, encryption-exemption key (no compliance
questionnaire per upload), version 1.0 (build 1), icon/splash, privacy + support pages,
paste-ready listing copy in APPSTORE.md.

If anything looks different than described: stop and tell Claude.

---

## Part A — Screenshots (~20 min)

1. Xcode → device dropdown → **iPhone 16 Pro Max** (simulator, the big one — Apple
   scales this size down for all smaller phones).
2. Press ▶. When the app opens, **log in with your real account** — your real themes
   and scan results make better screenshots than fake data.
3. For each shot below, arrange the screen, then press **Cmd+S** (File → Save Screen).
   PNGs land on your Desktop at exactly the right resolution.

   - [ ] 1. Common Ground "Worth reaching out" list (the hero shot)
   - [ ] 2. Tap a cleared update → detail panel showing "Why this cleared the bar · Scored by Claude"
   - [ ] 3. Shared Themes tab (per-contact theme chips)
   - [ ] 4. Import Contacts modal with "Pick from your contacts"
   - [ ] 5. Weekly Digest page

4. That's it — one set is all Apple requires now.

## Part B — Create the app record (~10 min, appstoreconnect.apple.com)

1. Go to **appstoreconnect.apple.com** → sign in → **My Apps** → blue **+** → **New App**.
2. Fill in:
   - Platform: **iOS**
   - Name: **Harbored**
   - Primary language: **English (U.S.)**
   - Bundle ID: pick **app.harbored** from the dropdown (it's registered already)
   - SKU: `harbored-001` (internal only, never shown)
   - User access: Full Access
3. Create. Don't fill in the listing yet — that can wait; TestFlight doesn't need it.

## Part C — Archive & upload the build (~15 min, Xcode)

1. Device dropdown → scroll to the top → **Any iOS Device (arm64)**. (You can't archive
   to a simulator.)
2. Menu bar: **Product → Archive**. Takes a few minutes; the **Organizer** window opens
   when done with your archive selected.
3. Click **Distribute App** → choose **TestFlight & App Store** (or "App Store Connect")
   → **Upload** → accept all defaults → Upload.
4. Wait for the "processing completed" email from Apple (usually 10–40 min).

## Part D — TestFlight (~10 min once the email arrives)

1. App Store Connect → **Harbored** → **TestFlight** tab. The build should show as Ready.
2. Left sidebar → **Internal Testing** → **+** to create a group ("Team") → add yourself
   (your Apple ID email).
3. On your iPhone: install the **TestFlight** app from the App Store, sign in, accept
   the invite (email or automatic), and install Harbored.
   - This replaces the cable-installed dev build. No Xcode, no Developer Mode needed.
4. Tell Claude when you're on the TestFlight build → the server's push environment
   gets flipped to production (TestFlight builds use Apple's production push server;
   Claude runs that flip). Then log out/in once so your phone re-registers under the
   production environment.

## Part E — Kellan (later, optional)

External testers need Apple's Beta App Review once (~1 day) before the first build goes
out. TestFlight tab → External Testing → create group → add Kellan's email → submit the
build for review → he gets an install link. Good v1 moment: the app's first real user
who isn't you.

---

Reminder: prod deploy is still held. TestFlight builds bundle their own copy of the web
app (current main — all the good stuff), but the SERVER the app talks to is prod — so
scan/scoring quality on the daily cron stays old until the deploy ships.
