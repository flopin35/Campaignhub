# CampaignHub Pro — billing & launch checklist

CampaignHub Pro is sold **per campaign page**:

| Plan | Price | Period | Notes |
|------|-------|--------|-------|
| Free trial | ₵0 | 7 days | One per account, first campaign page. Page goes live immediately. |
| Pro monthly | ₵120 | 30 days | MoMo or card. Optional card auto-renew (Paystack). |
| Pro yearly | ₵1,200 | 365 days | "2 months free" (saves ₵240). |
| Spotlight | ₵20–₵350 | 3–48 hours | One-time homepage/directory placement. |

Prices live in one file: `frontend/api/_lib/billingCatalog.js`. The server always charges from that file — the browser can't change the amount.

When a period ends, Pro tools pause and the public page stays up for a **3-day grace period**, then goes offline until renewed. Paying early stacks new time on top of the current period (or the remaining trial).

---

## Fastest way: finish setup from the website (no command line)

1. Publish the site as usual (push to GitHub or run `npx vercel --prod`).
2. Sign in as the admin (daakukwaku7@gmail.com) and open **Admin → Setup**.
3. Paste your **new** Paystack secret key (and, if you use them, Flutterwave, Meta and AI keys), then click **Finish setup**.
   This saves the keys on the server (Firestore `config/secrets`, which nobody can read from the browser — never in the code or git),
   publishes the security rules, runs the one-time data clean-up and creates the ₵120 / ₵1,200 Paystack plans.
4. Copy the **Paystack webhook URL** shown on the right into Paystack → Settings → API Keys & Webhooks. That is the only step
   that has to be done on Paystack's website. (Same for Flutterwave and Meta if you use them — the page shows each URL.)

Values set in Vercel always win over values saved in Admin → Setup, so nothing you already configured there changes.
The setup page needs `FIREBASE_SERVICE_ACCOUNT` in Vercel (it is already there if OTP sign-in works).
Everything below is the manual / command-line way of doing the same thing (`node scripts/go-live.mjs` does it in one command).

---

## 1. Deploy the new security rules first, then clean up old data

The new rules enforce one free trial per verified account, stop owners editing billing/status fields, protect voter data and lock down image uploads. **Deploy them before the new frontend**:

```bash
cd firebase
firebase deploy --only firestore:rules,storage --project new1-e94db
```

Then run the one-time data check (it only reports until you add `--apply`):

```bash
cd ../frontend
node scripts/upgrade-firestore-data.mjs --key ../new1-e94db-firebase-adminsdk-XXXX.json
node scripts/upgrade-firestore-data.mjs --key ../new1-e94db-firebase-adminsdk-XXXX.json --apply
```

Read the report. If section A, B or C lists pages you never sold Pro to, run once more with `--apply --strip-unbacked`.
The admin account must sign in with **Google or an email code** (a verified email) — the rules only treat a verified admin e-mail as admin.

## 2. Paystack

1. Dashboard → **Settings → API Keys & Webhooks**
   - Copy the **Secret key** → Vercel env `PAYSTACK_SECRET_KEY`
   - **Webhook URL**: `https://<your-domain>/api/webhooks/paystack`
   - **Callback URL**: leave empty (the app sends its own)
2. Make sure **Mobile Money** and **Card** channels are enabled for GHS.
3. *(Optional, card auto-renew)* **Products → Plans → Create plan**
   - "CampaignHub Pro Monthly", GHS 120, interval Monthly → copy the plan code → `PAYSTACK_PLAN_MONTHLY`
   - "CampaignHub Pro Yearly", GHS 1,200, interval Annually → `PAYSTACK_PLAN_YEARLY`
   - The amounts must be exactly GHS 120 and GHS 1,200. The server checks this and turns auto-renew off for a plan that doesn't match (Paystack charges the plan's price, not ours).
   - Paystack only auto-renews cards. MoMo customers pay each period (we remind them in-app).

## 3. Flutterwave

1. Dashboard → **Settings → API Keys** → copy the **Secret key** → `FLW_SECRET_KEY`
2. **Settings → Webhooks**
   - URL: `https://<your-domain>/api/webhooks/flutterwave`
   - Secret hash: any long random string → also set it as `FLW_WEBHOOK_HASH`
   - Tick "Receive webhook response in JSON" if offered.
3. Make sure **Mobile money Ghana** and **Card** payment methods are enabled.

You can run with only one provider — the checkout hides the one without a key. Flutterwave is only offered when **both** `FLW_SECRET_KEY` and `FLW_WEBHOOK_HASH` are set (without the hash its payment notifications would be rejected).

## 4. Vercel environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (or `FIREBASE_SERVICE_ACCOUNT`) | ✅ | Already used for OTP — the billing API writes subscriptions with Firebase Admin |
| `APP_URL` | ✅ | e.g. `https://www.campaignhubgh.com` — used for payment return URLs (falls back to Vercel's production URL) |
| `PAYSTACK_SECRET_KEY` | one provider | Paystack payments + webhook signature |
| `FLW_SECRET_KEY`, `FLW_WEBHOOK_HASH` | one provider | Flutterwave payments + webhook check |
| `PAYSTACK_PLAN_MONTHLY`, `PAYSTACK_PLAN_YEARLY` | optional | Card auto-renew |
| `OPENAI_API_KEY` or `GEMINI_API_KEY` | for AI Studio | Pro AI writer |
| `AI_STUDIO_DAILY_LIMIT` | optional | Default 80 drafts per campaign per day |
| `AI_STUDIO_TRIAL_DAILY_LIMIT` | optional | Default 20 drafts per day while a page is on the free trial |

Redeploy after adding variables.

## 5. Test before going live

Use test keys (`sk_test_…`, `FLWSECK_TEST-…`) on a preview deployment:

1. Sign up with a new email → create a campaign → the 7-day trial starts and the page is live.
2. Plan & billing → **Subscribe** → pay with a test card / test MoMo.
3. You return to `/billing/callback` → "Welcome to CampaignHub Pro". The campaign shows **Pro**, and **Payment history** shows a receipt.
4. In Paystack/Flutterwave, open the webhook logs — they should show `200`.
5. Admin (`/admin`) → Payments tab shows the transaction; Campaign pages tab shows the plan.

Then switch to live keys.

## How it works (for developers)

```
Browser ──POST /api/billing/checkout──▶ server prices item, writes billing_transactions/{ref}
        ◀── hosted checkout URL ────── (Paystack transaction/initialize · Flutterwave /v3/payments)
Customer pays on Paystack/Flutterwave (MoMo prompt or card)
Provider ──redirect──▶ /billing/callback ──POST /api/billing/verify──▶ server re-verifies with provider
Provider ──webhook───▶ /api/webhooks/{paystack|flutterwave} ──────────▶ server re-verifies with provider
Both paths call fulfillPayment(): idempotent Firestore transaction that
  • checks amount ≥ price and currency = GHS
  • extends campaigns/{id}.subscription.currentPeriodEnd (stacking on trial/paid time)
  • sets endDate = period end + 3 days grace, status active
  • or activates Spotlight (boost*) fields
  • marks the transaction success and notifies the owner
```

Files: `frontend/api/_lib/billing.js`, `frontend/api/billing/[action].js`, `frontend/api/webhooks/[provider].js`, `frontend/src/services/billingService.js`, `frontend/src/utils/billing.js`.

Manual payments (bank transfer, cash): Admin → Campaign pages → crown icon → **Grant 7/30/90/365 days**.
