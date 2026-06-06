# CampaignHub Architecture

## Overview

CampaignHub is a three-tier MVP platform for digital campaign hosting:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│ AI Service  │
│  React/Vite │     │   Express   │     │   FastAPI   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │   Firebase   │
                    │ Firestore +  │
                    │   Storage    │
                    └─────────────┘
```

## Services

### Frontend (`frontend/`)
- **Port:** 5173
- React SPA with React Router
- Proxies `/api` requests to backend
- Dark mode UI with TailwindCSS + Framer Motion

### Backend (`backend/`)
- **Port:** 5000
- REST API for campaigns, auth, admin, and AI proxy
- Firebase Admin SDK for Firestore + Storage
- Mock mode when Firebase credentials are not configured
- JWT-based admin authentication
- Automatic campaign expiry scheduler (hourly)

### AI Service (`ai-service/`)
- **Port:** 8000
- FastAPI microservice
- Gemini or OpenAI integration with rule-based fallback
- Chat assistant and campaign recommendations

## Data Flow

### Campaign Upload
1. User submits form via `UploadForm` → `POST /api/campaigns`
2. Backend generates unique slug via `slugService`
3. Banner uploaded to Firebase Storage (or mock URL)
4. Campaign saved with `status: pending`
5. Admin notified (console log in MVP)

### Campaign Approval (Manual Payment)
1. Admin confirms payment → `POST /api/admin/campaigns/:id/confirm-payment`
2. Admin approves → `POST /api/admin/campaigns/:id/approve`
3. `startDate` and `expiryDate` are set
4. Campaign becomes publicly visible at `/campaigns/:slug`

### Auto-Expiry
- `expiryService` runs on startup and every hour
- Active campaigns past `expiryDate` → `status: expired`
- Expired campaigns hidden from public listings

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/campaigns` | Optional | List active campaigns |
| GET | `/api/campaigns/featured` | — | Featured campaigns |
| GET | `/api/campaigns/search?q=` | — | Search campaigns |
| GET | `/api/campaigns/:slug` | Optional | Campaign details |
| POST | `/api/campaigns` | — | Submit campaign |
| POST | `/api/auth/login` | — | Admin login |
| GET | `/api/admin/stats` | Admin | Dashboard stats |
| GET | `/api/admin/campaigns` | Admin | All campaigns |
| POST | `/api/admin/campaigns/:id/approve` | Admin | Approve campaign |
| POST | `/api/admin/campaigns/:id/reject` | Admin | Reject campaign |
| POST | `/api/admin/campaigns/:id/extend` | Admin | Extend duration |
| POST | `/api/admin/campaigns/:id/confirm-payment` | Admin | Confirm payment |
| DELETE | `/api/admin/campaigns/:id` | Admin | Remove campaign |
| POST | `/api/ask-ai` | — | AI chat (proxied) |

## Slug Generation

```
"Campaign Hub Launch 2026!" → "campaign-hub-launch-2026"
Collision: campaign-name → campaign-name-2 → campaign-name-3
```

## Status Lifecycle

```
pending → (payment confirmed) → active → expired
                ↓
            rejected
```

## Scalability Notes

- Backend is stateless — horizontal scaling ready
- AI service is independently deployable
- Firebase handles database scaling
- Mock mode enables local dev without cloud credentials
- File uploads use memory buffer → Firebase Storage (no local disk dependency)
