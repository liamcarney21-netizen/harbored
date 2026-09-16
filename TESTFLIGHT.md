# TestFlight run sheet (~45 min of your time, most of it waiting)

What this is, in one line: Xcode zips the app up and sends it to Apple; Apple
processes it; TestFlight (Apple's beta app) installs it on your iPhone like a
real App Store app. That's it — no cables, no Developer Mode.

Prep already done for you: iPhone-only target, encryption-exemption key (no
compliance questionnaire per upload), version 1.0 (build 1), icon/splash,
privacy + support pages, paste-ready listing copy in APP_STORE_SUBMISSION.md,
five screenshot drafts in appstore-screenshots/.

If anything looks different than described: stop and tell Claude.

---

## Step 1 — Create the app record (~10 min, in your browser)

1. Go to **appstoreconnect.apple.com** → sign in with your Apple ID →
   **My Apps** → blue **+** → **New App**.
2. Fill in:
   - Platform: **iOS**
   - Name: **Harbored**
   - Primary language: **English (U.S.)**
   - Bundle ID: pick **app.harbored** from the dropdown (already registered)
   - SKU: `harbored-001` (internal only, never shown to anyone)
   - User access: Full Access
3. Create. Don't fill in the listing yet — TestFlight doesn't need it.

## Step 2 — Archive & upload (~15 min, in Xcode)

1. Open the project: `~/harbored/ios/App/App.xcodeproj` (or ask Claude to open it).
2. Top of the Xcode window, the device dropdown (next to "App") → scroll to the
   top → **Any iOS Device (arm64)**. (You can't archive to a simulator.)
3. Menu bar: **Product → Archive**. Takes a few minutes; when it finishes, the
   **Organizer** window opens with your archive selected.
4. Click **Distribute App** → choose **TestFlight & App Store** (or
   "App Store Connect" — naming varies by Xcode version) → **Upload** →
   accept all defaults → Upload.
5. Walk away. Apple emails you "processing completed" in 10–40 min.

## Step 3 — Install on your phone (~10 min once the email arrives)

1. App Store Connect → **Harbored** → **TestFlight** tab. The build shows as Ready.
2. Left sidebar → **Internal Testing** → **+** to create a group ("Team") →
   add yourself (your Apple ID email).
3. On your iPhone: install the **TestFlight** app from the App Store, sign in,
   accept the invite, install Harbored.
4. Tell Claude you're on the TestFlight build → the server's push environment
   gets flipped to production (Claude runs that flip). Then log out/in once in
   the app so your phone re-registers for push.

## Later, optional — Kellan

External testers need Apple's Beta App Review once (~1 day). TestFlight tab →
External Testing → create group → add Kellan's email → submit the build for
review → he gets an install link. Good v1 moment.

---

Already handled, not your problem: screenshots (five 6.9" drafts committed in
appstore-screenshots/ — optionally retaken later from your signed-in account),
listing copy (APP_STORE_SUBMISSION.md), prod web deploy (live), reviewer access
(the login screen's "Try a live demo" button).
