# Gmail job-change signal — groundwork (start the slow clock)

The next signal source: parse LinkedIn's own notification emails ("X started a new
position at Y", "Congratulate X on their work anniversary") from the user's Gmail. This is
LinkedIn-quality career data with zero scraping — you read mail the user already receives,
via Google's official API. It's the #1 signal for the early-career user (knowing when
someone in their network lands somewhere).

The code is the easy part and plugs into the pipeline as just another provider (emit
scan_results rows, same as the birthday provider). The long pole is Google's verification,
which takes weeks — so start it now, in parallel with everything else.

## What only you can do (in order)

1. **Google Cloud project** — console.cloud.google.com → create a project "Harbored".
2. **Enable the Gmail API** — APIs & Services → Library → search "Gmail API" → Enable.
3. **OAuth consent screen** — APIs & Services → OAuth consent screen:
   - User type: External.
   - App name Harbored, support email = harboredsupport@gmail.com, logo = the anchor.
   - App domain / privacy policy URL: https://harbored-three.vercel.app/privacy
   - Add yourself as a Test user (lets you build/test before verification is done).
4. **Request the scope** `https://www.googleapis.com/auth/gmail.readonly`.
   - This is a **restricted scope**, which triggers Google's security review before the app
     can serve users beyond test users. That review is the weeks-long part — expect a
     questionnaire, a demo video, and possibly a CASA security assessment. Starting it now
     is the whole point of this doc.
5. **OAuth client ID** — Credentials → Create credentials → OAuth client ID. For the native
   app you'll want an iOS client (bundle id app.harbored) and/or a Web client for the
   server-side token exchange. Tell Claude which and it'll wire the flow.

## What Claude builds once you're a test user (before full verification)

- The "Connect Gmail" flow (OAuth, token stored per user).
- A server provider that queries Gmail for LinkedIn notification emails
  (`from:linkedin.com` job-change subjects), parses out {person, new company, event}, and
  emits scan_results rows — which then inherit the existing relevance-gate, dedup, push, and
  digest automatically.

You can develop and test the whole thing against your own account as a "test user" while
Google's verification runs. Verification only gates letting *other* users connect Gmail.

## Note

Only catches events LinkedIn emails the user about (as good as their connection to that
person). It's a strong source, not a complete one — which is exactly why the architecture is
multi-source. See the signal-pipeline diagram from 2026-07-20.
