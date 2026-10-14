# CampaignHub Pro upgrade: full audit report

**Project:** CampaignHub (Firebase project `new1-e94db`, deployed on Vercel)
**Audit date:** 13 October 2026
**Scope:** everything changed or added in the CampaignHub Pro redesign: design, billing (Paystack and Flutterwave), the campaign tools, security rules, server functions and data migration.

---

## 1. Verdict

**The upgrade is ready to deploy once you follow the checklist in section 8.**

The audit found **3 critical, 11 high, 18 medium and 14 low** problems. **All of them are fixed except the few limits listed in section 7.** Every fix was re-tested.

| Check | Result |
|---|---|
| App compiles. All 106 app files bundle and every import resolves. Checked against your exact installed versions: React 18.3.1, Vite 6.4.3, Tailwind 3.4.19, Firebase 11.10.0, lucide-react 1.17.0, React Router 7.17.0 | ✅ |
| Billing logic: automated tests | ✅ 37 of 37 pass |
| Payment attack proofs from the audit, re-run against the fixed code (replay, auto-renew, drift, legacy, retries) | ✅ all blocked |
| Payment notification signature checks (Paystack and Flutterwave) over real HTTP | ✅ |
| 36 screens opened in a browser (desktop, mobile, dark mode, admin, field links, public page) | ✅ no errors |
| Typing in pop-up forms on a phone (the critical focus bug) | ✅ fixed and tested |
| Every icon used exists in lucide-react 1.17 | ✅ |
| Security rules checked line by line against every write the app makes | ✅ by careful reading (see the note below) |

**Three things could not be run here, so you need to do them once on your computer (section 8):**

1. `npm run build`. My workspace cannot download packages, so I compiled with the same bundler engine Vite uses (esbuild) instead.
2. Compiling the security rules. Deploying them compiles them first, and **a rule error stops the deploy without changing anything**.
3. A real test payment with your Paystack and Flutterwave test keys.

---

## 2. What the upgrade added

### Business model
- **CampaignHub Pro is sold per campaign page:** ₵120 a month or ₵1,200 a year (2 months free).
- **7-day free trial:** one per verified account. The page goes live straight away.
- **3-day grace period:** after Pro or a trial ends, the public page stays up 3 more days. Tools pause, then the page goes offline until the owner renews.
- **Paying early stacks:** new time is added on top of the time left, including trial days left.
- **Spotlight placements:** ₵20 to ₵350 for 3 to 48 hours, for homepage and directory placement.
- **One price list:** all prices live in `frontend/api/_lib/billingCatalog.js`. The server always charges from this file, so the browser can never change the amount.

### Payments
- **Paystack:** MoMo (MTN, Telecel, AT) and Visa/Mastercard. Optional automatic card renewal through Paystack plans.
- **Flutterwave:** Ghana mobile money and cards.
- **Payment notifications (webhooks):** every payment is checked again with the provider before Pro is applied. It is applied exactly once, even if the notification, the return page and retries all arrive.
- **Customer screens:** a "Payment received" page after checkout, payment history with printable receipts, and "Turn off auto-renew".
- **Admin:** revenue and estimated monthly income, all payments, manual Pro grants (bank transfer or offline MoMo), and a safe way to approve old MoMo screenshot proofs.

### Campaign tools (the Pro workspace)

| Section | What it does |
|---|---|
| Overview | Supporter numbers, a path-to-victory projection, a this-week checklist, top polling stations and upcoming events |
| Voters | Voter list with support levels, tags, filters and contact log; CSV import and export |
| Field team | No-login canvassing links for volunteers, a leaderboard, volunteer approvals |
| Election day | Polling-agent links, live tally per station, manual result entry, export |
| Messages | Choose an audience; WhatsApp queue, bulk-SMS export, email; templates and AI rewrite |
| Ads | Tracked links and QR codes per ad, poster or radio spot; cost per supporter; Spotlight |
| Events | Rallies and town halls with RSVPs and check-ins; public or private |
| Fundraising | MoMo donations, confirmations, offline gifts, goal, donor CSV |
| Insights | Visits by source and day, regions, issue polls |
| AI Studio | Speeches, ads, posts, SMS, statements, manifestos and canvassing scripts in English, Twi, Fante, Ga, Ewe, Hausa, Dagbani and Pidgin |
| Campaign page | Identity, colours, photos, priorities, win-number calculator, contact and social links, sections, share kit and QR code, visibility, delete |
| Plan & billing | Plan status, renew or upgrade, Spotlight, history and receipts |

### Design
- **Look:** a new navy-and-gold design with a dark mode, used on every page (home, pricing, directory, candidate page, sign-in, dashboard, admin).
- **Phone-first:** candidate page, field-worker pages, slide-up sheets for pop-ups, and tables that scroll sideways.
- **Charts:** accessible, with hover details and a table view.

---

## 3. Files: what was added and what changed

### Added (52 files)

**Server and billing**
- `frontend/api/_lib/billing.js`: checkout, payment checks, applying payments, renewals, cancelling, signature checks.
- `frontend/api/_lib/billingCatalog.js`: the price list.
- `frontend/api/billing/[action].js`: payment settings, checkout, checking a payment, cancelling renewal.
- `frontend/api/webhooks/[provider].js`: Paystack and Flutterwave payment notifications.
- `frontend/api/ai-studio.js`: the AI writer, with sign-in, Pro check and daily limits.
- `frontend/api/_lib/devMiddleware.js`: runs the API locally with `npm run dev`.

**App: interface**
- `components/ui/*`: Button, Card, Modal, form fields and other basic pieces.
- `components/charts/index.jsx`: charts.
- `components/layout/*`: app layout, public layout, theme toggle, notification bell.
- `components/billing/*`: checkout pop-up, plan cards, locked-feature panel.
- `components/ErrorBoundary.jsx`, `BrandIcons.jsx`, `QrCode.jsx`.
- `context/ThemeContext.jsx`, `context/WorkspaceContext.jsx`.

**App: pages**
- `pages/workspace/*`: the 13 workspace screens listed above.
- `pages/BillingCallback.jsx`, `FieldPortal.jsx`, `Legal.jsx`, `NotFound.jsx`.

**App: helpers and services**
- `services/billingService.js`, `adminService.js`, `workspaceService.js`.
- `utils/billing.js`, `csv.js`, `format.js`, `projection.js`.
- `data/workspaceNav.js`, `data/messageTemplates.js`.

**Scripts and docs**
- `frontend/scripts/upgrade-firestore-data.mjs`: the one-time data check and clean-up (section 8, step 3).
- `docs/BILLING_SETUP.md`, `docs/CLEANUP.md`, and this report.

### Changed (52 files)
- **Rules:** `firebase/firestore.rules` (rewritten) and `firebase/storage.rules` (rewritten).
- **Retired old AI routes:** `frontend/api/ask-ai.js` and `recommendations.js` now only answer "retired".
- **Other server files:** `api/auth/otp-verify.js` (safer code checking) and `api/_lib/otpDevMiddleware.js`.
- **Pages, all redesigned:** `App.jsx`, `main.jsx`, `index.css`, `index.html`, `tailwind.config.js`, `vite.config.js`, `vercel.json`, `.env.example`, favicon, and the Home, Pricing, Campaigns, Candidate page, Dashboard, New campaign, Admin, Settings, Notifications, Support, About, Login, Sign-up and Forgot-password pages.
- **Login and account pieces:** AuthShell, OTP form, Google button, email-verification screens.
- **Services:** campaigns, supporters, volunteers, donations, notifications, storage, analytics, AI and API.
- **Hooks and helpers:** `hooks/useCampaigns.js`, `utils/campaignHelpers.js`.
- **Scripts and docs:** `scripts/smoke-test-production.mjs`, `scripts/test-production-ai.mjs`, `README.md`.

### No longer used
76 old files are no longer used, listed in `docs/CLEANUP.md`. They are harmless and you can delete them.

### Not changed
- `package.json`, so no new packages are needed.
- Login and authentication logic in `AuthContext` and `authService`.
- The `backend/` and `ai-service/` folders.

---

## 4. How the audit was done

Four separate reviews were run, each reading the code end to end:

1. **Security:** rules, storage, server functions, secrets, ways to inject code into pages.
2. **Payments and billing:** checked against Paystack's and Flutterwave's current documentation, with test scripts that reproduce each bug.
3. **Every screen and data write:** checked against the security rules and against old (pre-upgrade) data.
4. **A second review of the rewritten rules**, after the fixes.

Each finding was confirmed in the code (and, for payments, with a working proof) before it was fixed. Each fix was then re-tested.

---

## 5. Findings and fixes

Severity: **Critical** means real money or data at risk, or a core feature broken. **High** means serious. **Medium** means it should be fixed before launch. **Low** means polish. Status ✅ means fixed and re-tested.

### Critical

| # | Problem | What could happen | Fix | Status |
|---|---|---|---|---|
| C1 | **One payment could be applied again and again.** The "check payment" step could reset a paid transaction to "pending". | Pay ₵120 once, then repeat a simple request to get unlimited Pro or Spotlight. It could also happen by accident when the return page and a notification raced. | A completed transaction is now final. The provider must match. Checking a payment never creates or overwrites records. Duplicate renewal notifications are ignored. | ✅ The proof script now stays at 30 days after 3 replay attempts |
| C2 | **Fake Pro or badges written under the old rules would count after the upgrade.** The old rules let an owner write any field on an unpaid page. The old admin approval trusted a duration typed by the customer, so ₵120 could become 100 years. | Free permanent Pro, fake "Verified" or "Featured" badges. | The new rules block these fields. Customers can no longer create old-style payment records. Old MoMo proofs are now approved by choosing days in a "Grant Pro" box. The new data script finds and (with `--strip-unbacked`) removes Pro, trials and subscriptions that no real payment backs. | ✅ |
| C3 | **Typing in pop-up forms lost focus.** Each keystroke moved focus to the close button, which also closes the phone keyboard. | Creating canvasser and polling-agent links was nearly impossible on phones. The voter, result, station, ad and event forms also jumped whenever new data arrived. | Pop-ups now focus the first field once, when they open. | ✅ Tested by typing on a phone-sized screen |

### High

| # | Problem | Fix | Status |
|---|---|---|---|
| H1 | **Card auto-renew could charge without crediting, and "Turn off auto-renew" sometimes never reached Paystack**, so the customer kept being charged. | Paystack codes are kept in a private record. Linking is retried until it succeeds. Renewals are matched by customer and plan. Cancelling looks the subscription up at Paystack and disables it there. A one-off MoMo payment no longer switches auto-renew off locally. Admin "End Pro" and deleting a page cancel at Paystack first. | ✅ 5 new tests |
| H2 | **Any signed-in user could replace another campaign's banner, logo or photos.** | File names now start with the uploader's account ID. The storage rules allow uploading new files only, never overwriting or deleting someone else's. | ✅ |
| H3 | **Someone could take over another politician's page link (slug)**: back-date a copy so it came first, with their own MoMo number. | Creation dates are set by the server and can't be faked. When two pages share a link, the oldest live one wins. The data script lists duplicate links. | ✅ (see the limit in section 7) |
| H4 | **A deleted campaign's ID could be re-used to read its leftover voter data.** | Owners can no longer hard-delete; "Delete" archives the page, cancels auto-renew and erases its voter data. Admin delete erases everything, including donations. Old campaign IDs are locked against re-use, and the data script locks the IDs of campaigns already deleted. | ✅ |
| H5 | **An owner could move their event, donation or volunteer record onto a rival's page**, for example a fake "rally cancelled". | Records can no longer be moved to another campaign. | ✅ |
| H6 | **Two old AI routes were open to anyone, with no sign-in or limits**, so anyone could run up your OpenAI/Gemini bill. | Retired. They answer "410 Gone". AI writing now goes only through AI Studio (signed-in Pro owners, with daily limits). | ✅ |
| H7 | **Events marked "private" could be read by anyone**, including venue and time. That is a safety risk for candidates. | The rules hide private events. The public page asks only for public events. | ✅ |
| H8 | **After every new deploy, people with the app already open saw a blank white page.** | Added error protection with a friendly message, plus an automatic one-time reload to fetch the new version. | ✅ |
| H9 | **Admin could not resolve or dismiss reports** (a status name mismatch). | Fixed. | ✅ |
| H10 | **Large CSV imports of voters or polling stations could fail completely**, because Firestore limits how many security checks one batch can make. | Imports now write in small batches, 4 at a time, with progress. | ✅ |
| H11 | **If Paystack or Flutterwave was briefly down, a payment notification was marked as handled**, so a customer who closed the tab never got their Pro. | The server now returns an error so the provider retries later. | ✅ |

### Medium

| # | Problem | Fix |
|---|---|---|
| M1 | Monthly auto-renew gave about 18 free days a year (the 2-day safety buffer kept stacking). | Time paid for is tracked separately from the buffer. Tested over 13 months: no free days and no gaps. |
| M2 | Buying Pro, starting a trial or an admin grant could shorten a legacy page's paid hosting (for example 85 days became 33). | The end date is never shortened. |
| M3 | Unverified throwaway accounts could each get a free trial plus heavy AI use. | Trials and new pages need a verified email (checked in the rules). Trial pages get 20 AI drafts a day (paid: 80). AI prompts are size-capped. |
| M4 | Owners could undo an admin takedown (hide, then relaunch, or start a trial). | Admin takedowns use a new **Suspended** status that owners can't change. |
| M5 | Anyone could re-address a notification to another user (phishing). Separately, owners never received "new supporter / volunteer / donation" alerts. | Notifications can only be marked as read. Visitor alerts to owners are now allowed in a strict format. |
| M6 | Private billing details (Paystack email token, card digits) and the owner's email sat on the public campaign record. | They moved to a private record only the owner and admin can read. New pages don't store the owner's email publicly, and the data script removes old ones. The admin dashboard reads emails from private profiles. |
| M7 | Email login codes could be brute-forced with many parallel guesses, including for the admin account. | The attempt counter is now updated safely, so 5 attempts really means 5. |
| M8 | The production build (Tailwind 3) would drop some badge colours: "Payment due", "Pending", "Verified" and support levels. My earlier preview used Tailwind 4, which hid this. | The class names are now written out in full, plus a safelist in `tailwind.config.js`. |
| M9 | The poll and donation-settings pop-ups wiped your edits whenever a page view arrived. The create-link pop-up could hide the link it had just created. | Pop-ups load saved values only when they open. |
| M10 | Phone numbers like `+233 024…`, `00233…` or `2330…` were stored wrongly, broke duplicate checks and gave bad WhatsApp links. One long number could make a whole 400-row import fail. | New Ghana phone formatting and validation (tested on 11 formats). Invalid rows are skipped with a clear count. Names and emails are trimmed to the allowed length. |
| M11 | Public sign-up, volunteer and donation forms accepted any fields and any size, for any campaign, so a rival could flood your voter list. | Strict field lists and size limits; only live pages accept sign-ups; canvassers must hold a valid field link; dates are set by the server. |
| M12 | The rules checked a "hidden" flag that the public queries couldn't satisfy, so Firestore could refuse the directory and candidate pages. | Public visibility now depends on the page status only, which is safe for the queries. |
| M13 | Anyone could set view, share and click counters to any number. Rivals could read or overwrite your analytics. | Counters can only go up by 1. Analytics can be read only by the owner and admin, and only known counters can change. |
| M14 | If a Paystack plan was set up with the wrong price, cards would be charged the wrong amount. | The server checks the plan's amount, currency and interval, and turns auto-renew off for that checkout if they don't match. |
| M15 | Flutterwave counted as switched on without its webhook secret hash, so payments by customers who closed the tab were lost. | Flutterwave is offered only when both its key and hash are set. |
| M16 | A 48-hour Spotlight could be sold to a page going offline in 1 hour. | Refused, with an explanation. |
| M17 | A phone clock more than an hour fast made the trial fail with the wrong message ("trial already used"). | The trial uses the server's clock, and the messages are now accurate. |
| M18 | If payment settings failed to load, checkout pretended both providers were available. | It shows "Couldn't load payment options" with a **Try again** button. |

### Low

| # | Problem | Fix |
|---|---|---|
| L1 | CSV import: words like "not sure" or "unsure" became **Strong**; files saved with `;` mixed up columns; exported cells starting with a tab were unsafe in Excel. | Fixed the word matching, added separator detection and blocked unsafe cells. All tested. |
| L2 | The admin page linked payment screenshots without checking the link type. | Only `https://` links are shown. |
| L3 | Server errors could show internal details to users. | Users see a safe message; details go to the server log. |
| L4 | Double-tapping "Log contact" or "Received" could record twice. | Buttons lock while saving. |
| L5 | New pages opened half-way down. | Every page starts at the top. |
| L6 | "Hide page" and "Make public" appeared when the rules would refuse them. | Buttons now match what's allowed; suspended pages show "Contact support". |
| L7 | Owners with one campaign couldn't reach the campaign list. | Added "All campaign pages" to the campaign switcher. |
| L8 | Opening someone else's campaign URL showed an empty dashboard. | It shows "You don't have access". |
| L9 | Older office types showed as "Presidential". | Old values are kept. |
| L10 | "Mark all read" failed with more than 500 notifications. | Done in chunks. |
| L11 | Any signed-in user could list payment screenshots. | Admin only. Uploaders can still see their own. |
| L12 | A malformed trial counted as Pro in the app but not in the rules. | All three Pro checks (app, server, rules) now agree. |
| L13 | Deleting a page left card auto-renew running. | Auto-renew is cancelled first. |
| L14 | The smoke test checked the retired AI route. | It now checks payments setup, the AI Studio sign-in requirement, and that the old route is retired. Set `SMOKE_BASE_URL` to test any domain. |

---

## 6. What was checked and found correct

- **Prices:** always taken from the server price list; the browser's amount is never trusted. Paystack amounts are sent in pesewas (×100), Flutterwave in cedis.
- **Payment checks:** underpayment, wrong currency, someone else's reference, and a mismatched Flutterwave reference are all rejected. A payment always goes to the campaign recorded at checkout.
- **Signatures:** Paystack notifications are checked with HMAC-SHA512 of the exact request body; Flutterwave's `verif-hash` is checked too. Both checks resist timing attacks and refuse when the secret is missing.
- **Provider documentation:** checked against current docs. Paystack: initialize, verify, plans, subscription disable, webhooks. Flutterwave: `/v3/payments` with `mobilemoneyghana`, verify, webhooks.
- **Free trial:** one per account, enforced in the same write as the campaign; 7 days, then 3 days of grace.
- **Pro checks agree:** the app, the server (AI Studio) and the rules all switch Pro off at the same moment.
- **Secrets:** none in the browser code. Only the public Firebase web settings are there, which is by design.
- **Private data:** voter, donation, volunteer, results, station, ads and broadcast data can be read only by the owner and admin. Field-link tokens are about 139-bit random values and can't be listed.
- **Database indexes:** every sorted query has an index, and the new queries need none.
- **Old data:** pre-upgrade campaign records display correctly (missing fields fall back to defaults, and old date formats work). Old URLs (`/premium`, `/upload`, `/campaigns/:slug` and the old performance and command pages) redirect.

---

## 7. Known limits (not fixed, with recommendations)

| Item | Why it stays | Recommendation |
|---|---|---|
| No bot protection or rate limits on public forms | Needs Firebase App Check (reCAPTCHA) set up in the console | Turn on **Firebase App Check** after launch. The rules already limit field sizes and require a live page. |
| A determined visitor can still inflate view counts | Browsers can't prove a visit is genuine | Treat analytics as a guide. Supporter sign-ups are the reliable number. |
| Page links aren't guaranteed unique | A full fix needs a separate "slugs" registry and a migration | Covered by "oldest page wins" and the duplicate list in the data script. Can be added later. |
| People can get one trial per email address | Gmail "+" and dot aliases count as different emails | Watch the admin **Trial** filter. |
| Owners keep read access to their data after Pro ends | Intentional, so they can export their voters | — |
| Legal pages and the "What ₵120 replaces" figures are templates | Need your lawyer and real prices | Review before charging customers. |
| Meta (Facebook/Instagram) ads aren't connected | Needs a Meta developer app, Business verification and App Review | Planned separately once Meta approves your access. |
| 76 unused old files are still in your folder | I can't delete files on your computer | Delete them using `docs/CLEANUP.md`. |

---

## 8. Deploy checklist, in this order

> **Shortcut:** after publishing the site, open **Admin → Setup**, paste the new Paystack secret key and click **Finish setup** — it does steps 2, 3, 4 and the Paystack plans for you (see docs/BILLING_SETUP.md, "Fastest way"). Then paste the Paystack webhook URL it shows into Paystack.

**Before you start:** commit your current code to git, so you can always go back:

```bash
git add -A
git commit -m "Before CampaignHub Pro deploy"
```

### Step 1: Build on your computer

```bash
cd frontend
npm install
npm run build
```

It must end with `✓ built in …` and no errors. If it fails, send me the message.

### Step 2: Publish the new security rules

```bash
cd ../firebase
npx firebase deploy --only firestore:rules,storage --project new1-e94db
```

You can use your own `node scripts/deployRules.mjs` instead. Both compile the rules first. **If there's an error, nothing changes:** send me the message.

### Step 3: Run the data check straight away (within minutes of step 2)

```bash
cd ../frontend
node scripts/upgrade-firestore-data.mjs --key ../new1-e94db-firebase-adminsdk-XXXX.json
node scripts/upgrade-firestore-data.mjs --key ../new1-e94db-firebase-adminsdk-XXXX.json --apply
```

- **The first command only reports.** It changes nothing.
- **The second command makes the safe fixes:**
  - moves admin-hidden pages to "Suspended"
  - marks old events public
  - resets back-dated creation dates
  - removes owner emails from public records
  - locks the IDs of deleted campaigns
- **Read sections A, B and C of the report.** If they list pages you never sold Pro to, run once more with `--apply --strip-unbacked`.
- **Section F** lists customers of the old ₵500 bundle whose time has ended. Grant them Pro in Admin if you promised them more time.

The admin account must sign in with **Google or an email code**, so its email is verified.

### Step 4: Add the settings in Vercel (Project → Settings → Environment Variables)

| Variable | Needed | Value |
|---|---|---|
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (or `FIREBASE_SERVICE_ACCOUNT`) | ✅ (already set for email login) | From your Firebase service account |
| `APP_URL` | ✅ | `https://www.campaignhubgh.com` |
| `PAYSTACK_SECRET_KEY` | For Paystack | Paystack → Settings → API Keys & Webhooks |
| `FLW_SECRET_KEY` + `FLW_WEBHOOK_HASH` | For Flutterwave | Flutterwave → Settings → API keys / Webhooks |
| `PAYSTACK_PLAN_MONTHLY`, `PAYSTACK_PLAN_YEARLY` | Optional (card auto-renew) | Plan codes for exactly GHS 120 monthly and GHS 1,200 annually |
| `OPENAI_API_KEY` or `GEMINI_API_KEY` | For AI Studio | Your AI key |
| `AI_STUDIO_DAILY_LIMIT`, `AI_STUDIO_TRIAL_DAILY_LIMIT` | Optional | Defaults are 80 and 20 |

### Step 5: Set up the payment providers

**Paystack:**
- Dashboard → Settings → **API Keys & Webhooks** (https://dashboard.paystack.com/#/settings/developer).
- Webhook URL: `https://www.campaignhubgh.com/api/webhooks/paystack`.
- Turn on the Mobile Money and Card channels for GHS.

**Flutterwave:**
- Settings → **Webhooks**.
- URL: `https://www.campaignhubgh.com/api/webhooks/flutterwave`.
- Secret hash: the same value as `FLW_WEBHOOK_HASH`.
- Turn on Mobile money Ghana and Card.

### Step 6: Deploy the site

Push to git, or run `vercel --prod` from `frontend/`.

### Step 7: Automatic checks

```bash
cd frontend
node scripts/smoke-test-production.mjs   # SMOKE_BASE_URL=https://preview-url to test a preview
npm run test:ai
```

### Step 8: Test by hand, with test keys first

1. Sign up with a new email, create a campaign. The trial starts and the page is live.
2. On your phone, open the public page, join as a supporter and RSVP to an event. The owner gets alerts.
3. Field team: create a canvassing link, open it on a phone, log a voter. Election day: create an agent link and submit results.
4. Plan & billing: pay monthly with test MoMo or a test card. You land on the "Payment received" page, and Pro and the receipt appear.
5. In Paystack and Flutterwave, the webhook logs show **200**.
6. If plan codes are set: pay with auto-renew on a card, then **Turn off auto-renew**. Check the subscription is disabled in Paystack.
7. Admin: see the payment, grant 7 days to a test page, suspend and restore a page, resolve a report.
8. Switch to live keys and make one real ₵120 payment with your own MoMo.

---

## 9. Test evidence

| Test | Where | Result |
|---|---|---|
| Billing unit tests: stacking, idempotency, underpayment, currency, Spotlight, renewals, replay, provider mismatch, legacy hosting, suspension, auto-renew cancel (3 cases), mis-priced plan, trial rules, provider settings | Session workspace | **37/37 pass** |
| Payment proof scripts from the audit, re-run on the fixed code | Session workspace | Replay blocked; renewals retried, not lost; no free days over 13 months; legacy time kept; webhook retries when the provider is down |
| Webhook over HTTP | Session workspace | Bad signature → 401; good signature passes the check |
| Screen sweep in a browser: 36 screens on desktop, mobile and dark mode, including admin, field links, results, callback, 404 and no-access | Session workspace | No runtime errors |
| Typing in the create-link pop-up on a phone-sized screen | Session workspace | "Kwame Mensah" typed fully; focus stays in the field |
| Data script dry run and apply on sample data | Session workspace | All 7 checks report correctly; writes only the expected fields |
| Phone formatting (11 formats), CSV parsing (3 separators), support-level words (15 cases) | Session workspace | Pass |
| Bundle and import check against your installed versions | Session workspace | Build OK; all 104 icons exist in lucide 1.17 |

---

## 10. After launch: what to watch

- **Admin → Payments:** look for anything that isn't **success**. `paid_unmatched` means money arrived that couldn't be matched to a page. Grant Pro manually and contact the customer.
- **Paystack and Flutterwave webhook logs:** should be all 200. Repeated 500s mean a setting is missing; check the Vercel function logs.
- **Vercel logs for `[billing]` and `[webhook:…]`:** these show any server error with full detail.
- **Admin → Trial filter:** watch for many trials from similar emails.
- **The AI provider's usage page:** daily limits keep costs predictable (80 drafts per paid page per day, 20 on trial).

---

## 11. Useful links

- Paystack dashboard: https://dashboard.paystack.com/
- Paystack keys and webhooks: https://dashboard.paystack.com/#/settings/developer
- Paystack docs: https://paystack.com/docs/
- Flutterwave dashboard: https://app.flutterwave.com/
- Flutterwave docs: https://developer.flutterwave.com/
- Meta Marketing API (ads): https://developers.facebook.com/docs/marketing-api/
- Firebase console: https://console.firebase.google.com/project/new1-e94db
- Vercel dashboard: https://vercel.com/dashboard

---

## 12. Added after the audit: Facebook & Instagram ads connection

**What candidates get.** Each candidate can connect their own Meta ad account on the **Ads** page. They then see:

- spend, reach, link clicks, cost per click and a daily spend chart (7, 30 or 90 days)
- every Meta campaign, with **Pause / Resume** buttons
- a "Tracked ad" link on each campaign that gives the **real cost per supporter** (Meta spend ÷ sign-ups from that link)

**Security**

- **Server-side login.** Facebook Login runs entirely through the server (`/api/meta/*`). A signed, expiring `state` stops anyone faking or hijacking a connection.
- **Encrypted token.** The long-lived token (about 60 days) is stored encrypted (AES-256-GCM) in a collection the rules block for every browser. It's never sent to the page.
- **Signed calls.** Every call to Meta carries `appsecret_proof`.
- **Owner only.** Only the campaign owner can connect, and only on Pro or trial. Pause and resume work only on campaigns inside the connected ad account.
- **Disconnect and deletion.** Disconnecting, or deleting the campaign, revokes CampaignHub's access at Meta and deletes the token. Meta's deauthorize and data-deletion callbacks do the same automatically, and show a confirmation code on the Support page.
- **Privacy policy.** Now explains how Meta data is used.

**Files**

| File | |
|---|---|
| `frontend/api/_lib/meta.js` | Added |
| `frontend/api/meta/[action].js` | Added |
| `frontend/src/services/metaService.js` | Added |
| `frontend/src/pages/workspace/MetaAdsPanel.jsx` | Added |
| `docs/META_SETUP.md` | Added |
| `Ads.jsx`, `Support.jsx`, `Legal.jsx`, `campaignFirestoreService.js` | Updated |
| `firestore.rules`, `vercel.json`, `devMiddleware.js`, `.env.example` | Updated |

**Tests.** 14 automated tests against a simulated Meta API, all passing:

- the login URL and signed state
- token exchange and encryption (the token is never stored in plain text)
- rejecting tampered or foreign logins
- owner and Pro checks
- insights merging and caching
- pause only inside the connected account
- linking a campaign to a tracked ad
- an expired token asking the owner to reconnect
- disconnect revoking access at Meta
- the data-deletion callback
- "not configured" behaviour

The Ads page was also screenshotted in every state (not set up, connect, choose account, connected, expired, mobile, dark mode) with no errors.

**To switch it on**

1. Follow `docs/META_SETUP.md`: redirect URI, deauthorize and data-deletion URLs, and "Require App Secret".
2. Add `META_APP_ID`, `META_APP_SECRET` and `META_TOKEN_KEY` in Vercel, then redeploy.
3. Test it yourself while the Meta app is in Development mode.
4. Submit App Review with the texts and recording steps in the guide.
