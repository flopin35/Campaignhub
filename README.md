# CampaignHub

Launch political, business, and awareness campaigns in minutes. Upload banners, pay via mobile money, get approved, and share with QR codes and live analytics.

**Repository:** [github.com/flopin35/Campaignhub](https://github.com/flopin35/Campaignhub)

## MVP Features

- **Auth** — Email/password + Google sign-in (Firebase Auth)
- **Campaign upload** — Banner, logo, gallery, social links, package selection
- **Payments** — MoMo to Cynthia Okyere (`0509002402`) with auto-generated refs (`CH-XXXXXX`)
- **Admin approval** — Verify payment, activate, reject, extend campaigns
- **Public pages** — `/campaign/:slug` with QR, share buttons, view counter
- **Analytics** — Views, shares, clicks (Firestore)
- **AI helper** — Upload suggestions + floating chat (Gemini / fallback)
- **Responsive UI** — Dark luxury design, mobile bottom nav

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

## Packages (GHS)

| Package | Price | Duration |
|---------|-------|----------|
| Basic Ad | 100 | 7 days |
| Boost Ad | 250 | 14 days |
| Premium Campaign | 500 | 30 days |
| Elite Campaign | 600 | 45 days |

## Campaign Flow

```
Upload details → Select package → MoMo payment → Upload proof → Admin approves → Live
```

Statuses: `payment_pending` → `pending_review` → `active` → `expired`

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
