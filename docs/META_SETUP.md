# Facebook & Instagram ads (Meta Marketing API): setup guide

## What candidates get

Each candidate can connect **their own** Meta ad account to their campaign page. This happens on the **Ads** page, in the **Facebook & Instagram ads** card. Once connected, they see:

- spend, reach, impressions, link clicks, cost per click and CTR for the last 7, 30 or 90 days
- a daily spend chart
- every Meta campaign with its status and budget. A **Political** badge marks campaigns using the "Issues, elections or politics" category.
- **Pause / Resume** buttons for each campaign
- a **Tracked ad** link: each Meta campaign can be tied to a CampaignHub tracked link, which shows the **real cost per supporter**. This is Meta spend divided by the people who signed up through that link.

How it's built:

- The Facebook token stays on the server, encrypted with AES-256-GCM. The browser never sees it.
- Every call to Meta is signed with `appsecret_proof`.
- Results are cached for 15 minutes to stay well under Meta's rate limits.
- Candidates can disconnect at any time. Deleting a campaign also disconnects it.
- Meta's "deauthorize" and "data deletion" callbacks are handled automatically.

Code:

- `frontend/api/_lib/meta.js` and `frontend/api/meta/[action].js`: the server side.
- `frontend/src/services/metaService.js` and `frontend/src/pages/workspace/MetaAdsPanel.jsx`: the screens.

---

## 1. Meta app settings (developers.facebook.com → My Apps → CampaignHubgh)

**Use cases.** Make sure **Create & manage ads with Marketing API** is added.

**App settings → Basic:**

| Field | Value |
|---|---|
| App domains | `campaignhubgh.com`, `www.campaignhubgh.com` |
| Privacy Policy URL | `https://www.campaignhubgh.com/privacy` |
| Terms of Service URL | `https://www.campaignhubgh.com/terms` |
| User data deletion → Data deletion callback URL | `https://www.campaignhubgh.com/api/meta/data-deletion` |
| Category | Business and pages |
| App icon | Your CampaignHub logo (1024×1024) |

**Facebook Login for Business → Settings:**

| Setting | Value |
|---|---|
| Client OAuth login | On |
| Web OAuth login | On |
| Enforce HTTPS | On |
| Use Strict Mode for redirect URIs | On |
| Valid OAuth Redirect URIs | `https://www.campaignhubgh.com/api/meta/callback` (add your Vercel preview URL too if you test there) |
| Deauthorize callback URL | `https://www.campaignhubgh.com/api/meta/deauthorize` |

**App settings → Advanced.** Turn **Require App Secret** on. CampaignHub always sends `appsecret_proof`.

**Optional: Facebook Login for Business configuration.**

1. Go to Facebook Login for Business → **Configurations → Create configuration**.
2. Choose **User access token**.
3. Pick the permissions **ads_read, ads_management, business_management** and the asset type **Ad accounts**.
4. Copy the **Configuration ID** into `META_LOGIN_CONFIG_ID`.

Without a configuration, the app asks for those permissions directly. Either way works.

---

## 2. Vercel environment variables

| Variable | Needed | Where to find it |
|---|---|---|
| `META_APP_ID` | ✅ | App settings → Basic → App ID |
| `META_APP_SECRET` | ✅ | App settings → Basic → App secret (click Show) |
| `META_TOKEN_KEY` | Strongly recommended | Any long random string, e.g. 40+ characters. It encrypts the stored Facebook tokens. **Don't change it later**, or every candidate must reconnect. |
| `META_LOGIN_CONFIG_ID` | Optional | From step 1 |
| `META_GRAPH_VERSION` | Optional | Defaults to `v26.0` |
| `APP_URL` | ✅ (already set for payments) | `https://www.campaignhubgh.com` |

Redeploy after adding them. The Ads page then shows **Continue with Facebook**. Until they're set, it shows "coming soon", plus an admin note when you're signed in as admin.

> Never put the App Secret or a Facebook token in the code, in a `VITE_` variable, or in a chat.

---

## 3. Test it (works now, in Development mode)

While the app is in **Development** mode, only people with a role on the app can connect: you, plus testers you add under **App roles → Roles**.

1. Sign in to CampaignHub, open a campaign that's on Pro or trial, and go to **Ads**.
2. Click **Continue with Facebook**, log in, choose your business and ad account, then **Save**.
3. You land back on Ads with "Facebook ad account connected". Pick the ad account if you have more than one.
4. Check that spend, reach and clicks match Ads Manager for the same period.
5. Pause and resume a test campaign. Check in Ads Manager that its status changed.
6. Link a campaign to a tracked ad and check the supporters and cost per supporter.
7. Use **••• → Disconnect**. In Facebook → Settings → Business integrations, CampaignHub should disappear.

---

## 4. Going live for all candidates (App Review)

1. **Business verification.** Go to App settings → Basic → Verification, or Meta Business Suite → Security Centre, and verify the business that owns the app.
2. **App Review → Permissions and features.** Request **Advanced access** for:
   - `ads_read`
   - `ads_management`
   - `business_management`
3. Paste the texts below. Upload a screen recording that follows the reviewer steps.
4. When approved, switch the app from **Development** to **Live**.

### Text: `ads_read`
> CampaignHub is a campaign management platform for political candidates in Ghana. A candidate connects their own Meta ad account to their campaign page, and CampaignHub uses ads_read to show the performance of that account's campaigns in the candidate's private dashboard ("Ads" page). We read campaign names, status, budgets, spend, reach, impressions, link clicks, CTR and cost per click for the last 7, 30 or 90 days, plus daily spend. We combine Meta spend with the supporter sign-ups recorded on the candidate's campaign page to show cost per supporter. Only the candidate (the campaign owner) can see this data; it is never shown publicly, shared with other users or sold.

### Text: `ads_management`
> CampaignHub uses ads_management only so a candidate can pause or resume the campaigns in their own connected ad account from the CampaignHub "Ads" page, using the Pause / Resume button next to each campaign. CampaignHub never changes an ad without the candidate clicking that button, and it only acts on campaigns in the ad account the candidate connected. Ads keep running in the candidate's own ad account, paid with the candidate's own payment method.

### Text: `business_management`
> When a candidate connects with Facebook Login for Business, they choose which business and which ad account to share with CampaignHub. We use business_management to list the ad accounts the candidate shared (with their business name), so they can pick the account their campaign uses. We do not create, change or delete any business assets.

### Political ads statement
> Our users are political campaigns. CampaignHub does not create or run ads. Candidates create their ads in Meta Ads Manager under the "Issues, Elections or Politics" special ad category, with their own authorisation and "Paid for by" disclaimer. CampaignHub links to Meta's authorisation page from the Ads screen.

### Data handling
> Facebook access tokens are stored encrypted (AES-256-GCM) on our servers and are never sent to the browser. Every API call uses appsecret_proof. Insights are cached for at most 15 minutes. When a candidate disconnects, removes CampaignHub in Facebook Business integrations, or sends a data deletion request, we delete the token and all stored ad data (deauthorize and data-deletion callbacks are implemented). Privacy policy: https://www.campaignhubgh.com/privacy

### Steps for the reviewer (and for your screen recording)
> 1. Go to https://www.campaignhubgh.com/login and sign in with the test account below.
> 2. Open the campaign "Reviewer Test Campaign" and click **Ads** in the left menu.
> 3. In the "Facebook & Instagram ads" card, click **Continue with Facebook**, log in, choose the business and ad account, and click **Save**.
> 4. You return to the Ads page. If several ad accounts were shared, pick one. **ads_read / business_management:** the card shows spend, reach, link clicks, daily spend and each campaign.
> 5. **ads_management:** click the Pause button next to a running campaign. The status changes to "Paused" (also visible in Ads Manager). Click Resume to restart it.
> 6. Click **••• → Disconnect** to remove the connection.
>
> Test login: (create a CampaignHub account for the reviewer and paste its email and password here)

Tips:

- Give the reviewer a campaign that is on **Pro or trial**.
- Use an ad account with at least one small campaign, so there's data to show.
- In the recording, show the Facebook permission screen and each button working.

---

## 5. Troubleshooting

| Message | Fix |
|---|---|
| Facebook says "URL blocked" or "redirect URI is not whitelisted" | Add `https://<your-domain>/api/meta/callback` to **Valid OAuth Redirect URIs**. |
| "Your Facebook connection has expired" | Tokens last about 60 days. Click **Reconnect with Facebook**. |
| "No ad accounts were shared" | Reconnect, and tick the ad account on the Facebook screen. |
| "Meta has not given CampaignHub permission for this ad account" | Reconnect and allow access to that ad account. In Development mode, the person must also have a role on the app. |
| "Meta is limiting requests" | Wait a few minutes. Results are cached for 15 minutes. |
| "Coming soon" on the Ads page | `META_APP_ID` / `META_APP_SECRET` are missing in Vercel, or you haven't redeployed since adding them. |
