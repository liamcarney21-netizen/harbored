# Harbored — Push Notifications (APNs) Setup

Phase 3 of the native roadmap. The whole push pipeline is **built and committed** on
`phase3-push` and verified in preview mode:

- **Notified-tracking** — scans/digest/push only alert on genuinely new opportunities
- **Device-token capture** — the app stores each device's APNs token in Supabase after login
- **Send service** (`server/pushHandler.js`, `api/push.js`) — finds new opportunities, targets
  users' devices, builds the notification, sends via APNs, marks them notified

The only thing left is the parts that need **your** Apple Developer account. This guide is those
parts, in order. None of it can be done or verified from the agent side.

---

## Part A — Create an APNs auth key (`.p8`)
This is the credential that lets the server send to Apple's push service.

1. Go to **developer.apple.com** → **Account** → **Certificates, Identifiers & Profiles**.
2. Left sidebar → **Keys** → the **＋** button (Create a key).
3. Name it `Harbored APNs`. Check **Apple Push Notifications service (APNs)**. **Continue → Register**.
4. **Download** the `.p8` file. ⚠️ **You can only download it once** — save it somewhere safe.
5. Note these three values (all 10 characters):
   - **Key ID** — shown on the key's page after creation
   - **Team ID** — top-right of the Apple Developer account (Membership details)
   - The key file itself (`AuthKey_XXXXXXXXXX.p8`)

## Part B — Enable Push on your App ID
1. Same site → **Identifiers** → find the identifier for **`app.harbored`** (created when you first
   set signing in Xcode; if it's not there, create it: ＋ → App IDs → App, Bundle ID `app.harbored`).
2. Edit it → check **Push Notifications** under Capabilities → **Save**.

## Part C — Add the capability in Xcode + rebuild
1. `cd ~/harbored && npm run cap:sync && npx cap open ios`
2. In Xcode: **App** target → **Signing & Capabilities** → **＋ Capability** → **Push Notifications**.
   (This adds the entitlement to the app.)
3. Run on your **real iPhone** (push doesn't deliver to the simulator). On launch + login, the app
   asks for notification permission and stores the device token in Supabase.
4. Confirm the token landed: Supabase → Table Editor → `device_tokens` should have a row for your user.

## Part D — Configure the server env vars
The send service flips from preview to live once these are set. Five values:

| Var | Value |
|---|---|
| `APNS_KEY` | the `.p8` file contents (or base64 of it — see below) |
| `APNS_KEY_ID` | the 10-char Key ID from Part A |
| `APNS_TEAM_ID` | your 10-char Team ID |
| `APNS_BUNDLE_ID` | `app.harbored` |
| `APNS_ENV` | `production` (use `sandbox` only for a dev-build device token) |

**The `.p8` is multi-line.** Two easy options:
- **Vercel** (prod): paste the whole file contents (including the `-----BEGIN/END PRIVATE KEY-----`
  lines) straight into the `APNS_KEY` value box — the UI accepts multi-line.
- **`.env.local`** (local test): base64 it into one line —
  ```sh
  echo "APNS_KEY=$(base64 -i ~/Downloads/AuthKey_XXXXXXXXXX.p8)" >> .env.local
  ```
  The handler auto-detects base64 vs raw PEM, so either works.

## Part E — Test end-to-end
With a real device token stored (Part C) and the env vars set (Part D):

```sh
# local: fire the send for real
SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)
curl -H "Authorization: Bearer $SECRET" http://localhost:5178/api/push
```

- A push should arrive on your phone: *"Reach out to [name]"* with the headline.
- The response shows `devicesPushed: 1` and those opportunities get marked notified (won't re-send).
- APNs errors (bad token, wrong env, wrong topic) come back per-device in the function logs with the
  APNs status — the usual culprits are `APNS_ENV` mismatch (sandbox token vs production host) or
  `APNS_BUNDLE_ID` not matching the app.

## Part F — Decide scheduling (push vs digest)
Push and the weekly digest **both** consume "new above-bar opportunities" and mark them notified —
so whichever runs first wins, and running both double-handles the same pool. Decide ownership:

- **Recommended:** push is the primary, timely channel (fires daily right after the scan); the weekly
  digest becomes a low-frequency recap or is dropped.
- Wire it via a cron in `vercel.json`. **Note the Vercel Hobby plan caps at 2 cron jobs** — you
  currently have `scan` + `digest`. To add `push` you'll either drop `digest`, fold push into the end
  of the scan run, or move to Vercel Pro.

---

## What's already done (no action needed)
- Migrations `0001`–`0003` applied in Supabase (scan_results, notified-tracking, device_tokens)
- Client registration wired into login; `@capacitor/push-notifications` in the iOS project
- Send service built + preview-verified (targeting, payloads, marking all correct)
