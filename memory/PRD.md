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

## What's implemented (2026-02-22 — Phase A mobile conversion)
- **Mobile-responsive shell**: sticky `MobileTopBar` (brand + AED pill + hamburger), slide-in `MobileDrawer` (profile, AED card, all 12 routes, sign-out — closes on route change / ESC / backdrop tap), fixed `BottomNav` with 5 tabs (Home / Properties / Events / Invite / More) and a gold active indicator.
- **Single nav source of truth**: `components/layout/navItems.js` shared by Sidebar, MobileDrawer and BottomNav.
- **Safe-area + zero overflow**: `viewport-fit=cover`, `env(safe-area-inset-*)` on top bar / drawer / bottom nav, `overflow-x:hidden` and `.mobile-safe-bottom` clearance. Zero horizontal overflow at 375px on **all 12 pages** (verified).
- **Touch-target sizing**: `.btn-gold` / `.btn-ghost` ≥44px on mobile, larger pill paddings, `-webkit-tap-highlight-color: transparent`.
- **Capacitor 7 wrapper**: `capacitor.config.ts` (appId `club.onex.app`, webDir `build`), `src/native.js` boots StatusBar/SplashScreen/Android-back, `package.json` cap:* scripts (`cap:add:ios`, `cap:add:android`, `cap:sync`, `cap:open:ios`, `cap:open:android`, `cap:run:*`).
- **`MOBILE_BUILD.md`**: full iOS + Android shipping playbook (Xcode signing, Play Console .aab, icon/splash generation, troubleshooting).

## What's implemented (2026-02-22 — brand rebrand + Co-Owner Benefits redesign)
- **Brand colour migration**: gold (`#FACC15`) → lime (`#8CFF2E`) extracted from the user-supplied round logo. Hover variant `#6DDB1E`, shimmer accent `#D5FFB8`. Updated across `index.css` (CSS var `--onex-gold` + body radial-gradient + ::selection), every page, every modal, every component, both email templates AND the OTP email body. Zero residual gold hex values remain.
- **Round brand logo**: new `BrandMark` component renders `/brand/onex-circle.png` in a circular wrapper with optional glow. Replaces every legacy "1X" placeholder — Sidebar (size 48 glow), MobileTopBar (size 36), Login (size 48 glow), Dashboard footer banner (size 56 glow), MyProgress next-reward card (size 64 glow).
- **Favicon + PWA icons**: generated `favicon.ico` (multi-resolution), `apple-touch-icon.png` (180×180), `logo192.png`, `logo512.png`, and `brand/favicon-16..512.png` from the logo. `index.html` references all of them; title updated to "OneX Club™ — Dubai Co-Ownership"; theme-color `#0A0A0B`; mask-icon with brand color.
- **Co-Owner Benefits deep redesign**: rich gradient hero with current-tier story + AED balance card + next-tier mini progress bar; "Four levels" overview rail (Star → Diamond → Crown → Trophy with accent color per tier + click-to-open detail modal); per-tier banners with lifestyle tagline + locked/unlocked pill + larger progress bar; benefit cards with brand-tinted borders when unlocked + "X AED to go" hints when locked; "Three fast ways to climb a tier" bottom CTA (Attend webinar / Invite friend / Top up).

## What's implemented (2026-02-22 — Framer native Waitlist + dashboard polish)
- **Framer Code Override** (replaces the heavy HTML embed): `withOnexCapture` is a TypeScript Code Override that attaches to Framer's *native* Waitlist component via a MutationObserver. On every form submit it POSTs `{email, ref, source:"framer-waitlist"}` to `/api/waitlist/join` while letting Framer's own success behaviour (open-link / redirect) continue uninterrupted. Visible inside Invite & Earn → "Capture emails from your Framer Waitlist".
- **3-step install instructions** rendered next to the copy button: Code → New File → onexCapture.tsx → paste → select Waitlist component → Code Overrides → pick `withOnexCapture`.
- **Mobile header polish**: Bell (notifications) icon promoted from the dashboard body into `MobileTopBar` — sits between the AED pill and the hamburger with a green dot. The inline `dashboard-notifications-btn` is now hidden on mobile (`hidden lg:flex`).
- **Co-Owner Credits Balance card** is now full-width on mobile (358px on iPhone 14 Pro viewport) — matches the "Your Next Milestone" card width exactly, since the inline Bell button is no longer competing for horizontal space.
- Desktop layout unchanged — sidebar still shows inline bell + balance pill in the dashboard header.

## What's implemented (2026-02-22 — Brevo migration + CRM auto-sync)
- **Resend → Brevo migration**: removed the `resend` package and entire `Resend` code path. New `backend/brevo_client.py` is a thin httpx wrapper around Brevo REST v3 (`POST /v3/smtp/email` for transactional + `POST /v3/contacts` for CRM upserts) with 429-aware retries (0/0.4/1.2s backoff).
- **`email_service.py` rewrite**: all template helpers (`send_welcome`, `send_milestone_done`, `send_topup_receipt`, `send_webinar_reminder`, `send_support_inbound`) now route through Brevo via the same function signatures (no other server code needed changing). The email shell uses the actual round-logo PNG from `www.onexassets.com/brand/onex-circle.png` (was inline "1X" text). New dedicated `send_waitlist_welcome` template avoids the awkward "+AED 0" prefix for Framer signups.
- **CRM auto-sync at every signup**: `brevo_upsert_contact()` runs as a `BackgroundTask` after each of (a) Google sign-in for new users (`source='google'`), (b) email-OTP magic-link signup for new users (`source='email'`), (c) public Framer/waitlist join (`source=<payload.source>`). Each upsert adds the contact to `BREVO_CONTACT_LIST_ID=6` with attributes `NAME`/`FIRSTNAME`/`LASTNAME`/`REF_CODE`/`TIER`/`AED_BALANCE`/`SOURCE`. `updateEnabled=true` so re-submits never throw a duplicate-email 400.
- **New brand domain**: `PUBLIC_APP_URL=https://www.onexassets.com`, `SENDER_EMAIL=hello@onexassets.com`, `SUPPORT_INBOX=surya@onexassets.com`. All referral links + email logos + admin notifications now use the onexassets.com domain.
- **No re-verification**: emails captured via Google sign-in / email-OTP / Framer waitlist land in Brevo immediately — no double-opt-in step (matches the user's spec).

## What's implemented (2026-02-22 — gamified journey + Framer waitlist)
- **12-step gamified journey** (was 5): Join Waitlist → Verify Mobile → **Browse Dubai Properties** (auto) → **Share Your Referral Link** (auto) → Attend a Webinar → **Save a Property** (auto) → **Invite a Friend (signup)** (auto) → Complete KYC → Reserve Allocation Interest → **Friend Completes KYC** (auto) → **Join Community Updates** (auto) → **Allocation-Ready Co-Owner**. Each step has a per-step AED reward (10–100 AED) and is either `manual` (Mark Complete button) or `auto` (deep-link CTA to the page where it'll auto-complete).
- **`auto_complete_data_milestones(user_id)`** runs on every `/progress` and `/dashboard` call. Cascades exactly one pending step (the first non-completed). Migration in `seed_data()` upgrades all legacy 5-step users to the new 12-step schema while preserving their completions.
- **`POST /api/properties/view`** (new): logs `property_views`; triggered automatically by DubaiProperties listing page; drives `browse_properties` milestone.
- **`POST /api/waitlist/join`** (PUBLIC, no auth): drop-in endpoint for the user's Framer landing page. Records `waitlist_signups`, dedup-checks by email, attributes referrer (+AED 25 + click conversion), sends welcome email to visitor AND admin notification to `surya@onex.exchange`.
- **`GET /api/waitlist/info?ref=<code>`** (PUBLIC): used by the Framer snippet to greet the visitor with the inviter's name.
- **Waitlist signups now appear in `/api/referrals`** as referees with `status="waitlist"` (pink chip), `aed_earned=25`, `tier="Waitlist"`. New stats field `waitlist_signups`.
- **Invite & Earn — Capture emails on your Framer site**: new section with two big cards (copy referral URL, copy paste-ready HTML+JS snippet), "What happens on submit" explainer, and a new **Waitlist tab** in the pipeline filter.
- **Resend rate-limit retry**: `_send()` now retries up to 3× with 0/0.4/1.2s backoff on 429/rate-limit errors — survives Framer-driven traffic bursts without dropping welcome emails.

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
