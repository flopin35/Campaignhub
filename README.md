# CampaignHub

The campaign operating system for Ghanaian candidates — voter CRM, field team, election-day results, ads tracking, messaging and an AI speechwriter, with Paystack / Flutterwave subscriptions.

**Repository:** [github.com/flopin35/Campaignhub](https://github.com/flopin35/Campaignhub)

## CampaignHub Pro — features

One subscription per campaign page: **₵120/month** or **₵1,200/year** (7-day free trial on the first page).

- **Voter CRM** — supporters by region, constituency & polling station; strong / leaning / undecided / opposed; CSV import & export
- **Path to victory** — win number, projected votes, persuadable voters by station
- **Field team** — private canvassing links (no app, no login), volunteer approvals, leaderboard
- **Election day** — polling stations, agent result links, live collation, turnout, missing stations, CSV export
- **Messages** — audience builder + personalised WhatsApp queue, bulk-SMS CSV, email BCC, templates, AI rewrite
- **Ads & reach** — tracked links + printable QR per ad, visits, sign-ups, cost per supporter; Spotlight placement
- **Events** — public RSVPs, WhatsApp invites, gate check-in counter
- **Fundraising** — MoMo donations to the campaign's own number, confirmations, goals, donor leaderboard
- **Insights** — 30/90-day traffic, sources, conversion, issue poll by region
- **AI Studio** — speeches, ad copy, posts, SMS, statements in English, Twi, Fante, Ga, Ewe, Hausa, Dagbani, Pidgin
- **Public campaign page** — candidate-branded, mobile-first, join / volunteer / donate / poll / events / share
- **Billing** — Paystack + Flutterwave (MoMo & cards), webhooks, receipts, optional card auto-renew
- **Light & dark themes** — navy + gold design system

See **[docs/BILLING_SETUP.md](docs/BILLING_SETUP.md)** to connect Paystack/Flutterwave and go live.

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, Vite, TailwindCSS, Framer Motion, Lucide icons |
| Backend | Node.js, Express (optional API / AI proxy) |
| AI Service | Python, FastAPI, Gemini |
| Database | Firebase Firestore |
| Storage | Firebase Storage |
| Auth | Firebase Authentication |

## Project Structure

```
CampaignHub/
├── frontend/       # React SPA (main app)
├── backend/        # Express API
├── ai-service/     # FastAPI AI microservice
└── firebase/       # Firestore & Storage rules
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Firebase project `new1-e94db`

### 1. Firebase

1. Enable **Authentication** (Email + Google), **Firestore**, and **Storage**
2. Deploy rules:

```bash
cd firebase
firebase deploy --only firestore:rules,storage --project new1-e94db
```

### 2. Frontend (required)

```bash
cd frontend
cp .env.example .env   # optional — defaults work for dev
npm install
npm run dev
```

App: **http://localhost:5173**

### 3. Backend (optional)

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: **http://localhost:5000/api/health**

### 4. AI Service (optional)

```bash
cd ai-service
cp .env.example .env
pip install -r requirements.txt
python main.py
```

AI: **http://localhost:8000**

Set `GEMINI_API_KEY` in `ai-service/.env` for live AI responses.

## Plans

| Plan | Price | Notes |
|------|-------|-------|
| Free trial | ₵0 · 7 days | One per account; page goes live immediately |
| Pro monthly | ₵120 / 30 days | MoMo or card (Paystack / Flutterwave) |
| Pro yearly | ₵1,200 / 365 days | 2 months free |
| Spotlight | ₵20–₵350 | One-time homepage placement (3–48 h) |

Prices: `frontend/api/_lib/billingCatalog.js` (single source of truth for server and UI).

## Admin Access

Admin dashboard (`/admin`) is restricted to the configured admin email in `frontend/src/firebase/auth.js`. Verify payments and activate campaigns from the Admin Control Center.

## Environment Variables

| Service | File |
|---------|------|
| Frontend | `frontend/.env.example` |
| Backend | `backend/.env.example` |
| AI | `ai-service/.env.example` |

Never commit `.env` files — they are gitignored.

## Production Build

```bash
cd frontend
npm run build
# Deploy dist/ to Firebase Hosting, Vercel, or Netlify
```

## Health Checks

- Backend: `GET /api/health`
- AI: `GET /api/health`

## License

MIT
