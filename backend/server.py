"""OneX Club™ Backend — FastAPI + MongoDB.

Implements:
- Emergent Google OAuth (session-data exchange + cookie)
- User profile, AED balance, tier, milestones
- Properties, allocation interests, webinars, leaderboard, referrals,
  community updates, co-owner benefits, support, settings
- Mock data seeding on startup
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, Annotated

import httpx
from dotenv import load_dotenv
from emergentintegrations.payments.stripe.checkout import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    StripeCheckout,
)
from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, FastAPI, Header, HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

from email_service import send_milestone_done, send_topup_receipt, send_welcome

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("onex")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="OneX Club API")
api = APIRouter(prefix="/api")


# -------------------- Models --------------------
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    tier: str = "Cadet"
    aed_balance: int = 100
    referral_code: str
    referred_by: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class SessionExchange(BaseModel):
    session_id: str


# -------------------- Tier helpers --------------------
TIERS = [
    {"name": "Co-Owner Member", "threshold": 500, "key": "co_owner_member"},
    {"name": "Priority Co-Owner", "threshold": 2500, "key": "priority"},
    {"name": "Co-Owner Circle", "threshold": 5000, "key": "circle"},
    {"name": "Elite Co-Owner", "threshold": 10000, "key": "elite"},
]


def compute_tier(balance: int) -> str:
    if balance < 500:
        return "Cadet"
    name = "Cadet"
    for t in TIERS:
        if balance >= t["threshold"]:
            name = t["name"]
    return name


def next_tier_info(balance: int):
    for t in TIERS:
        if balance < t["threshold"]:
            return {"name": t["name"], "threshold": t["threshold"], "remaining": t["threshold"] - balance}
    return {"name": "Elite Co-Owner", "threshold": 10000, "remaining": 0}


# -------------------- Auth helpers --------------------
async def get_current_user(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    token = session_token
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]


# -------------------- Seed data --------------------
PROPERTY_SEED = [
    {
        "id": "prop_palm_jumeirah_villa",
        "name": "Palm Jumeirah Villa Collection",
        "location": "Palm Jumeirah, Dubai",
        "image": "https://images.unsplash.com/photo-1640877268187-2fa6b2ed7a5f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwyfHxkdWJhaSUyMGx1eHVyeSUyMHJlYWwlMjBlc3RhdGUlMjBleHRlcmlvcnxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85",
        "category": "luxury",
        "min_investment": 200000,
        "yield_low": 12,
        "yield_high": 16,
        "spots_available": 23,
        "spots_total": 100,
        "waitlist_count": 245,
        "description": "Ultra-luxury villas with private beach access and world-class amenities.",
        "status": "Coming Soon",
        "launch_date": "2026-05-20T10:30:00Z",
    },
    {
        "id": "prop_dubai_marina_residences",
        "name": "Dubai Marina Residences",
        "location": "Dubai Marina, Dubai",
        "image": "https://images.pexels.com/photos/30554306/pexels-photo-30554306.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "category": "residential",
        "min_investment": 150000,
        "yield_low": 10,
        "yield_high": 14,
        "spots_available": 41,
        "spots_total": 150,
        "waitlist_count": 189,
        "description": "Premium waterfront living with high rental demand and strong ROI.",
        "status": "Coming Soon",
        "launch_date": "2026-06-12T10:00:00Z",
    },
    {
        "id": "prop_business_bay_offices",
        "name": "Business Bay Offices",
        "location": "Business Bay, Dubai",
        "image": "https://images.pexels.com/photos/7168579/pexels-photo-7168579.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "category": "commercial",
        "min_investment": 150000,
        "yield_low": 9,
        "yield_high": 12,
        "spots_available": 60,
        "spots_total": 200,
        "waitlist_count": 139,
        "description": "Grade A commercial spaces in Dubai's fastest-growing business district.",
        "status": "Coming Soon",
        "launch_date": "2026-07-08T11:00:00Z",
    },
    {
        "id": "prop_jbr_airbnb_loft",
        "name": "JBR Airbnb Lofts",
        "location": "Jumeirah Beach Residence, Dubai",
        "image": "https://images.pexels.com/photos/10647324/pexels-photo-10647324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "category": "airbnb",
        "min_investment": 120000,
        "yield_low": 14,
        "yield_high": 18,
        "spots_available": 18,
        "spots_total": 60,
        "waitlist_count": 312,
        "description": "Short-stay rental lofts steps from the beach—peak Dubai tourism yield.",
        "status": "Coming Soon",
        "launch_date": "2026-04-22T09:00:00Z",
    },
    {
        "id": "prop_downtown_hospitality",
        "name": "Downtown Hospitality Suites",
        "location": "Downtown, Dubai",
        "image": "https://images.unsplash.com/photo-1462007895615-c8c073bebcd8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwzfHxkdWJhaSUyMHNreWxpbmUlMjBuaWdodHxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85",
        "category": "hospitality",
        "min_investment": 180000,
        "yield_low": 11,
        "yield_high": 15,
        "spots_available": 28,
        "spots_total": 90,
        "waitlist_count": 167,
        "description": "Serviced hospitality suites adjacent to Burj Khalifa and Dubai Mall.",
        "status": "Coming Soon",
        "launch_date": "2026-08-30T10:00:00Z",
    },
]

CATEGORY_SEED = [
    {"id": "cat_residential", "name": "Residential", "description": "Apartments and residences in prime Dubai locations.", "badge": "High Demand", "image": "https://images.pexels.com/photos/30554306/pexels-photo-30554306.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"id": "cat_airbnb", "name": "Airbnb Rentals", "description": "Short-term rental properties with high returns.", "badge": "High Demand", "image": "https://images.pexels.com/photos/10647324/pexels-photo-10647324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"id": "cat_commercial", "name": "Commercial", "description": "Offices and retail spaces in growing business hubs.", "badge": "Stable Growth", "image": "https://images.pexels.com/photos/7168579/pexels-photo-7168579.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
    {"id": "cat_luxury", "name": "Luxury Villas", "description": "High-end villas for luxury living and premium returns.", "badge": "Premium", "image": "https://images.unsplash.com/photo-1640877268187-2fa6b2ed7a5f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwyfHxkdWJhaSUyMGx1eHVyeSUyMHJlYWwlMjBlc3RhdGUlMjBleHRlcmlvcnxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85"},
    {"id": "cat_hospitality", "name": "Hospitality", "description": "Hotels and serviced apartments in top tourist destinations.", "badge": "Long-Term Growth", "image": "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"},
]

WEBINAR_SEED = [
    {"id": "wb_dubai_airbnb_master", "title": "Dubai Airbnb Masterclass", "host": "Karthik Reddy", "host_image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "image": "https://images.pexels.com/photos/10647324/pexels-photo-10647324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "date": "2026-03-12T17:00:00Z", "duration_minutes": 60, "attendees": 412, "aed_reward": 25, "description": "Learn how to maximise yield from Dubai short-stay rentals.", "status": "upcoming", "featured": True},
    {"id": "wb_yield_strategies", "title": "High-Yield Allocation Strategies", "host": "Aisha Mohammed", "host_image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "image": "https://images.unsplash.com/photo-1462007895615-c8c073bebcd8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwzfHxkdWJhaSUyMHNreWxpbmUlMjBuaWdodHxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85", "date": "2026-03-26T16:30:00Z", "duration_minutes": 75, "attendees": 268, "aed_reward": 25, "description": "Inside the OneX selection framework for top-tier yield assets.", "status": "upcoming"},
    {"id": "wb_palm_villa_briefing", "title": "Palm Jumeirah Villa Briefing", "host": "Karthik Reddy", "host_image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "image": "https://images.unsplash.com/photo-1640877268187-2fa6b2ed7a5f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwyfHxkdWJhaSUyMGx1eHVyeSUyMHJlYWwlMjBlc3RhdGUlMjBleHRlcmlvcnxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85", "date": "2026-04-08T17:00:00Z", "duration_minutes": 45, "attendees": 198, "aed_reward": 25, "description": "Allocation walkthrough for our flagship Palm Jumeirah collection.", "status": "upcoming"},
    {"id": "wb_market_outlook", "title": "Dubai Market Outlook 2026", "host": "Aisha Mohammed", "host_image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "image": "https://images.pexels.com/photos/17238022/pexels-photo-17238022.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "date": "2026-01-14T17:00:00Z", "duration_minutes": 60, "attendees": 612, "aed_reward": 0, "description": "Macro analysis of Dubai real estate cycles.", "status": "recorded", "recording_url": "https://example.com/onex/market-outlook"},
    {"id": "wb_co_ownership_101", "title": "Co-Ownership 101", "host": "Karthik Reddy", "host_image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "image": "https://images.pexels.com/photos/30554306/pexels-photo-30554306.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "date": "2025-12-05T17:00:00Z", "duration_minutes": 50, "attendees": 845, "aed_reward": 0, "description": "Foundational webinar on the OneX co-ownership model.", "status": "recorded", "recording_url": "https://example.com/onex/co-ownership-101"},
]

UPDATES_SEED = [
    {"id": "upd_palm_launch", "type": "launch", "title": "Palm Jumeirah Villa Collection waitlist now live", "body": "Our flagship Palm Jumeirah allocation has opened its priority waitlist. Allocation begins May 2026.", "image": "https://images.unsplash.com/photo-1640877268187-2fa6b2ed7a5f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwyfHxkdWJhaSUyMGx1eHVyeSUyMHJlYWwlMjBlc3RhdGUlMjBleHRlcmlvcnxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85", "author": "Karthik Reddy", "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "published_at": "2026-02-14T08:00:00Z", "likes": 384, "shares": 71},
    {"id": "upd_founder_letter", "type": "founder", "title": "A note from our founder", "body": "We crossed 12,000 waitlist members this month—thank you for trusting OneX to redefine Dubai co-ownership.", "image": "https://images.pexels.com/photos/17238022/pexels-photo-17238022.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "author": "Karthik Reddy", "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "published_at": "2026-02-10T09:00:00Z", "likes": 612, "shares": 142},
    {"id": "upd_market_insight", "type": "insight", "title": "Why Dubai short-stays are outperforming", "body": "Occupancy hit 83% across our shortlisted Airbnb assets in Q4 2025. Read the full breakdown.", "image": "https://images.pexels.com/photos/10647324/pexels-photo-10647324.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "author": "Aisha Mohammed", "author_avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "published_at": "2026-02-02T08:00:00Z", "likes": 251, "shares": 38},
    {"id": "upd_milestone", "type": "milestone", "title": "OneX Club crosses 12,000 members", "body": "A new community milestone—powered entirely by member referrals.", "image": "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "author": "OneX Team", "author_avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "published_at": "2026-01-25T09:00:00Z", "likes": 198, "shares": 27},
]

LEADERBOARD_SEED = [
    {"name": "Hassan Al-Mansouri", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 8420, "referrals": 38, "tier": "Co-Owner Circle"},
    {"name": "Priya Nair", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 6210, "referrals": 27, "tier": "Co-Owner Circle"},
    {"name": "Rahul Mehta", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 4980, "referrals": 19, "tier": "Priority Co-Owner"},
    {"name": "Sarah Lim", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 3420, "referrals": 14, "tier": "Priority Co-Owner"},
    {"name": "Omar Khan", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 2840, "referrals": 11, "tier": "Priority Co-Owner"},
    {"name": "Maya Iyer", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 2110, "referrals": 9, "tier": "Priority Co-Owner"},
    {"name": "Daniel Park", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwyfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 1685, "referrals": 7, "tier": "Co-Owner Member"},
    {"name": "Anaya Sharma", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85", "balance": 1240, "referrals": 5, "tier": "Co-Owner Member"},
]

CO_OWNER_BENEFITS_SEED = [
    {"id": "ben_priority_alloc", "title": "Priority Allocation Access", "description": "24-hour early window on every new property launch.", "image": "https://images.unsplash.com/photo-1640877268187-2fa6b2ed7a5f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjh8MHwxfHNlYXJjaHwyfHxkdWJhaSUyMGx1eHVyeSUyMHJlYWwlMjBlc3RhdGUlMjBleHRlcmlvcnxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85", "unlock_tier": "Co-Owner Member", "unlock_threshold": 500},
    {"id": "ben_executive_qa", "title": "Executive Q&A Sessions", "description": "Monthly closed-door sessions with the OneX leadership.", "image": "https://images.pexels.com/photos/5778470/pexels-photo-5778470.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "unlock_tier": "Priority Co-Owner", "unlock_threshold": 2500},
    {"id": "ben_airport_transfer", "title": "Complimentary Airport Transfers", "description": "Chauffeured airport pickup on every Dubai visit.", "image": "https://images.pexels.com/photos/237371/pexels-photo-237371.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "unlock_tier": "Priority Co-Owner", "unlock_threshold": 2500},
    {"id": "ben_founder_briefing", "title": "Private Founder Briefings", "description": "Invite-only briefings with founders ahead of every launch.", "image": "https://images.unsplash.com/photo-1661354421565-74ffd9650918?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwzfHxwcml2YXRlJTIwamV0JTIwaW50ZXJpb3J8ZW58MHx8fHwxNzgxMzAxOTAxfDA&ixlib=rb-4.1.0&q=85", "unlock_tier": "Co-Owner Circle", "unlock_threshold": 5000},
    {"id": "ben_annual_stay", "title": "Complimentary Annual Stays", "description": "Two nights every year in your favorite OneX asset.", "image": "https://images.pexels.com/photos/30554306/pexels-photo-30554306.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "unlock_tier": "Co-Owner Circle", "unlock_threshold": 5000},
    {"id": "ben_relationship_manager", "title": "Dedicated Relationship Manager", "description": "A senior OneX advisor on call, anytime.", "image": "https://images.pexels.com/photos/7168579/pexels-photo-7168579.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", "unlock_tier": "Elite Co-Owner", "unlock_threshold": 10000},
    {"id": "ben_advisory_council", "title": "Advisory Council Access", "description": "Help shape the OneX roadmap as part of our advisory council.", "image": "https://images.unsplash.com/photo-1462007895615-c8c073bebcd8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHwzfHxkdWJhaSUyMHNreWxpbmUlMjBuaWdodHxlbnwwfHx8fDE3ODEzMDE4OTV8MA&ixlib=rb-4.1.0&q=85", "unlock_tier": "Elite Co-Owner", "unlock_threshold": 10000},
]

FAQS_SEED = [
    {"id": "faq_1", "q": "What is OneX Club?", "a": "OneX Club is an invitation-only co-ownership community for premium Dubai real estate. We curate launches, educate members, and provide priority allocation access."},
    {"id": "faq_2", "q": "How does AED Balance work?", "a": "AED Balance reduces the effective entry amount on future allocations. You grow it by attending webinars, inviting friends, and becoming a co-owner."},
    {"id": "faq_3", "q": "When does my first property allocation open?", "a": "Our flagship Palm Jumeirah Villa Collection opens May 2026. Allocation order is based on tier and waitlist position."},
    {"id": "faq_4", "q": "Is my data secure?", "a": "Yes. We use bank-grade encryption and never share your data with third parties without explicit consent."},
    {"id": "faq_5", "q": "How do I become a co-owner?", "a": "Complete your profile, attend at least one webinar, reserve your allocation interest, and you'll be notified the moment a matching property opens."},
]


async def seed_data():
    if await db.properties.count_documents({}) == 0:
        await db.properties.insert_many([dict(p) for p in PROPERTY_SEED])
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([dict(c) for c in CATEGORY_SEED])
    if await db.webinars.count_documents({}) == 0:
        await db.webinars.insert_many([dict(w) for w in WEBINAR_SEED])
    if await db.community_updates.count_documents({}) == 0:
        await db.community_updates.insert_many([dict(u) for u in UPDATES_SEED])
    if await db.leaderboard_seed.count_documents({}) == 0:
        await db.leaderboard_seed.insert_many([dict(lb) for lb in LEADERBOARD_SEED])
    if await db.co_owner_benefits.count_documents({}) == 0:
        await db.co_owner_benefits.insert_many([dict(b) for b in CO_OWNER_BENEFITS_SEED])
    if await db.faqs.count_documents({}) == 0:
        await db.faqs.insert_many([dict(f) for f in FAQS_SEED])
    log.info("seed: complete")


@app.on_event("startup")
async def _startup():
    await seed_data()


# -------------------- Activity helper --------------------
async def add_activity(user_id: str, kind: str, title: str, reward: int = 0):
    await db.activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "reward": reward,
        "created_at": _now(),
    })


async def grant_aed(user_id: str, amount: int):
    if amount == 0:
        return
    await db.users.update_one({"user_id": user_id}, {"$inc": {"aed_balance": amount}})
    new_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    new_tier = compute_tier(new_user["aed_balance"])
    if new_tier != new_user.get("tier"):
        await db.users.update_one({"user_id": user_id}, {"$set": {"tier": new_tier}})


# -------------------- Auth routes --------------------
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"


def _make_referral_code(name: str) -> str:
    base = "".join(c for c in name.lower() if c.isalnum())[:6] or "onex"
    return f"{base}-{uuid.uuid4().hex[:6]}"


async def ensure_user_milestones(user_id: str):
    if await db.user_milestones.find_one({"user_id": user_id}):
        return
    milestones = [
        {"id": "join_waitlist", "title": "Join Waitlist", "subtitle": "You have successfully joined the waitlist.", "status": "completed", "icon": "user-plus", "completed_at": _now()},
        {"id": "verify_mobile", "title": "Verify Mobile", "subtitle": "Complete mobile verification to unlock next steps.", "status": "pending", "icon": "smartphone"},
        {"id": "complete_kyc", "title": "Complete KYC", "subtitle": "Verify your identity to become investment ready.", "status": "pending", "icon": "id-card"},
        {"id": "attend_webinar", "title": "Attend Webinar", "subtitle": "Attend an upcoming webinar to learn more.", "status": "pending", "icon": "calendar"},
        {"id": "reserve_allocation", "title": "Reserve Allocation Interest", "subtitle": "Reserve your allocation preference.", "status": "upcoming", "icon": "pie-chart"},
    ]
    await db.user_milestones.insert_one({"user_id": user_id, "milestones": milestones})


@api.post("/auth/session")
async def auth_session(payload: SessionExchange, request: Request, response: Response, background: BackgroundTasks):
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": payload.session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    user = await db.users.find_one({"email": email}, {"_id": 0})
    is_new_user = user is None
    if is_new_user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "tier": "Cadet",
            "aed_balance": 100,
            "referral_code": _make_referral_code(name),
            "referred_by": None,
            "created_at": _now(),
        }
        await db.users.insert_one(user_doc)
        await ensure_user_milestones(user_id)
        await add_activity(user_id, "join", "Joined the OneX waitlist", reward=100)
        user = user_doc
    else:
        if picture and not user.get("picture"):
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"picture": picture}})
            user["picture"] = picture
        await ensure_user_milestones(user["user_id"])

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    })

    if is_new_user:
        origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
        background.add_task(send_welcome, user["email"], user["name"], origin)

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {"user": user}


@api.get("/auth/me")
async def auth_me(user: CurrentUser):
    return {"user": user}


@api.post("/auth/logout")
async def auth_logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# -------------------- Dashboard / progress --------------------
@api.get("/dashboard")
async def dashboard(user: CurrentUser):
    ms_doc = await db.user_milestones.find_one({"user_id": user["user_id"]}, {"_id": 0})
    milestones = ms_doc["milestones"] if ms_doc else []
    completed = [m for m in milestones if m["status"] == "completed"]
    pending = next((m for m in milestones if m["status"] == "pending"), None)
    upcoming = next((m for m in milestones if m["status"] == "upcoming"), None)
    next_milestone = pending or upcoming
    next_tier = next_tier_info(user["aed_balance"])

    spotlight_doc = await db.properties.find_one({}, {"_id": 0}, sort=[("launch_date", 1)])

    next_webinar = await db.webinars.find_one({"status": "upcoming"}, {"_id": 0}, sort=[("date", 1)])

    waitlist_count = await db.waitlist_entries.count_documents({"user_id": user["user_id"]})
    interests_count = await db.allocation_expressions.count_documents({"user_id": user["user_id"]})
    webinars_attended = await db.webinar_registrations.count_documents({"user_id": user["user_id"], "attended": True})
    friends_invited = await db.referrals.count_documents({"referrer_id": user["user_id"]})

    # Real 7-day AED earnings from the activity_log.
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    week_pipeline = [
        {"$match": {"user_id": user["user_id"], "created_at": {"$gte": seven_days_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$reward"}}},
    ]
    week_agg = await db.activity_log.aggregate(week_pipeline).to_list(1)
    balance_this_week = int(week_agg[0]["total"]) if week_agg else 0

    recent_activity = await db.activity_log.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(8)

    lb_rank = await _user_rank(user["user_id"])
    next_reward = _compute_next_reward(milestones, user["aed_balance"])
    all_milestones_done = len(milestones) > 0 and len(completed) == len(milestones)

    return {
        "user": user,
        "milestones": milestones,
        "milestones_completed": len(completed),
        "milestones_total": len(milestones),
        "next_milestone": next_milestone,
        "next_reward": next_reward,
        "all_milestones_done": all_milestones_done,
        "next_tier": next_tier,
        "spotlight_property": spotlight_doc,
        "next_webinar": next_webinar,
        "stats": {
            "aed_balance": user["aed_balance"],
            "balance_this_week": balance_this_week,
            "waitlist_count": waitlist_count,
            "interests_count": interests_count,
            "interests_total": 5,
            "webinars_attended": webinars_attended,
            "friends_invited": friends_invited,
        },
        "recent_activity": recent_activity,
        "leaderboard_rank": lb_rank,
    }


@api.get("/progress")
async def progress(user: CurrentUser):
    ms_doc = await db.user_milestones.find_one({"user_id": user["user_id"]}, {"_id": 0})
    milestones = ms_doc["milestones"] if ms_doc else []
    completed = [m for m in milestones if m["status"] == "completed"]
    pending = [m for m in milestones if m["status"] == "pending"]
    upcoming = [m for m in milestones if m["status"] == "upcoming"]
    percent = int(round(100 * len(completed) / max(len(milestones), 1)))
    next_reward = _compute_next_reward(milestones, user["aed_balance"])
    all_milestones_done = len(milestones) > 0 and len(completed) == len(milestones)
    return {
        "milestones": milestones,
        "percent": percent,
        "completed_count": len(completed),
        "total": len(milestones),
        "upcoming_count": len(pending) + len(upcoming),
        "to_next_reward": next_reward["amount"],
        "next_reward": next_reward,
        "all_milestones_done": all_milestones_done,
        "current_tier": compute_tier(user["aed_balance"]),
        "aed_balance": user["aed_balance"],
    }


class MilestoneAction(BaseModel):
    milestone_id: str


@api.post("/progress/complete")
async def complete_milestone(payload: MilestoneAction, request: Request, background: BackgroundTasks, user: CurrentUser):
    ms_doc = await db.user_milestones.find_one({"user_id": user["user_id"]})
    if not ms_doc:
        raise HTTPException(status_code=404, detail="Milestones not found")

    milestones = ms_doc["milestones"]
    granted = 0
    just_completed = False
    for m in milestones:
        if m["id"] == payload.milestone_id and m["status"] != "completed":
            m["status"] = "completed"
            m["completed_at"] = _now()
            granted = MILESTONE_REWARDS.get(payload.milestone_id, 0)
            just_completed = True
            break

    # Only re-shuffle queue when we actually completed something.
    if just_completed:
        has_pending = any(m["status"] == "pending" for m in milestones)
        if not has_pending:
            for m in milestones:
                if m["status"] == "upcoming":
                    m["status"] = "pending"
                    break

    await db.user_milestones.update_one(
        {"user_id": user["user_id"]}, {"$set": {"milestones": milestones}}
    )
    if granted:
        await grant_aed(user["user_id"], granted)
        await add_activity(
            user["user_id"],
            "milestone",
            f"Completed: {MILESTONE_TITLE.get(payload.milestone_id, payload.milestone_id)}",
            granted,
        )
        fresh_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
        origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
        background.add_task(
            send_milestone_done,
            user["email"],
            user["name"],
            MILESTONE_TITLE.get(payload.milestone_id, payload.milestone_id),
            granted,
            fresh_user["aed_balance"],
            origin,
        )

    # Return the freshly computed next_reward so the UI can re-render without an extra round-trip.
    fresh_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    next_reward = _compute_next_reward(milestones, fresh_user["aed_balance"])
    all_done = all(m["status"] == "completed" for m in milestones)
    return {
        "ok": True,
        "granted": granted,
        "already_completed": not just_completed,
        "next_reward": next_reward,
        "all_milestones_done": all_done,
        "aed_balance": fresh_user["aed_balance"],
        "tier": fresh_user["tier"],
    }


# -------------------- Milestone rewards --------------------
MILESTONE_REWARDS = {
    "verify_mobile": 25,
    "complete_kyc": 50,
    "attend_webinar": 25,
    "reserve_allocation": 50,
}

MILESTONE_TITLE = {
    "join_waitlist": "Join Waitlist",
    "verify_mobile": "Verify Mobile",
    "complete_kyc": "Complete KYC",
    "attend_webinar": "Attend Webinar",
    "reserve_allocation": "Reserve Allocation",
}


def _next_active_milestone(milestones: list) -> Optional[dict]:
    """First pending milestone, else first upcoming, else None."""
    for m in milestones:
        if m["status"] == "pending":
            return m
    for m in milestones:
        if m["status"] == "upcoming":
            return m
    return None


def _compute_next_reward(milestones: list, balance: int) -> dict:
    """Single source of truth for what to display in the 'Next Reward' card.

    Three states:
      - milestone: still completing the onboarding journey
      - tier: journey done, working toward the next benefits-ladder tier
      - maxed: at the Elite tier and journey complete
    """
    active = _next_active_milestone(milestones)
    if active:
        amount = MILESTONE_REWARDS.get(active["id"], 0)
        return {
            "kind": "milestone",
            "amount": amount,
            "label": MILESTONE_TITLE.get(active["id"], active["id"]),
            "milestone_id": active["id"],
            "remaining_steps": sum(1 for m in milestones if m["status"] != "completed"),
        }
    nt = next_tier_info(balance)
    if nt["remaining"] <= 0:
        return {"kind": "maxed", "amount": 0, "label": "Elite Co-Owner", "tier_name": "Elite Co-Owner"}
    return {
        "kind": "tier",
        "amount": nt["remaining"],
        "label": f"Reach {nt['name']}",
        "tier_name": nt["name"],
        "tier_threshold": nt["threshold"],
    }


# -------------------- Benefits ladder --------------------
@api.get("/benefits-ladder")
async def benefits_ladder(user: CurrentUser):
    balance = user["aed_balance"]
    current_tier = compute_tier(balance)
    next_tier = next_tier_info(balance)
    return {
        "balance": balance,
        "total_earned": balance,
        "total_used": 0,
        "current_tier": current_tier,
        "next_tier": next_tier,
        "tiers": [
            {"level": 1, "name": "Co-Owner Member", "threshold": 500, "benefits": ["Priority allocation access", "Exclusive webinars", "AED balance perks"]},
            {"level": 2, "name": "Priority Co-Owner", "threshold": 2500, "benefits": ["24-hour priority access to new allocations", "Exclusive webinars with executive team", "Better entry pricing on selected properties", "Priority room selection & allocation"]},
            {"level": 3, "name": "Co-Owner Circle", "threshold": 5000, "benefits": ["Airport transfers", "Complimentary annual stays", "Private founder briefings"]},
            {"level": 4, "name": "Elite Co-Owner", "threshold": 10000, "benefits": ["Dedicated relationship manager", "Advisory council access", "Invite-only events"]},
        ],
        "ways_to_earn": [
            {"id": "attend_webinar", "title": "Attend Webinar", "aed": 25, "icon": "calendar"},
            {"id": "invite_friend", "title": "Invite Friend", "aed": 50, "icon": "user-plus"},
            {"id": "friend_kyc", "title": "Friend Completes KYC", "aed": 100, "icon": "shield-check"},
            {"id": "reserve_allocation", "title": "Reserve Allocation", "aed": 50, "icon": "home"},
            {"id": "become_coowner", "title": "Become Co-Owner", "aed": 500, "icon": "building-2"},
        ],
    }


# -------------------- Properties --------------------
@api.get("/properties")
async def list_properties(user: CurrentUser, category: Optional[str] = None):
    query: dict = {}
    if category and category != "all":
        query["category"] = category
    props = await db.properties.find(query, {"_id": 0}).to_list(50)
    saved = await db.saved_properties.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    saved_ids = {s["property_id"] for s in saved}
    waitlisted = await db.waitlist_entries.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    waitlisted_ids = {w["property_id"] for w in waitlisted}
    for p in props:
        p["saved"] = p["id"] in saved_ids
        p["joined_waitlist"] = p["id"] in waitlisted_ids
    return {"properties": props}


class PropertyAction(BaseModel):
    property_id: str


@api.post("/properties/waitlist")
async def join_property_waitlist(payload: PropertyAction, user: CurrentUser):
    existing = await db.waitlist_entries.find_one({"user_id": user["user_id"], "property_id": payload.property_id})
    if existing:
        return {"ok": True, "already": True}
    await db.waitlist_entries.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "property_id": payload.property_id,
        "created_at": _now(),
    })
    prop = await db.properties.find_one({"id": payload.property_id}, {"_id": 0})
    if prop:
        await db.properties.update_one({"id": payload.property_id}, {"$inc": {"waitlist_count": 1}})
        await add_activity(user["user_id"], "waitlist", f"Joined waitlist for {prop['name']}", 0)
    return {"ok": True}


@api.post("/properties/save")
async def save_property(payload: PropertyAction, user: CurrentUser):
    existing = await db.saved_properties.find_one({"user_id": user["user_id"], "property_id": payload.property_id})
    if existing:
        await db.saved_properties.delete_one({"user_id": user["user_id"], "property_id": payload.property_id})
        return {"ok": True, "saved": False}
    await db.saved_properties.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "property_id": payload.property_id,
        "created_at": _now(),
    })
    return {"ok": True, "saved": True}


# -------------------- Allocation interests --------------------
@api.get("/allocation-interests")
async def get_allocation_interests(user: CurrentUser):
    cats = await db.categories.find({}, {"_id": 0}).to_list(50)
    selection = await db.user_allocation_interests.find_one({"user_id": user["user_id"]}, {"_id": 0})
    selected_ids = selection["category_ids"] if selection else []
    return {"categories": cats, "selected_ids": selected_ids}


class InterestSelection(BaseModel):
    category_ids: List[str]


@api.post("/allocation-interests")
async def save_allocation_interests(payload: InterestSelection, user: CurrentUser):
    await db.user_allocation_interests.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"category_ids": payload.category_ids, "updated_at": _now()}},
        upsert=True,
    )
    # Record an expression for each selected category (idempotent)
    for cid in payload.category_ids:
        await db.allocation_expressions.update_one(
            {"user_id": user["user_id"], "category_id": cid},
            {"$set": {"created_at": _now()}},
            upsert=True,
        )
    await add_activity(user["user_id"], "interest", "Allocation interests saved", 0)
    return {"ok": True}


# -------------------- Webinars --------------------
@api.get("/webinars")
async def list_webinars(user: CurrentUser, tab: Optional[str] = "upcoming"):
    regs = await db.webinar_registrations.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    reg_ids = {r["webinar_id"] for r in regs}
    webinars: list = []
    if tab == "registered":
        ids = list(reg_ids)
        webinars = await db.webinars.find({"id": {"$in": ids}}, {"_id": 0}).to_list(50)
    elif tab == "recorded":
        webinars = await db.webinars.find({"status": "recorded"}, {"_id": 0}).to_list(50)
    else:
        webinars = await db.webinars.find({"status": "upcoming"}, {"_id": 0}).sort("date", 1).to_list(50)
    for w in webinars:
        w["registered"] = w["id"] in reg_ids
    featured = await db.webinars.find_one({"featured": True}, {"_id": 0})
    return {
        "webinars": webinars,
        "featured": featured,
        "summary": {
            "attended": await db.webinar_registrations.count_documents({"user_id": user["user_id"], "attended": True}),
            "registered": len(reg_ids),
        },
    }


class WebinarAction(BaseModel):
    webinar_id: str


@api.post("/webinars/register")
async def register_webinar(payload: WebinarAction, user: CurrentUser):
    existing = await db.webinar_registrations.find_one({"user_id": user["user_id"], "webinar_id": payload.webinar_id})
    if existing:
        return {"ok": True, "already": True}
    await db.webinar_registrations.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "webinar_id": payload.webinar_id,
        "attended": False,
        "created_at": _now(),
    })
    wb = await db.webinars.find_one({"id": payload.webinar_id}, {"_id": 0})
    if wb:
        await db.webinars.update_one({"id": payload.webinar_id}, {"$inc": {"attendees": 1}})
        await add_activity(user["user_id"], "webinar", f"Registered for {wb['title']}", 0)
    return {"ok": True}


# -------------------- Referrals --------------------
@api.get("/referrals")
async def get_referrals(user: CurrentUser):
    referrals = await db.referrals.find({"referrer_id": user["user_id"]}, {"_id": 0}).to_list(100)
    verified = [r for r in referrals if r.get("verified")]
    kyc_done = [r for r in referrals if r.get("kyc_completed")]
    backend = os.environ.get("PUBLIC_APP_URL", "")
    link_base = backend if backend else ""
    return {
        "referral_code": user["referral_code"],
        "referral_link": f"{link_base}/?ref={user['referral_code']}" if link_base else f"https://onex.club/?ref={user['referral_code']}",
        "stats": {
            "invites_sent": len(referrals),
            "verified": len(verified),
            "kyc_completed": len(kyc_done),
            "aed_earned": len(verified) * 50 + len(kyc_done) * 100,
        },
        "missions": [
            {"id": "invite", "title": "Invite a Friend", "subtitle": "Share your link with one friend.", "aed": 50, "completed": len(referrals) >= 1},
            {"id": "verify_mobile", "title": "Friend Verifies Mobile", "subtitle": "They confirm their number.", "aed": 25, "completed": len(verified) >= 1},
            {"id": "complete_kyc", "title": "Friend Completes KYC", "subtitle": "They verify identity.", "aed": 100, "completed": len(kyc_done) >= 1},
            {"id": "attend_webinar", "title": "Friend Attends Webinar", "subtitle": "They join a OneX webinar.", "aed": 50, "completed": False},
        ],
        "referrals": referrals,
    }


class ShareLog(BaseModel):
    channel: str


@api.post("/referrals/share")
async def log_share(payload: ShareLog, user: CurrentUser):
    await db.referral_shares.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "channel": payload.channel,
        "created_at": _now(),
    })
    return {"ok": True}


# -------------------- Leaderboard --------------------
async def _user_rank(user_id: str) -> dict:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return {"rank": 0, "balance": 0}
    seed = await db.leaderboard_seed.find({}, {"_id": 0}).to_list(100)
    others = await db.users.find({"user_id": {"$ne": user_id}}, {"_id": 0}).to_list(100)
    pool = []
    for s in seed:
        pool.append({"name": s["name"], "avatar": s["avatar"], "balance": s["balance"], "referrals": s["referrals"], "tier": s["tier"], "is_user": False})
    for o in others:
        pool.append({"name": o["name"], "avatar": o.get("picture"), "balance": o["aed_balance"], "referrals": 0, "tier": o.get("tier", "Cadet"), "is_user": False})
    pool.append({"name": user["name"], "avatar": user.get("picture"), "balance": user["aed_balance"], "referrals": 0, "tier": user.get("tier", "Cadet"), "is_user": True})
    pool.sort(key=lambda x: x["balance"], reverse=True)
    rank = next((i + 1 for i, x in enumerate(pool) if x["is_user"]), len(pool))
    return {"rank": rank, "balance": user["aed_balance"], "total": len(pool)}


@api.get("/leaderboard")
async def get_leaderboard(user: CurrentUser, period: str = "weekly"):
    # Build pool combining seed leaderboard + actual users + current user
    seed = await db.leaderboard_seed.find({}, {"_id": 0}).to_list(100)
    others = await db.users.find({"user_id": {"$ne": user["user_id"]}}, {"_id": 0}).to_list(100)
    pool = []
    for s in seed:
        pool.append({"name": s["name"], "avatar": s["avatar"], "balance": s["balance"], "referrals": s["referrals"], "tier": s["tier"], "is_user": False})
    for o in others:
        pool.append({"name": o["name"], "avatar": o.get("picture"), "balance": o["aed_balance"], "referrals": 0, "tier": o.get("tier", "Cadet"), "is_user": False})
    pool.append({"name": user["name"], "avatar": user.get("picture"), "balance": user["aed_balance"], "referrals": 0, "tier": user.get("tier", "Cadet"), "is_user": True})
    # Period multiplier just to differentiate values (cosmetic)
    multiplier = {"weekly": 0.18, "monthly": 0.55, "all_time": 1.0}.get(period, 1.0)
    pool_period = [
        {**p, "balance": int(p["balance"] * multiplier) if not p["is_user"] else p["balance"]}
        for p in pool
    ]
    pool_period.sort(key=lambda x: x["balance"], reverse=True)
    for i, p in enumerate(pool_period):
        p["rank"] = i + 1
    me = next(p for p in pool_period if p["is_user"])
    return {"period": period, "podium": pool_period[:3], "list": pool_period[:30], "me": me}


# -------------------- Community updates --------------------
@api.get("/community-updates")
async def list_updates(user: CurrentUser):
    updates = await db.community_updates.find({}, {"_id": 0}).sort("published_at", -1).to_list(50)
    liked = await db.user_likes.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    saved = await db.user_saves.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    liked_ids = {lk["update_id"] for lk in liked}
    saved_ids = {s["update_id"] for s in saved}
    for u in updates:
        u["liked"] = u["id"] in liked_ids
        u["saved"] = u["id"] in saved_ids
    return {"updates": updates}


class UpdateAction(BaseModel):
    update_id: str


@api.post("/community-updates/like")
async def like_update(payload: UpdateAction, user: CurrentUser):
    existing = await db.user_likes.find_one({"user_id": user["user_id"], "update_id": payload.update_id})
    if existing:
        await db.user_likes.delete_one({"user_id": user["user_id"], "update_id": payload.update_id})
        await db.community_updates.update_one({"id": payload.update_id}, {"$inc": {"likes": -1}})
        return {"liked": False}
    await db.user_likes.insert_one({"user_id": user["user_id"], "update_id": payload.update_id, "created_at": _now()})
    await db.community_updates.update_one({"id": payload.update_id}, {"$inc": {"likes": 1}})
    return {"liked": True}


@api.post("/community-updates/save")
async def save_update(payload: UpdateAction, user: CurrentUser):
    existing = await db.user_saves.find_one({"user_id": user["user_id"], "update_id": payload.update_id})
    if existing:
        await db.user_saves.delete_one({"user_id": user["user_id"], "update_id": payload.update_id})
        return {"saved": False}
    await db.user_saves.insert_one({"user_id": user["user_id"], "update_id": payload.update_id, "created_at": _now()})
    return {"saved": True}


# -------------------- Co-owner benefits --------------------
@api.get("/co-owner-benefits")
async def co_owner_benefits(user: CurrentUser):
    items = await db.co_owner_benefits.find({}, {"_id": 0}).to_list(50)
    for it in items:
        it["unlocked"] = user["aed_balance"] >= it["unlock_threshold"]
    return {"benefits": items, "current_balance": user["aed_balance"]}


# -------------------- Support --------------------
@api.get("/support")
async def get_support(user: CurrentUser):
    faqs = await db.faqs.find({}, {"_id": 0}).to_list(50)
    return {
        "faqs": faqs,
        "specialist": {
            "name": "Layla Hassan",
            "role": "Your OneX Concierge",
            "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdCUyMHBvcnRyYWl0fGVufDB8fHx8MTc4MTI5ODk2NHww&ixlib=rb-4.1.0&q=85",
            "status": "Online",
        },
        "tier": user.get("tier", "Cadet"),
    }


class SupportMessage(BaseModel):
    message: str
    channel: str = "chat"


@api.post("/support/contact")
async def support_contact(payload: SupportMessage, user: CurrentUser):
    await db.support_messages.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "channel": payload.channel,
        "message": payload.message,
        "created_at": _now(),
    })
    return {"ok": True, "message": "Our concierge will reach out within 1 hour."}


# -------------------- Settings --------------------
DEFAULT_SETTINGS = {
    "notifications": {"email": True, "push": True, "sms": False, "weekly_digest": True},
    "preferences": {"language": "English", "currency": "AED", "timezone": "Asia/Dubai"},
    "security": {"two_factor": False, "login_alerts": True},
    "privacy": {"public_profile": False, "show_on_leaderboard": True},
}


@api.get("/settings")
async def get_settings(user: CurrentUser):
    doc = await db.user_settings.find_one({"user_id": user["user_id"]}, {"_id": 0})
    settings = doc["settings"] if doc else DEFAULT_SETTINGS
    return {"user": user, "settings": settings}


class SettingsUpdate(BaseModel):
    settings: dict
    name: Optional[str] = None


@api.put("/settings")
async def update_settings(payload: SettingsUpdate, user: CurrentUser):
    await db.user_settings.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"settings": payload.settings, "updated_at": _now()}},
        upsert=True,
    )
    if payload.name:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"name": payload.name}})
    return {"ok": True}


# -------------------- AED top-up (Stripe) --------------------
# Backend is the single source of truth for prices — never trust an amount from the client.
AED_PACKAGES = {
    "starter": {"id": "starter", "name": "Starter Pack", "aed": 250, "usd": 29.0, "tagline": "Kickstart your balance."},
    "builder": {"id": "builder", "name": "Builder Pack", "aed": 500, "usd": 55.0, "tagline": "Unlock Co-Owner Member."},
    "pro": {"id": "pro", "name": "Pro Pack", "aed": 1500, "usd": 149.0, "tagline": "Best value — most popular."},
    "elite": {"id": "elite", "name": "Elite Pack", "aed": 3000, "usd": 279.0, "tagline": "Fast-track Priority Co-Owner."},
}


class CheckoutPayload(BaseModel):
    package_id: str
    origin_url: str


@api.get("/payments/packages")
async def list_packages(user: CurrentUser):
    return {"packages": list(AED_PACKAGES.values())}


@api.get("/payments/history")
async def payment_history(user: CurrentUser, limit: int = 10):
    rows = await db.payment_transactions.find(
        {"user_id": user["user_id"], "credited": True},
        {"_id": 0},
    ).sort("credited_at", -1).to_list(max(1, min(limit, 50)))
    return {
        "transactions": [
            {
                "id": r.get("id"),
                "session_id": r["session_id"],
                "package_id": r.get("package_id"),
                "package_name": AED_PACKAGES.get(r.get("package_id"), {}).get("name", r.get("package_id", "Top-up").title()),
                "aed_amount": int(r.get("aed_amount", 0)),
                "amount_usd": float(r.get("amount_usd", 0)),
                "currency": r.get("currency", "usd"),
                "credited_at": r.get("credited_at") or r.get("updated_at") or r.get("created_at"),
            }
            for r in rows
        ]
    }


@api.post("/payments/checkout")
async def create_checkout(payload: CheckoutPayload, request: Request, user: CurrentUser):
    pkg = AED_PACKAGES.get(payload.package_id)
    if not pkg:
        raise HTTPException(status_code=400, detail="Invalid package")

    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured")

    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/benefits-ladder?session_id={{CHECKOUT_SESSION_ID}}&topup=success"
    cancel_url = f"{origin}/benefits-ladder?topup=cancel"

    req = CheckoutSessionRequest(
        amount=float(pkg["usd"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["user_id"],
            "package_id": pkg["id"],
            "aed_amount": str(pkg["aed"]),
            "source": "aed_topup",
        },
    )
    session: CheckoutSessionResponse = await stripe.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_id": session.session_id,
        "package_id": pkg["id"],
        "amount_usd": pkg["usd"],
        "aed_amount": pkg["aed"],
        "currency": "usd",
        "status": "initiated",
        "payment_status": "unpaid",
        "credited": False,
        "metadata": req.metadata,
        "created_at": _now(),
        "updated_at": _now(),
    })

    return {"url": session.url, "session_id": session.session_id, "package": pkg}


async def _credit_payment(tx: dict, origin: Optional[str] = None) -> dict:
    """Idempotent — credits AED only if not already credited."""
    if tx.get("credited"):
        return tx
    aed = int(tx["aed_amount"])
    await grant_aed(tx["user_id"], aed)
    await add_activity(
        tx["user_id"],
        "topup",
        f"AED top-up · {tx['package_id'].title()} Pack",
        aed,
    )
    await db.payment_transactions.update_one(
        {"_id": tx["_id"]},
        {"$set": {"credited": True, "credited_at": _now()}},
    )
    tx["credited"] = True

    # Best-effort receipt email (never raises on the caller).
    try:
        # `grant_aed` above already wrote the new balance — fetch fresh.
        user = await db.users.find_one({"user_id": tx["user_id"]}, {"_id": 0})
        if user and user.get("email"):
            pkg = AED_PACKAGES.get(tx["package_id"], {"name": tx["package_id"].title()})
            await send_topup_receipt(
                to=user["email"],
                name=user.get("name") or user["email"],
                package_name=pkg["name"],
                aed=aed,
                usd=float(tx.get("amount_usd", 0)),
                new_balance=user["aed_balance"],
                tier=user.get("tier", "Cadet"),
                app_url=origin or "https://onex.club",
            )
    except Exception as e:  # noqa: BLE001
        log.warning("topup receipt email failed: %s", e)
    return tx


@api.get("/payments/status/{session_id}")
async def checkout_status(session_id: str, request: Request, user: CurrentUser):
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx or tx["user_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Transaction not found")

    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url)
    stripe = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}api/webhook/stripe")
    status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)

    await db.payment_transactions.update_one(
        {"_id": tx["_id"]},
        {"$set": {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "updated_at": _now(),
        }},
    )

    if status.payment_status == "paid":
        tx = await db.payment_transactions.find_one({"_id": tx["_id"]})
        origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
        await _credit_payment(tx, origin=origin)

    fresh_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "package_id": tx.get("package_id"),
        "aed_credited": int(tx["aed_amount"]) if status.payment_status == "paid" else 0,
        "aed_balance": fresh_user["aed_balance"],
        "tier": fresh_user["tier"],
    }


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url)
    stripe = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}api/webhook/stripe")
    try:
        event = await stripe.handle_webhook(body, signature)
    except Exception as e:  # noqa: BLE001
        log.warning("stripe webhook verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event.payment_status == "paid" and event.session_id:
        tx = await db.payment_transactions.find_one({"session_id": event.session_id})
        if tx and not tx.get("credited"):
            await db.payment_transactions.update_one(
                {"_id": tx["_id"]},
                {"$set": {"status": "complete", "payment_status": "paid", "updated_at": _now()}},
            )
            tx = await db.payment_transactions.find_one({"_id": tx["_id"]})
            origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
            await _credit_payment(tx, origin=origin)
    return {"ok": True}


# -------------------- Wire app --------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
