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
- Google Auth flow (login, callback, /auth/me, logout, cookie + Bearer) + Email OTP magic link
- Sidebar (4 groups, AED balance, profile card)
- All 12 pages with full backend persistence:
  - Dashboard, My Progress, Benefits Ladder, Dubai Properties, Allocation Interests,
    Webinar Events, Invite & Earn, Leaderboard, Community Updates, Co-Owner Benefits,
    Support Center, Settings
- Mutations: complete milestone (+AED), property waitlist, property save, save interests,
  webinar register, referral share, like/save updates, support contact, settings update.
- Tier auto-recompute on AED grant.
- Resend email integration (Welcome, milestones, top-up receipts, OTP, webinar reminder, support inbound).
- Veriff KYC integration; Stripe (DUMMY mode) for AED top-ups; real referral system with +50 AED rewards.

## What's implemented (2026-02-22 update)
- **Real leaderboard time-window aggregates**: weekly/monthly use sum(activity_log.reward) within window per user; seed users get deterministic period scaling. (`server.py /api/leaderboard`)
- **Webinar Luma integration**: Jitsi replaced with Luma. Every webinar has `luma_url` (https://luma.com/dveb7fpt). LumaRegisterModal popup pre-fills user email and offers Confirm-on-Luma + View-Full iframe.
- **Webinar reminder flow**: registered + not-live cards show "Registered · Remind Me"; clicking POSTs `/api/webinars/remind` and emails the user.
- **Webinar Go-Live gate**: `is_live` computed server-side from `date` + `duration_minutes`; only true within the live window. Card+featured CTA only shows Go Live Now while is_live=true.
- **Leaderboard UI redesign**: gold shimmer "OneX Champions" headline, glowing podium with crown/medal/award icons, "Your standing" hero card, ranked list with progress bars per row.
- **Support contact → concierge email**: every `/api/support/contact` message is forwarded by `send_support_inbound` to `SUPPORT_INBOX` (defaults to surya@onex.exchange) with full user context (name, email, phone, tier, AED balance, message body, reply_to=user email).
- **Phone capture on Verify Mobile**: milestone now requires a phone number via PhoneCaptureModal; persisted on `user.phone` and editable in Settings.

## What's implemented (2026-02-22 — referrals overhaul)
- **Public referral URL** now `https://onex.finance/?ref=<code>` (driven by `PUBLIC_APP_URL`).
- **`POST /api/referrals/click`**: public click-tracking endpoint with visitor cookie de-duplication, 30-day attribution window.
- **`ReferralCapture` component** mounted at the app root — captures `?ref=` on ANY route, stores in sessionStorage, fires the click endpoint.
- **`/api/referrals`** now returns a full lifecycle payload: referees (with status: signed_up/verified/kyc_completed and AED earned per friend), pending_clicks, expired_clicks, plus 9 stats (clicks_total, clicks_unique, signups, verified, kyc_completed, pending, expired, aed_earned, invites_sent).
- **`_mark_click_converted` helper**: signup attribution (both Google and Email OTP paths) now flips matching click rows to converted=True so the dashboard buckets stay accurate.
- **Invite & Earn page redesign**: link card, four share buttons that actually open share URLs (WhatsApp/Telegram/LinkedIn/Email), 6-stat grid (Clicks/Signups/Pending/Verified/KYC/AED), Referral Pipeline section with 4 tabs (Signups/Pending/Expired/All), table of all referees + anonymous click visitors with status pills, and a friendly empty state.
- **Critical bug fix (during testing)**: ObjectId leak in `/api/auth/email/verify` and `/api/auth/google/callback` for NEW users — `insert_one` was mutating the dict with `_id`, breaking JSON encoding (500 errors). Fixed with `user_doc.pop('_id', None)`. Referral signup flow now works end-to-end.

## Backlog (P1)
- Sora-2-style hero videos on Co-Owner Benefits.
- Email verification capture for shared referral signups.
- Saved Properties dedicated view.
- Deep visual redesign of Co-Owner Benefits page (modal already wired).

## Backlog (P2)
- Stripe LIVE (currently DUMMY); webhook + receipts wired.
- Live chat with WebSocket on Support Center.
- Push notifications via FCM/OneSignal.
- Split server.py into routers (auth/dashboard/progress/webinars/properties/social/support/settings/payments).

## Next steps
- Decide when to switch Stripe from DUMMY to LIVE.
- Optionally polish: ESC accessibility everywhere, phonenumbers validation, refresh queue for support emails.
