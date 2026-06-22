"""Iteration 8 — Tier rename + Activity page regression.

Validates:
  • /api/benefits-ladder has the new 4-tier shape (Member/Insider/Co-Owner/Pro-Owner) in the right order with thresholds.
  • /api/co-owner-benefits unlock_tier values are all canonical (no Partner/Inner Circle/Founder/Cadet).
  • /api/leaderboard tiers are canonical.
  • /api/dashboard returns user.tier as one of the canonical four.
  • /api/activity returns { items: [...], summary: { count, aed_earned_visible } } with item.id/kind/title/reward/created_at.
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://exclusive-members-1.preview.emergentagent.com").rstrip("/")
TOKEN = "test_2a912b090cba495aa681e8794bacb6fb"
CANONICAL = {"Member", "Insider", "Co-Owner", "Pro-Owner"}
LEGACY = {"Partner", "Inner Circle", "Founder", "Cadet", "Co-Owner Member",
          "Priority Co-Owner", "Co-Owner Circle", "Elite Co-Owner"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    return s


def test_benefits_ladder_canonical_tiers(client):
    r = client.get(f"{BASE_URL}/api/benefits-ladder")
    assert r.status_code == 200, r.text
    data = r.json()
    tiers = data.get("tiers") or data.get("ladder") or []
    # Tolerate either {tiers:[...]} or {ladder:[...]} shape — verify we found a list.
    assert isinstance(tiers, list) and len(tiers) >= 4, f"unexpected shape: {data}"
    names = [t.get("name") for t in tiers]
    thresholds = [t.get("threshold") for t in tiers]
    assert names[:4] == ["Member", "Insider", "Co-Owner", "Pro-Owner"], names
    assert thresholds[:4] == [500, 2500, 5000, 10000], thresholds
    # current_tier / next_tier validation
    current_tier = data.get("current_tier")
    next_tier = data.get("next_tier")
    assert current_tier in CANONICAL, current_tier
    if next_tier is not None:
        nname = next_tier.get("name") if isinstance(next_tier, dict) else next_tier
        # Allow either canonical name or special maxed-out label.
        assert nname in CANONICAL or nname in {"Pro-Owner", None}, nname


def test_co_owner_benefits_no_legacy(client):
    r = client.get(f"{BASE_URL}/api/co-owner-benefits", params={"limit": 500})
    assert r.status_code == 200, r.text
    body = r.json()
    items = body.get("benefits") or body.get("items") if isinstance(body, dict) else body
    assert items, f"no benefits returned: {body}"
    for b in items:
        ut = b.get("unlock_tier")
        assert ut in CANONICAL, f"benefit {b.get('id') or b.get('title')} has legacy unlock_tier={ut}"
        assert ut not in LEGACY


def test_leaderboard_no_legacy_tiers(client):
    r = client.get(f"{BASE_URL}/api/leaderboard", params={"range": "all"})
    assert r.status_code == 200, r.text
    data = r.json()
    rows = data.get("entries") or data.get("rows") or data.get("leaderboard") or data
    if isinstance(data, dict) and "entries" not in data and "rows" not in data and "leaderboard" not in data:
        # Try list-of-list pattern
        for k, v in data.items():
            if isinstance(v, list):
                rows = v
                break
    assert isinstance(rows, list) and rows, f"no leaderboard rows: {data}"
    for row in rows:
        tier = row.get("tier")
        assert tier in CANONICAL, f"row {row.get('name')} has tier={tier}"
        assert tier not in LEGACY


def test_dashboard_user_tier_canonical(client):
    r = client.get(f"{BASE_URL}/api/dashboard")
    assert r.status_code == 200, r.text
    data = r.json()
    user = data.get("user") or data
    tier = user.get("tier") if isinstance(user, dict) else None
    assert tier in CANONICAL, f"dashboard user.tier={tier}"


def test_activity_endpoint_shape(client):
    r = client.get(f"{BASE_URL}/api/activity", params={"limit": 50})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data and "summary" in data, data.keys()
    items = data["items"]
    summary = data["summary"]
    assert isinstance(items, list)
    assert "count" in summary and "aed_earned_visible" in summary
    assert summary["count"] == len(items)
    if items:
        first = items[0]
        # Required fields per request
        for f in ("kind", "title", "created_at"):
            assert f in first, f"missing {f} in activity item: {first}"
        # reward present (could be 0)
        assert "reward" in first
        # id may be optional; flag if missing on every item
        if not any("id" in it for it in items):
            pytest.fail("no 'id' field present in any activity item")


def test_activity_limit_clamp(client):
    r = client.get(f"{BASE_URL}/api/activity", params={"limit": 5})
    assert r.status_code == 200
    data = r.json()
    assert len(data["items"]) <= 5
