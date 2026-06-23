"""Regression tests covering the dynamic 'Ways to get there' progress that drives
the LevelDetailModal under Co-Owner Benefits.

Validates that for each of the 4 tiers (Member / Insider / Co-Owner / Pro-Owner),
the /api/tier-progress payload + balance is sufficient to compute whether each
named action is complete or how far away it is.

Run via:  cd /app/backend && python -m pytest tests/test_tier_progress.py -v
"""
from __future__ import annotations

import os
import sys
import uuid
import pytest
import asyncio
from datetime import datetime, timezone

# Make the backend importable when running pytest from /app/backend.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Tier action targets — must match what LevelDetailModal renders for each tier.
TIER_ACTIONS = {
    "Member": [
        ("attend_webinar", 1),
        ("invite_verified", 1),
        ("invite_kyc", 1),
        ("topup_500", 500),
    ],
    "Insider": [
        ("attend_webinar_4", 4),
        ("invite_verified_5", 5),
        ("topup_2500", 2500),
        ("interest_reserved", 1),
    ],
    "Co-Owner": [
        ("invite_chain_10", 10),
        ("become_coowner", 1),
        ("topup_5000", 5000),
    ],
    "Pro-Owner": [
        ("invite_verified_20", 20),
        ("coown_2_assets", 2),
        ("topup_10000", 10000),
    ],
}


def _check(progress: dict, balance: int, key: str, target: int) -> tuple[bool, int]:
    """Returns (done, current_count) for an action key against tier-progress data."""
    if key in {"topup_500", "topup_2500", "topup_5000", "topup_10000"}:
        return balance >= target, balance
    if key == "attend_webinar":
        return progress["webinars_attended"] >= 1, progress["webinars_attended"]
    if key == "attend_webinar_4":
        return progress["webinars_attended"] >= 4, progress["webinars_attended"]
    if key == "invite_verified":
        return progress["verified_referrals"] >= 1, progress["verified_referrals"]
    if key == "invite_verified_5":
        return progress["verified_referrals"] >= 5, progress["verified_referrals"]
    if key == "invite_verified_20":
        return progress["verified_referrals"] >= 20, progress["verified_referrals"]
    if key == "invite_kyc":
        return progress["kyc_referrals"] >= 1, progress["kyc_referrals"]
    if key == "invite_chain_10":
        return progress["verified_referrals"] >= 10, progress["verified_referrals"]
    if key == "become_coowner":
        return progress["coowner_referrals"] >= 1, progress["coowner_referrals"]
    if key == "coown_2_assets":
        return progress["coowner_referrals"] >= 2, progress["coowner_referrals"]
    if key == "interest_reserved":
        return progress["interests_reserved"], int(progress["interests_reserved"])
    raise AssertionError(f"Unknown action key: {key}")


def _make_progress(balance: int = 0, **overrides) -> dict:
    base = {
        "balance": balance, "referrals": 0, "verified_referrals": 0,
        "kyc_referrals": 0, "coowner_referrals": 0,
        "webinars_attended": 0, "saved_properties": 0, "interests_reserved": False,
    }
    base.update(overrides)
    return base


# ─── Tier 1 · Member ─────────────────────────────────────────────────────────
def test_member_all_actions_pending_for_new_user():
    p = _make_progress()
    for key, target in TIER_ACTIONS["Member"]:
        done, _cur = _check(p, p["balance"], key, target)
        assert not done, f"Member · {key} should NOT be done for a fresh user"


def test_member_passes_when_all_conditions_met():
    p = _make_progress(balance=500, webinars_attended=1, verified_referrals=1, kyc_referrals=1)
    for key, target in TIER_ACTIONS["Member"]:
        done, cur = _check(p, p["balance"], key, target)
        assert done, f"Member · {key} should be done (cur={cur} target={target})"


# ─── Tier 2 · Insider ────────────────────────────────────────────────────────
def test_insider_partial_completion():
    p = _make_progress(balance=500, webinars_attended=2, verified_referrals=2)
    states = {k: _check(p, p["balance"], k, t) for k, t in TIER_ACTIONS["Insider"]}
    assert states["attend_webinar_4"][0] is False  # need 4
    assert states["invite_verified_5"][0] is False  # need 5
    assert states["topup_2500"][0] is False  # 500 < 2500
    assert states["interest_reserved"][0] is False


def test_insider_passes_when_all_conditions_met():
    p = _make_progress(balance=2500, webinars_attended=4, verified_referrals=5, interests_reserved=True)
    for key, target in TIER_ACTIONS["Insider"]:
        done, cur = _check(p, p["balance"], key, target)
        assert done, f"Insider · {key} should be done (cur={cur} target={target})"


# ─── Tier 3 · Co-Owner ───────────────────────────────────────────────────────
def test_coowner_passes_when_all_conditions_met():
    p = _make_progress(balance=5000, verified_referrals=10, coowner_referrals=1)
    for key, target in TIER_ACTIONS["Co-Owner"]:
        done, cur = _check(p, p["balance"], key, target)
        assert done, f"Co-Owner · {key} should be done (cur={cur} target={target})"


def test_coowner_blocks_when_only_balance_is_high():
    p = _make_progress(balance=5000)  # money but no referrals
    states = {k: _check(p, p["balance"], k, t) for k, t in TIER_ACTIONS["Co-Owner"]}
    assert states["topup_5000"][0] is True
    assert states["invite_chain_10"][0] is False
    assert states["become_coowner"][0] is False


# ─── Tier 4 · Pro-Owner ──────────────────────────────────────────────────────
def test_pro_owner_passes_when_all_conditions_met():
    p = _make_progress(balance=10000, verified_referrals=20, coowner_referrals=2)
    for key, target in TIER_ACTIONS["Pro-Owner"]:
        done, cur = _check(p, p["balance"], key, target)
        assert done, f"Pro-Owner · {key} should be done (cur={cur} target={target})"


# ─── End-to-end: backend endpoint shape ──────────────────────────────────────
@pytest.mark.asyncio
async def test_tier_progress_endpoint_returns_required_keys():
    """Ensures /api/tier-progress returns every key the modal needs.
    We hit MongoDB directly via the running server module."""
    from server import db, _make_referral_code  # noqa: E402

    # Synthesize a throwaway user.
    uid = f"user_test_{uuid.uuid4().hex[:8]}"
    email = f"{uid}@test.local"
    await db.users.insert_one({
        "user_id": uid, "email": email, "name": "Test User",
        "tier": "Member", "aed_balance": 750,
        "referral_code": _make_referral_code("Test User"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.referrals.insert_many([
        {"id": str(uuid.uuid4()), "referrer_id": uid, "referee_id": "x1",
         "referee_email": "x1@t.l", "verified": True, "kyc_completed": True,
         "became_coowner": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "referrer_id": uid, "referee_id": "x2",
         "referee_email": "x2@t.l", "verified": True, "kyc_completed": False,
         "became_coowner": False, "created_at": datetime.now(timezone.utc).isoformat()},
    ])
    await db.webinar_registrations.insert_many([
        {"user_id": uid, "webinar_id": "w1", "attended": True, "registered_at": "2026-01-01T00:00:00Z"},
        {"user_id": uid, "webinar_id": "w2", "attended": True, "registered_at": "2026-01-02T00:00:00Z"},
    ])

    from server import get_tier_progress  # type: ignore
    result = await get_tier_progress({"user_id": uid, "aed_balance": 750})
    assert result["balance"] == 750
    assert result["referrals"] == 2
    assert result["verified_referrals"] == 2
    assert result["kyc_referrals"] == 1
    assert result["coowner_referrals"] == 0
    assert result["webinars_attended"] == 2
    assert result["interests_reserved"] is False

    # Cleanup.
    await db.users.delete_one({"user_id": uid})
    await db.referrals.delete_many({"referrer_id": uid})
    await db.webinar_registrations.delete_many({"user_id": uid})
