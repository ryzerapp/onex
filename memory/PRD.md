# OneX Club™ — PRD

## Original problem statement
Premium web app guiding users from waitlist → allocation-ready co-owners of Dubai real estate.
Feel: Apple Wallet × Airbnb × Wealthfront × Linear. Dark luxury theme, warm gold accents,
generous spacing, Google Sans Flex typography. Twelve interconnected pages via persistent left
sidebar grouped under My Journey / Discover / Community / Account. AED Balance is the only
currency surface. Personalization based on user stage at all times.

## User choices captured (2026-02)
- Auth: Emergent Google social login.
- Data: Pre-seeded mock data in MongoDB.
- Functionality: Full backend persistence for all actions.
- Visual aesthetic: match provided 5 references exactly for all 12 pages.

## Personas
- Curious waitlist member (Cadet).
- Engaged learner (Cadet → Co-Owner Member).
- Allocation-ready investor (Priority Co-Owner).
- Active co-owner / advocate (Co-Owner Circle / Elite).

## Architecture
- Backend: FastAPI + Motor + MongoDB. Auth via Emergent (session-data + cookie). All routes prefixed `/api`.
- Frontend: React 19 + react-router 7 + Tailwind + shadcn UI primitives + lucide-react icons + sonner toasts. Custom CSS in `index.css` for OneX tokens (dark + gold + radius-24).
- Data seeded at startup: properties (5), categories (5), webinars (5), updates (4), leaderboard (8), co-owner benefits (7), FAQs (5).

## What's implemented (2026-02)
- Google Auth flow (login, callback, /auth/me, logout, cookie + Bearer)
- Sidebar (4 groups, AED balance, profile card)
- All 12 pages with full backend persistence:
  - Dashboard, My Progress, Benefits Ladder, Dubai Properties, Allocation Interests,
    Webinar Events, Invite & Earn, Leaderboard, Community Updates, Co-Owner Benefits,
    Support Center, Settings
- Mutations: complete milestone (+AED), property waitlist, property save, save interests,
  webinar register, referral share, like/save updates, support contact, settings update.
- Tier auto-recompute on AED grant.

## Backlog (P1)
- Persist Sora-2-style hero videos on Co-Owner Benefits.
- Email verification capture for shared referral signups.
- Saved Properties dedicated view.
- Replace mock leaderboard period balances with real time-window aggregates.

## Backlog (P2)
- Stripe integration for AED top-up.
- Live chat with WebSocket on Support Center.
- Push notifications via FCM/OneSignal.

## Next steps
- Optionally enable Stripe payments for direct AED top-ups.
- Add WhatsApp click-through actually opening wa.me share URLs (link copy already works).
