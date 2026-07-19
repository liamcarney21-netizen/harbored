# Tonight's Xcode session — push notifications + contacts picker

Goal: by the end of tonight, the Harbored iOS app can receive a real push
notification on your actual iPhone, and we've verified the native contacts
picker works. Everything code-side is already done — tonight is the
Apple-credential stuff only you can do.

Already done for you (don't repeat): the focused build is merged, pushed to
GitHub, and synced into the iOS project. Xcode will build the new version as-is.

If ANYTHING errors or looks different than described: stop, screenshot it,
and tell Claude. Don't guess.

---

## Part 1 — Open the project (2 min)

1. Open Terminal.
2. Type: `cd ~/harbored && npx cap open ios` and press Enter.
3. Xcode opens. Wait for the progress bar at the top center to finish
   ("Indexing" / "Resolving packages"). Can take a minute.

## Part 2 — Run it in the simulator (10 min)

1. At the top of the Xcode window, next to the word "App", there's a device
   dropdown. Click it and pick any iPhone simulator (e.g. "iPhone 16 Pro").
2. Press the ▶ (Play) button top-left, or Cmd+R.
3. First build takes a few minutes. The simulator window will appear.

**Check these four things:**
- [ ] Home screen icon is the brass anchor on navy (not a blue Capacitor logo)
- [ ] Launch screen is the anchor on navy
- [ ] App opens to Common Ground
- [ ] The menu has exactly: Common Ground, My Network, Weekly Digest, Settings
      (no Alerts/Messages/Analytics — we cut those today)

## Part 3 — Test the contacts picker (5 min) ← the big unverified item

1. In the app, open the menu and tap **Import Contacts**.
2. You should see a button that says **"Pick from your contacts"** (this only
   appears on the phone, never on the website — that's correct).
3. Tap it. iOS should show a system popup: "Harbored Would Like to Access
   Your Contacts". Tap **Allow Full Access** (or Allow).
4. The simulator comes with fake people built in (Kate Bell, Daniel Higgins,
   etc.). Select one or two → confirm.
5. The imported contacts should land in the import list, and after you finish,
   the theme composer should appear asking what connects you.

- [ ] Permission popup appeared
- [ ] Picker showed the fake contacts
- [ ] Import worked and the theme composer opened

## Part 4 — Turn on the Push capability (5 min)

1. In Xcode's left sidebar, click the very top item: the blue icon named **App**.
2. In the middle pane, under TARGETS, click **App**.
3. Click the **Signing & Capabilities** tab.
4. Confirm "Automatically manage signing" is checked and your Team is selected.
5. Look down the page for a section called **Push Notifications**.
   - If it's already there: done, go to Part 5.
   - If not: click **+ Capability** (top-left of that pane), type "push",
     double-click **Push Notifications**.
6. No red error text should appear. (A file called App.entitlements already
   exists in the project — that's expected, we added it last night.)

## Part 5 — Create the APNs key on Apple's website (10 min)

This key is what lets Harbored's server send notifications. Apple lets you
download it exactly ONCE — keep the file somewhere safe.

1. Go to **developer.apple.com** → Account → sign in.
2. Click **Certificates, Identifiers & Profiles** → **Keys** (left sidebar).
3. Click the blue **+** button.
4. Key name: `Harbored Push`
5. Check the box **Apple Push Notifications service (APNs)** → Continue → Register.
6. Click **Download**. A file like `AuthKey_AB12CD34EF.p8` lands in Downloads.
7. Write down the **Key ID** shown on that page (10 characters).
8. Get your **Team ID**: click "Membership details" (or your name, top right)
   — it's a 10-character code labeled Team ID. Write it down.

## Part 6 — Put the key into Vercel (10 min) — YOU do this part

(Claude doesn't handle credentials — this one's yours.)

1. Go to **vercel.com** → the **harbored** project → **Settings** →
   **Environment Variables**.
2. Add these five variables. For each: environment = **Production**.

   | Name | Value |
   |---|---|
   | `APNS_KEY` | Open the .p8 file with TextEdit, select ALL of it (including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines), copy, paste |
   | `APNS_KEY_ID` | the 10-character Key ID from Part 5 |
   | `APNS_TEAM_ID` | the 10-character Team ID from Part 5 |
   | `APNS_BUNDLE_ID` | `app.harbored` |
   | `APNS_ENV` | `development` |

   (`development` is correct for now — apps run from Xcode use Apple's sandbox
   push server. We flip it to `production` when we ship via TestFlight.)

## Part 7 — The real push test needs your actual iPhone (15 min)

Push tokens do NOT work in the simulator. Physical phone only.

1. Plug your iPhone into the Mac with a cable. If the phone asks
   "Trust This Computer?" → Trust.
2. In Xcode's device dropdown (same place as Part 2), pick your iPhone
   (listed at the top under "iOS Device").
3. Press ▶.
   - First time only, the phone may demand **Developer Mode**: on the phone,
     Settings → Privacy & Security → Developer Mode → turn on → restart phone,
     then press ▶ in Xcode again.
   - It may also ask you to trust yourself as a developer: on the phone,
     Settings → General → VPN & Device Management → tap your Apple ID → Trust.
4. The app opens on your phone. **Log in with your real account** —
   demo mode doesn't register for notifications, a signed-in user does.
5. iOS asks "Harbored Would Like to Send You Notifications" → **Allow**.
6. **Tell Claude you're done.** From here Claude can verify your phone's
   token landed in the database and fire a live test push at your phone
   while you watch.

## If there's time left — Part 8

App Store screenshots. The shot list is in `APPSTORE.md`. Simulator →
File → Save Screen (or Cmd+S) produces correctly-sized PNGs.

---

Not tonight (separate decision): deploying the newly-focused site to
harbored-three.vercel.app. The live site is still the exact build the Claude
Corps judges have. When you want the focused version live, it's one command:
`npx vercel --prod`.
