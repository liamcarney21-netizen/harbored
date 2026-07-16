# Harbored — iOS (Capacitor) Setup

Phase 2 of the native roadmap (see ROADMAP.md). Capacitor wraps the existing web
app in a native iOS shell. **The scaffolding is done and committed on branch
`phase2-capacitor`**; the steps below must run on a Mac with Xcode — they can't be
done from the agent environment.

## Already set up for you (committed)
- `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` installed
- `capacitor.config.json` — `appId: app.harbored`, `appName: Harbored`, `webDir: dist`,
  and CapacitorHttp enabled (native HTTP, so cross-origin API calls bypass CORS)
- npm scripts: `npm run cap:sync`, `npm run cap:ios`
- Service worker is skipped inside the native app (`src/main.jsx`)
- API calls use `src/lib/apiBase.js` → relative on web, absolute (prod) on native

## Prerequisites (one time)
1. **Full Xcode** — install from the Mac App Store (large, ~7 GB). **Command Line Tools alone
   is not enough** (that's what causes `xcodebuild requires Xcode` and `Platform not found`).
   After installing, open Xcode once to finish component setup, then point the toolchain at it:
   ```sh
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   xcodebuild -version   # should now print a version, not an error
   ```
2. **CocoaPods** — `brew install cocoapods` (or `sudo gem install cocoapods`). Verify: `pod --version`.
3. **Apple Developer account** — already enrolled. ✅

> **If you hit `Platform not found` on `cap sync ios`:** it means the iOS project didn't finish
> generating (usually because Xcode or CocoaPods was missing). After the two prereqs above are
> installed, re-run `npx cap sync ios`. If the `ios/` folder is in a broken half-state, reset it:
> `rm -rf ios && npx cap add ios`, then `npx cap sync ios`.

## Steps
Run all of these from the repo root (`~/harbored`):

```sh
# 1. Generate the native iOS project (creates ios/). One time.
npx cap add ios

# 2. Build the web app + copy it into the native project + install pods.
npm run cap:sync

# 3. Open the project in Xcode.
npx cap open ios
```

In Xcode:

4. Select the **App** target → **Signing & Capabilities** tab.
5. Set **Team** to your Apple Developer team. Xcode's automatic signing handles the
   provisioning profile.
6. Confirm **Bundle Identifier** is `app.harbored` (matches `capacitor.config.json`).
   **If you want a different bundle id, change it now** in both places — it's painful to
   change after an App Store submission. It must match the App ID you register at
   developer.apple.com.
7. Pick a simulator (e.g. iPhone 15) from the device dropdown and press **▶ Run** (⌘R).
   Harbored should launch and load.
8. To run on your own iPhone: plug it in, select it as the device, Run. The first time,
   trust the developer certificate on the phone under Settings → General → VPN & Device
   Management.

After any web change: `npm run cap:sync` (rebuilds `dist/` and copies it in), then Run again.

## ⚠️ Verify on-device (the part I couldn't test)
The native networking is set up but untested from the agent environment — check these on the
simulator/device:

- **API calls work.** Open the app, sign in, and confirm Common Ground loads data (that hits
  `/api/news` + `/api/score` on `harbored-three.vercel.app` via `apiBase.js` + CapacitorHttp).
  If calls fail, open Safari → Develop → [your device] → inspect the webview console.
- **Supabase auth/data works.** Sign-in and the stored-results read go through the Supabase
  client (already absolute URLs). CapacitorHttp intercepts all fetch — verify login still works.
- If anything networking-related misbehaves, the two levers are: (a) toggle
  `CapacitorHttp.enabled` in `capacitor.config.json`, or (b) add CORS headers to the
  `api/*.js` functions for the `capacitor://localhost` origin.

## App icon
The PWA icons in `public/` (`icon-512.png`, etc.) can be reused. In Xcode, drop a 1024×1024
into the App target's **Assets → AppIcon**. Capacitor also has `@capacitor/assets` to generate
the full icon set from one source image if you'd rather automate it.

## Prod env reminder
The native app talks to the **production** API + Supabase. Before it works end-to-end, prod
must have the same env the web app uses (`ANTHROPIC_API_KEY`, `VITE_SUPABASE_*`) — already set.
The Phase-1 cron vars (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`) are
server-only and unrelated to the native app.
