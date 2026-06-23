"""OneX Club — Admin API."""
from __future__ import annotations

import os
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

# Re-import the shared helpers from server module — at runtime this works because
# server.py imports admin_routes AFTER it defines the helpers.

admin = APIRouter(prefix="/api/admin", tags=["admin"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Pydantic payloads ──────────────────────────────────────────────────────
class PropertyUpsert(BaseModel):
    id: Optional[str] = None
    name: str
    location: str
    image: str
    category: str = "luxury"
    min_investment: int = 200000
    yield_low: int = 10
    yield_high: int = 15
    spots_available: int = 0
    spots_total: int = 100
    waitlist_count: int = 0
    description: str = ""
    status: str = "Coming Soon"
    launch_date: Optional[str] = None  # ISO-8601 — drives Dashboard countdown.
    archived: bool = False


class WebinarUpsert(BaseModel):
    id: Optional[str] = None
    title: str
    description: str = ""
    image: str = ""
    starts_at: str  # ISO-8601
    duration_minutes: int = 60
    luma_url: Optional[str] = None
    recording_url: Optional[str] = None  # YouTube/Vimeo for past sessions.
    archived: bool = False


class CommunityUpdateUpsert(BaseModel):
    id: Optional[str] = None
    type: str = "launch"  # launch | webinar | community | partnership | system
    title: str
    body: str
    image: Optional[str] = None
    archived: bool = False


class BenefitToggle(BaseModel):
    benefit_id: str
    archived: bool


class AllocationArchive(BaseModel):
    interest_id: str
    archived: bool


class NudgeOne(BaseModel):
    user_id: str
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=2, max_length=4000)


class BulkBroadcast(BaseModel):
    subject: str = Field(min_length=2, max_length=200)
    message: str = Field(min_length=2, max_length=4000)
    only_tier: Optional[str] = None  # e.g. "Insider+"; None = everyone.


class AllocationOpenedBlast(BaseModel):
    property_id: str
    custom_message: Optional[str] = None  # Optional override — defaults to template.


class AdminLogin(BaseModel):
    email: str
    password: str


# ─── Password hashing helpers (bcrypt — cost=12, the OWASP-recommended default) ──
def _hash_password(plain: str) -> bytes:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12))


def _verify_password(plain: str, hashed: bytes) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed)
    except (ValueError, TypeError):
        return False


# Hash the ADMIN_PASSWORD once at module import (avoids re-hashing on every login).
_ADMIN_PWD_HASH: Optional[bytes] = None
_ADMIN_PWD_RAW = os.environ.get("ADMIN_PASSWORD", "")
if _ADMIN_PWD_RAW:
    _ADMIN_PWD_HASH = _hash_password(_ADMIN_PWD_RAW)
ADMIN_EMAILS_LIST = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "surya@onex.exchange").split(",") if e.strip()}


# ─── Helpers ────────────────────────────────────────────────────────────────
async def _send_admin_email(db, send_milestone_done, to_email: str, to_name: str,
                            subject: str, message: str, app_url: str) -> None:
    """Reuses the milestone email template for ad-hoc admin nudges — keeps the
    visual design consistent without duplicating template code."""
    # We piggyback on send_milestone_done by passing subject as the milestone_title
    # and 0 AED — ugly but ships in v1; clean template TBD in v2.
    await send_milestone_done(to_email, to_name, subject, 0, 0, app_url)


# ─── 1. Overview ────────────────────────────────────────────────────────────
async def admin_overview_impl(db) -> dict:
    users_count = await db.users.count_documents({})
    props_count = await db.properties.count_documents({"archived": {"$ne": True}})
    webinars_count = await db.webinars.count_documents({"archived": {"$ne": True}})
    referrals_count = await db.referrals.count_documents({})
    allocation_interests = await db.user_allocation_interests.count_documents({"archived": {"$ne": True}})
    waitlist_signups = await db.waitlist_signups.count_documents({})

    aed_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$reward"}}}]
    aed_agg = await db.activity_log.aggregate(aed_pipeline).to_list(1)
    total_aed_distributed = int(aed_agg[0]["total"]) if aed_agg else 0

    tier_pipeline = [{"$group": {"_id": "$tier", "count": {"$sum": 1}}}]
    by_tier = {t["_id"] or "Member": t["count"] for t in await db.users.aggregate(tier_pipeline).to_list(20)}

    # Top 5 referrers.
    ref_pipeline = [
        {"$group": {"_id": "$referrer_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    ref_agg = await db.referrals.aggregate(ref_pipeline).to_list(5)
    top_referrer_ids = [r["_id"] for r in ref_agg]
    refs_users = {u["user_id"]: u for u in await db.users.find(
        {"user_id": {"$in": top_referrer_ids}}, {"_id": 0, "user_id": 1, "name": 1, "email": 1}
    ).to_list(5)}
    top_referrers = [
        {"user_id": r["_id"], "name": refs_users.get(r["_id"], {}).get("name", "—"),
         "email": refs_users.get(r["_id"], {}).get("email"), "count": r["count"]}
        for r in ref_agg
    ]

    return {
        "users_count": users_count,
        "properties_count": props_count,
        "webinars_count": webinars_count,
        "referrals_count": referrals_count,
        "allocation_interests": allocation_interests,
        "waitlist_signups": waitlist_signups,
        "total_aed_distributed": total_aed_distributed,
        "by_tier": by_tier,
        "top_referrers": top_referrers,
    }


# ─── Build the router ───────────────────────────────────────────────────────
def build_admin_router(deps: dict) -> APIRouter:
    """Late-bind dependencies (db, send_*, _app_url) to keep this module
    importable before server.py finishes defining everything."""
    db = deps["db"]
    require_admin = deps["require_admin"]
    send_milestone_done = deps["send_milestone_done"]
    send_property_reminder_email = deps["send_property_reminder_email"]
    _app_url = deps["_app_url"]
    add_activity = deps.get("add_activity")  # noqa: F841

    @admin.get("/overview")
    async def admin_overview(_admin: dict = Depends(require_admin)) -> dict:
        return await admin_overview_impl(db)

    # ─ Admin password login ────────────────────────────────────────────────
    # Brute-force protection: 5 failed attempts in 15 min lock the {ip+email}
    # tuple. Stored in MongoDB (no Redis) — TTL index expires entries automatically.
    @admin.post("/auth/login")
    async def admin_login(payload: AdminLogin, request: Request, response: Response) -> dict:
        email = (payload.email or "").strip().lower()
        if email not in ADMIN_EMAILS_LIST:
            # Generic message — never leak whether the email is valid.
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if _ADMIN_PWD_HASH is None:
            raise HTTPException(status_code=500, detail="Admin password not configured")

        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
        ident = f"{ip}:{email}"
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
        recent_failures = await db.admin_login_attempts.count_documents({
            "ident": ident, "success": False, "at": {"$gte": cutoff.isoformat()},
        })
        if recent_failures >= 5:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")

        ok = _verify_password(payload.password, _ADMIN_PWD_HASH)
        await db.admin_login_attempts.insert_one({
            "ident": ident, "email": email, "ip": ip,
            "success": ok, "at": _now(),
        })
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Find or create the admin user record (so the rest of the app can attribute actions).
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user:
            uid = f"admin_user_{uuid.uuid4().hex[:8]}"
            user = {
                "user_id": uid, "email": email, "name": "Admin",
                "tier": "Pro-Owner", "aed_balance": 0,
                "referral_code": f"admin-{uuid.uuid4().hex[:6]}",
                "is_admin": True,
                "created_at": _now(),
            }
            await db.users.insert_one(user)
        else:
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"is_admin": True}})

        # 30-day admin session — same cookie shape as the rest of the app.
        token = f"admin_pwd_{uuid.uuid4().hex}"
        await db.user_sessions.insert_one({
            "user_id": user["user_id"], "session_token": token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),
            "is_admin": True,
            "created_at": datetime.now(timezone.utc),
        })
        response.set_cookie(
            key="session_token", value=token,
            max_age=30 * 24 * 60 * 60,
            httponly=True, secure=True, samesite="none", path="/",
        )
        return {"ok": True, "user": {"email": user["email"], "name": user.get("name"), "is_admin": True}}

    # ─ 2. Users ─────────────────────────────────────────────────────────────
    @admin.get("/users")
    async def list_users(_admin: dict = Depends(require_admin), q: Optional[str] = None,
                         tier: Optional[str] = None, limit: int = 100) -> dict:
        match: dict[str, Any] = {}
        if q:
            match["$or"] = [
                {"email": {"$regex": q, "$options": "i"}},
                {"name": {"$regex": q, "$options": "i"}},
                {"referral_code": {"$regex": q, "$options": "i"}},
            ]
        if tier:
            match["tier"] = tier
        users = await db.users.find(match, {"_id": 0}).sort("created_at", -1).limit(max(1, min(limit, 500))).to_list(limit)
        # Enrich with referral count.
        ref_counts = await db.referrals.aggregate([
            {"$group": {"_id": "$referrer_id", "count": {"$sum": 1}}},
        ]).to_list(1000)
        ref_by_user = {r["_id"]: r["count"] for r in ref_counts}
        for u in users:
            u["referrals_count"] = int(ref_by_user.get(u["user_id"], 0))
        return {"users": users, "count": len(users)}

    @admin.post("/users/{user_id}/ban")
    async def ban_user(user_id: str, _admin: dict = Depends(require_admin)) -> dict:
        await db.users.update_one({"user_id": user_id}, {"$set": {"banned": True, "banned_at": _now()}})
        await db.user_sessions.delete_many({"user_id": user_id})
        return {"ok": True, "banned": True}

    @admin.post("/users/{user_id}/unban")
    async def unban_user(user_id: str, _admin: dict = Depends(require_admin)) -> dict:
        await db.users.update_one({"user_id": user_id}, {"$set": {"banned": False}, "$unset": {"banned_at": ""}})
        return {"ok": True, "banned": False}

    # ─ 3. Properties ────────────────────────────────────────────────────────
    @admin.get("/properties")
    async def list_props(_admin: dict = Depends(require_admin), include_archived: bool = True) -> dict:
        match: dict = {} if include_archived else {"archived": {"$ne": True}}
        props = await db.properties.find(match, {"_id": 0}).to_list(500)
        return {"properties": props}

    @admin.post("/properties")
    async def upsert_property(payload: PropertyUpsert, _admin: dict = Depends(require_admin)) -> dict:
        pid = payload.id or f"prop_{uuid.uuid4().hex[:10]}"
        doc = payload.model_dump()
        doc["id"] = pid
        doc["updated_at"] = _now()
        await db.properties.update_one(
            {"id": pid},
            {"$set": doc, "$setOnInsert": {"created_at": _now()}},
            upsert=True,
        )
        return {"ok": True, "property": doc}

    @admin.delete("/properties/{property_id}")
    async def archive_property(property_id: str, _admin: dict = Depends(require_admin)) -> dict:
        # Soft-delete only — never destroy waitlist history.
        await db.properties.update_one({"id": property_id}, {"$set": {"archived": True, "archived_at": _now()}})
        return {"ok": True, "archived": True}

    # ─ 4. Webinars ──────────────────────────────────────────────────────────
    @admin.get("/webinars")
    async def admin_list_webinars(_admin: dict = Depends(require_admin), include_archived: bool = True) -> dict:
        match: dict = {} if include_archived else {"archived": {"$ne": True}}
        webs = await db.webinars.find(match, {"_id": 0}).sort("starts_at", -1).to_list(200)
        # Attach attendance counts.
        wid_list = [w["id"] for w in webs]
        att = await db.webinar_registrations.aggregate([
            {"$match": {"webinar_id": {"$in": wid_list}}},
            {"$group": {"_id": "$webinar_id", "registered": {"$sum": 1},
                        "attended": {"$sum": {"$cond": ["$attended", 1, 0]}}}},
        ]).to_list(500)
        att_by_wid = {a["_id"]: a for a in att}
        for w in webs:
            stats = att_by_wid.get(w["id"], {})
            w["registered_count"] = stats.get("registered", 0)
            w["attended_count"] = stats.get("attended", 0)
        return {"webinars": webs}

    @admin.post("/webinars")
    async def upsert_webinar(payload: WebinarUpsert, _admin: dict = Depends(require_admin)) -> dict:
        wid = payload.id or f"web_{uuid.uuid4().hex[:10]}"
        doc = payload.model_dump()
        doc["id"] = wid
        doc["updated_at"] = _now()
        await db.webinars.update_one(
            {"id": wid},
            {"$set": doc, "$setOnInsert": {"created_at": _now()}},
            upsert=True,
        )
        return {"ok": True, "webinar": doc}

    @admin.delete("/webinars/{webinar_id}")
    async def archive_webinar(webinar_id: str, _admin: dict = Depends(require_admin)) -> dict:
        await db.webinars.update_one({"id": webinar_id}, {"$set": {"archived": True, "archived_at": _now()}})
        return {"ok": True, "archived": True}

    # ─ 5. Community updates ────────────────────────────────────────────────
    @admin.get("/community-updates")
    async def admin_list_updates(_admin: dict = Depends(require_admin)) -> dict:
        items = await db.community_updates.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
        return {"items": items}

    @admin.post("/community-updates")
    async def upsert_update(payload: CommunityUpdateUpsert, _admin: dict = Depends(require_admin)) -> dict:
        uid = payload.id or f"upd_{uuid.uuid4().hex[:10]}"
        doc = payload.model_dump()
        doc["id"] = uid
        doc["updated_at"] = _now()
        await db.community_updates.update_one(
            {"id": uid},
            {"$set": doc, "$setOnInsert": {"created_at": _now(), "likes": 0, "saves": 0}},
            upsert=True,
        )
        return {"ok": True, "update": doc}

    @admin.delete("/community-updates/{update_id}")
    async def archive_update(update_id: str, _admin: dict = Depends(require_admin)) -> dict:
        await db.community_updates.update_one({"id": update_id}, {"$set": {"archived": True, "archived_at": _now()}})
        return {"ok": True, "archived": True}

    # ─ 6. Co-Owner benefits visibility ──────────────────────────────────────
    @admin.get("/benefits")
    async def admin_list_benefits(_admin: dict = Depends(require_admin)) -> dict:
        items = await db.co_owner_benefits.find({}, {"_id": 0}).to_list(200)
        return {"items": items}

    @admin.post("/benefits/toggle")
    async def toggle_benefit(payload: BenefitToggle, _admin: dict = Depends(require_admin)) -> dict:
        await db.co_owner_benefits.update_one(
            {"id": payload.benefit_id},
            {"$set": {"archived": payload.archived, "updated_at": _now()}},
        )
        return {"ok": True}

    # ─ 7. Allocation interests ─────────────────────────────────────────────
    @admin.get("/allocation-interests")
    async def admin_list_interests(_admin: dict = Depends(require_admin)) -> dict:
        items = await db.user_allocation_interests.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
        # Enrich with user email + property name.
        uids = list({i["user_id"] for i in items if i.get("user_id")})
        pids = list({i["property_id"] for i in items if i.get("property_id")})
        users = {u["user_id"]: u for u in await db.users.find({"user_id": {"$in": uids}},
                                                              {"_id": 0, "user_id": 1, "email": 1, "name": 1}).to_list(500)}
        props = {p["id"]: p for p in await db.properties.find({"id": {"$in": pids}},
                                                              {"_id": 0, "id": 1, "name": 1}).to_list(500)}
        for i in items:
            i["user_email"] = users.get(i.get("user_id"), {}).get("email")
            i["user_name"] = users.get(i.get("user_id"), {}).get("name")
            i["property_name"] = props.get(i.get("property_id"), {}).get("name")
        return {"interests": items}

    @admin.post("/allocation-interests/archive")
    async def archive_interest(payload: AllocationArchive, _admin: dict = Depends(require_admin)) -> dict:
        await db.user_allocation_interests.update_one(
            {"id": payload.interest_id},
            {"$set": {"archived": payload.archived, "updated_at": _now()}},
        )
        return {"ok": True}

    # ─ 8. Notifications ─────────────────────────────────────────────────────
    @admin.post("/notify/one")
    async def nudge_one(payload: NudgeOne, request: Request, background: BackgroundTasks,
                        _admin: dict = Depends(require_admin)) -> dict:
        u = await db.users.find_one({"user_id": payload.user_id}, {"_id": 0, "email": 1, "name": 1})
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        background.add_task(send_milestone_done, u["email"], u.get("name", "Member"),
                            payload.subject, 0, 0, _app_url(request))
        # Persist for audit.
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()), "kind": "one", "to_user_id": payload.user_id,
            "subject": payload.subject, "message": payload.message,
            "sent_at": _now(),
        })
        return {"ok": True, "sent_to": u["email"]}

    @admin.post("/notify/bulk")
    async def nudge_bulk(payload: BulkBroadcast, request: Request, background: BackgroundTasks,
                         _admin: dict = Depends(require_admin)) -> dict:
        match: dict = {"banned": {"$ne": True}}
        if payload.only_tier and payload.only_tier != "all":
            match["tier"] = payload.only_tier
        users = await db.users.find(match, {"_id": 0, "email": 1, "name": 1}).to_list(5000)
        for u in users:
            background.add_task(send_milestone_done, u["email"], u.get("name", "Member"),
                                payload.subject, 0, 0, _app_url(request))
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()), "kind": "bulk", "tier_filter": payload.only_tier,
            "subject": payload.subject, "message": payload.message,
            "recipient_count": len(users), "sent_at": _now(),
        })
        return {"ok": True, "queued": len(users)}

    @admin.post("/notify/allocation-opened")
    async def notify_allocation_opened(payload: AllocationOpenedBlast,
                                       request: Request, background: BackgroundTasks,
                                       _admin: dict = Depends(require_admin)) -> dict:
        """One-click: emails everyone with `reminder_opt_in:true` for this property
        a 'allocation just opened — your 24h priority window starts now' template."""
        prop = await db.properties.find_one({"id": payload.property_id}, {"_id": 0})
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")
        # Pull every waitlist entry that opted in to reminders.
        entries = await db.waitlist_entries.find(
            {"property_id": payload.property_id, "reminder_opt_in": True},
            {"_id": 0, "user_id": 1},
        ).to_list(10000)
        uids = [e["user_id"] for e in entries if e.get("user_id")]
        users = await db.users.find(
            {"user_id": {"$in": uids}, "banned": {"$ne": True}},
            {"_id": 0, "email": 1, "name": 1},
        ).to_list(10000)
        # Reuse the property-reminder email — it already has the right design.
        for u in users:
            background.add_task(send_property_reminder_email, u["email"],
                                u.get("name", "Member"), prop, _app_url(request))
        # Also flip the property's status so the dashboard shows "Live now".
        await db.properties.update_one(
            {"id": payload.property_id},
            {"$set": {"status": "Allocation Open", "allocation_opened_at": _now()}},
        )
        await db.admin_notifications.insert_one({
            "id": str(uuid.uuid4()), "kind": "allocation_opened",
            "property_id": payload.property_id, "recipient_count": len(users),
            "sent_at": _now(),
        })
        return {"ok": True, "queued": len(users), "property_name": prop.get("name")}

    @admin.get("/notifications/log")
    async def notifications_log(_admin: dict = Depends(require_admin)) -> dict:
        items = await db.admin_notifications.find({}, {"_id": 0}).sort("sent_at", -1).limit(100).to_list(100)
        return {"items": items}

    return admin
