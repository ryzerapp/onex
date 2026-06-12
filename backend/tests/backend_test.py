"""OneX Club backend API tests.

Covers: auth, dashboard, progress, benefits ladder, properties, allocation
interests, webinars, referrals, leaderboard, community updates, co-owner
benefits, support, settings. Uses a pre-seeded test session via Authorization
bearer token.
"""
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://exclusive-members-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
TOKEN = os.environ.get("TEST_SESSION_TOKEN", "test_session_1781303183733")
USER_ID = os.environ.get("TEST_USER_ID", "user_qa_1781303183733")


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def anon():
    return requests.Session()


# -------------------- Auth --------------------
class TestAuth:
    def test_me_unauthenticated_returns_401(self, anon):
        r = anon.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_bearer_returns_user(self, client):
        r = client.get(f"{API}/auth/me")
        assert r.status_code == 200
        u = r.json()["user"]
        for k in ["user_id", "email", "name", "tier", "aed_balance", "referral_code"]:
            assert k in u, f"missing {k}"
        assert u["user_id"] == USER_ID


# -------------------- Dashboard / Progress --------------------
class TestDashboard:
    def test_dashboard_payload(self, client):
        r = client.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ["user", "milestones", "next_milestone", "next_tier", "spotlight_property", "next_webinar", "stats", "recent_activity"]:
            assert k in d, f"missing {k}"
        assert len(d["milestones"]) == 5
        assert isinstance(d["stats"]["aed_balance"], int)

    def test_progress_payload(self, client):
        r = client.get(f"{API}/progress")
        assert r.status_code == 200
        d = r.json()
        for k in ["milestones", "percent", "completed_count", "total", "upcoming_count", "to_next_reward"]:
            assert k in d
        assert d["total"] == len(d["milestones"])

    def test_complete_milestone_grants_aed(self, client):
        before = client.get(f"{API}/auth/me").json()["user"]["aed_balance"]
        # attempt verify_mobile (worth 25). Idempotent - already-completed returns granted=0
        r = client.post(f"{API}/progress/complete", json={"milestone_id": "verify_mobile"})
        assert r.status_code == 200
        granted = r.json().get("granted", 0)
        after = client.get(f"{API}/auth/me").json()["user"]["aed_balance"]
        assert after == before + granted


# -------------------- Benefits ladder --------------------
class TestBenefitsLadder:
    def test_payload(self, client):
        r = client.get(f"{API}/benefits-ladder")
        assert r.status_code == 200
        d = r.json()
        assert d["balance"] >= 0
        assert len(d["tiers"]) == 4
        thresholds = [t["threshold"] for t in d["tiers"]]
        assert thresholds == [500, 2500, 5000, 10000]
        assert len(d["ways_to_earn"]) == 5


# -------------------- Properties --------------------
class TestProperties:
    def test_list_properties(self, client):
        r = client.get(f"{API}/properties")
        assert r.status_code == 200
        props = r.json()["properties"]
        assert len(props) == 5
        for p in props:
            for k in ["id", "name", "image", "location", "yield_low", "yield_high", "spots_available", "waitlist_count", "saved", "joined_waitlist"]:
                assert k in p

    def test_waitlist_join_and_increment(self, client):
        # use prop_business_bay_offices to avoid colliding with earlier tests
        pid = "prop_business_bay_offices"
        before = next(p for p in client.get(f"{API}/properties").json()["properties"] if p["id"] == pid)
        r = client.post(f"{API}/properties/waitlist", json={"property_id": pid})
        assert r.status_code == 200
        assert r.json().get("ok")
        after = next(p for p in client.get(f"{API}/properties").json()["properties"] if p["id"] == pid)
        if not before.get("joined_waitlist"):
            assert after["waitlist_count"] == before["waitlist_count"] + 1
        assert after["joined_waitlist"] is True

    def test_save_toggle(self, client):
        pid = "prop_dubai_marina_residences"
        r1 = client.post(f"{API}/properties/save", json={"property_id": pid})
        assert r1.status_code == 200
        first = r1.json()["saved"]
        r2 = client.post(f"{API}/properties/save", json={"property_id": pid})
        assert r2.json()["saved"] is not first


# -------------------- Allocation interests --------------------
class TestAllocationInterests:
    def test_get_categories(self, client):
        r = client.get(f"{API}/allocation-interests")
        assert r.status_code == 200
        d = r.json()
        assert len(d["categories"]) == 5

    def test_persist_selection(self, client):
        sel = ["cat_residential", "cat_airbnb"]
        r = client.post(f"{API}/allocation-interests", json={"category_ids": sel})
        assert r.status_code == 200
        d = client.get(f"{API}/allocation-interests").json()
        assert set(d["selected_ids"]) == set(sel)


# -------------------- Webinars --------------------
class TestWebinars:
    def test_upcoming(self, client):
        r = client.get(f"{API}/webinars", params={"tab": "upcoming"})
        assert r.status_code == 200
        d = r.json()
        assert len(d["webinars"]) >= 1
        assert d["featured"] is not None

    def test_recorded(self, client):
        r = client.get(f"{API}/webinars", params={"tab": "recorded"})
        assert r.status_code == 200
        d = r.json()
        assert all(w["status"] == "recorded" for w in d["webinars"])

    def test_register_idempotent(self, client):
        r1 = client.post(f"{API}/webinars/register", json={"webinar_id": "wb_yield_strategies"})
        assert r1.status_code == 200
        r2 = client.post(f"{API}/webinars/register", json={"webinar_id": "wb_yield_strategies"})
        assert r2.status_code == 200
        assert r2.json().get("already") is True


# -------------------- Referrals --------------------
class TestReferrals:
    def test_referrals_payload(self, client):
        r = client.get(f"{API}/referrals")
        assert r.status_code == 200
        d = r.json()
        for k in ["referral_code", "referral_link", "stats", "missions"]:
            assert k in d
        assert len(d["missions"]) == 4
        for sk in ["invites_sent", "verified", "kyc_completed", "aed_earned"]:
            assert sk in d["stats"]

    def test_share_log(self, client):
        r = client.post(f"{API}/referrals/share", json={"channel": "whatsapp"})
        assert r.status_code == 200
        assert r.json().get("ok") is True


# -------------------- Leaderboard --------------------
class TestLeaderboard:
    @pytest.mark.parametrize("period", ["weekly", "monthly", "all_time"])
    def test_period(self, client, period):
        r = client.get(f"{API}/leaderboard", params={"period": period})
        assert r.status_code == 200
        d = r.json()
        assert d["period"] == period
        assert len(d["podium"]) == 3
        assert len(d["list"]) <= 30
        assert d["me"]["is_user"] is True
        assert "rank" in d["me"]


# -------------------- Community updates --------------------
class TestCommunityUpdates:
    def test_list(self, client):
        r = client.get(f"{API}/community-updates")
        assert r.status_code == 200
        u = r.json()["updates"]
        assert len(u) == 4
        for it in u:
            assert "liked" in it and "saved" in it

    def test_like_toggle(self, client):
        uid = "upd_palm_launch"
        before = next(x for x in client.get(f"{API}/community-updates").json()["updates"] if x["id"] == uid)
        r = client.post(f"{API}/community-updates/like", json={"update_id": uid})
        assert r.status_code == 200
        after = next(x for x in client.get(f"{API}/community-updates").json()["updates"] if x["id"] == uid)
        assert after["liked"] is not before["liked"]
        delta = 1 if after["liked"] else -1
        assert after["likes"] == before["likes"] + delta

    def test_save_toggle(self, client):
        uid = "upd_market_insight"
        r1 = client.post(f"{API}/community-updates/save", json={"update_id": uid})
        first = r1.json()["saved"]
        r2 = client.post(f"{API}/community-updates/save", json={"update_id": uid})
        assert r2.json()["saved"] is not first


# -------------------- Co-owner benefits --------------------
class TestCoOwnerBenefits:
    def test_payload(self, client):
        r = client.get(f"{API}/co-owner-benefits")
        assert r.status_code == 200
        d = r.json()
        assert len(d["benefits"]) == 7
        for b in d["benefits"]:
            assert "unlocked" in b


# -------------------- Support --------------------
class TestSupport:
    def test_get(self, client):
        r = client.get(f"{API}/support")
        assert r.status_code == 200
        d = r.json()
        assert len(d["faqs"]) == 5
        assert "specialist" in d

    def test_contact(self, client):
        r = client.post(f"{API}/support/contact", json={"message": "TEST_hello", "channel": "chat"})
        assert r.status_code == 200
        assert r.json().get("ok") is True
        assert "message" in r.json()


# -------------------- Settings --------------------
class TestSettings:
    def test_get(self, client):
        r = client.get(f"{API}/settings")
        assert r.status_code == 200
        d = r.json()
        assert "user" in d and "settings" in d
        for k in ["notifications", "preferences", "security", "privacy"]:
            assert k in d["settings"]

    def test_put_persists(self, client):
        current = client.get(f"{API}/settings").json()["settings"]
        current["notifications"]["sms"] = True
        r = client.put(f"{API}/settings", json={"settings": current})
        assert r.status_code == 200
        again = client.get(f"{API}/settings").json()["settings"]
        assert again["notifications"]["sms"] is True


# -------------------- Logout (do at end) --------------------
class TestZLogout:
    def test_logout_clears_session(self):
        # Use a fresh session - this will actually invalidate the token!
        # Skip to avoid breaking the bearer token for further tests.
        pytest.skip("Skipped to preserve seeded session for downstream UI tests")
