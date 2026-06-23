"""Iteration 6 — Waitlist email-capture + 12-step My Progress journey.

Targets:
  - GET /api/progress returns 12 milestones with correct IDs / kind / icon
  - Auto-cascade invariant: exactly ONE pending step at any time
  - Auto-complete on data (POST /api/properties/save) bumps save_property milestone
  - Manual milestone completion via /api/progress/complete
  - POST /api/waitlist/join (PUBLIC) attribution + dedupe + invalid ref + bad email
  - GET /api/waitlist/info (PUBLIC) valid / unknown / missing
  - /api/referrals exposes stats.waitlist_signups + status=waitlist referees
  - Regression: dashboard, referrals, webinars, leaderboard still return 200
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://exclusive-members-1.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"
TOKEN = os.environ.get("TEST_SESSION_TOKEN", "test_2a912b090cba495aa681e8794bacb6fb")
REF_CODE = "surya-378738"


EXPECTED_IDS = [
    "join_waitlist", "verify_mobile", "browse_properties", "share_referral",
    "attend_webinar", "save_property", "invite_friend", "complete_kyc",
    "reserve_allocation", "friend_kyc", "join_community", "allocation_ready",
]
# Each milestone must carry a non-empty icon string; we don't enforce exact
# lucide names since the frontend has an iconMap and the contract is just
# "there is an icon".
MANUAL_IDS = {"verify_mobile", "attend_webinar", "complete_kyc", "reserve_allocation"}


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def anon():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------------------- 12-step progress --------------------
class TestProgress12Steps:
    def test_progress_returns_12_milestones_with_correct_shape(self, client):
        r = client.get(f"{API}/progress")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["total"] == 12, f"expected total=12, got {data['total']}"
        ms = data["milestones"]
        assert len(ms) == 12
        ids = [m["id"] for m in ms]
        assert ids == EXPECTED_IDS, f"order mismatch: {ids}"
        for m in ms:
            assert m["kind"] in {"auto", "manual"}, m
            assert isinstance(m.get("icon"), str) and m["icon"], f"missing icon for {m['id']}"
            if m["id"] in MANUAL_IDS:
                assert m["kind"] == "manual", f"{m['id']} should be manual, got {m['kind']}"

    def test_cascade_exactly_one_pending(self, client):
        r = client.get(f"{API}/progress")
        assert r.status_code == 200
        ms = r.json()["milestones"]
        pending = [m for m in ms if m["status"] == "pending"]
        assert len(pending) <= 1, f"expected <=1 pending, got {len(pending)}: {[m['id'] for m in pending]}"
        # If anything is non-completed, the FIRST non-completed must be pending and rest upcoming.
        non_done = [m for m in ms if m["status"] != "completed"]
        if non_done:
            assert non_done[0]["status"] == "pending", non_done[0]
            for m in non_done[1:]:
                assert m["status"] == "upcoming", m

    def test_progress_counts_consistent(self, client):
        r = client.get(f"{API}/progress")
        d = r.json()
        ms = d["milestones"]
        completed = sum(1 for m in ms if m["status"] == "completed")
        assert d.get("completed_count", d.get("completed")) == completed
        assert d["total"] == 12
        assert 0 <= d["percent"] <= 100


# -------------------- Auto-complete on data --------------------
class TestAutoCompleteOnData:
    def test_save_property_triggers_milestone(self, client):
        # Pull baseline
        prog0 = client.get(f"{API}/progress").json()
        m0 = next(m for m in prog0["milestones"] if m["id"] == "save_property")
        dash0 = client.get(f"{API}/dashboard").json()
        bal0 = dash0["stats"]["aed_balance"]

        prop_id = f"TEST_prop_{uuid.uuid4().hex[:8]}"
        try:
            # POST /api/properties/save inserts a row in saved_properties for this user
            r = client.post(f"{API}/properties/save", json={"property_id": prop_id})
            assert r.status_code == 200, r.text
            assert r.json().get("saved") is True

            prog1 = client.get(f"{API}/progress").json()
            m1 = next(m for m in prog1["milestones"] if m["id"] == "save_property")
            bal1 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]

            assert m1["status"] == "completed", m1
            # If it wasn't already completed, +AED 15 should have been credited.
            if m0["status"] != "completed":
                assert bal1 - bal0 >= 15, f"expected +15 AED for save_property, got {bal1 - bal0}"
        finally:
            # cleanup — toggle off (delete the saved row)
            client.post(f"{API}/properties/save", json={"property_id": prop_id})


# -------------------- Manual milestone --------------------
class TestManualMilestone:
    def test_complete_attend_webinar_if_pending(self, client):
        prog = client.get(f"{API}/progress").json()
        m = next(m for m in prog["milestones"] if m["id"] == "attend_webinar")
        if m["status"] == "completed":
            pytest.skip("attend_webinar already completed for the seeded test user")
        if m["status"] == "upcoming":
            pytest.skip("attend_webinar is locked — pending step is elsewhere")
        bal0 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        r = client.post(f"{API}/progress/complete", json={"milestone_id": "attend_webinar"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("granted") == 25, body
        bal1 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        assert bal1 - bal0 == 25


# -------------------- Public waitlist signup --------------------
class TestWaitlistPublic:
    def test_join_success_credits_referrer(self, anon, client):
        bal0 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        email = f"fresh-test-{uuid.uuid4().hex[:8]}@example.com"
        r = anon.post(f"{API}/waitlist/join", json={"email": email, "ref": REF_CODE, "source": "framer"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body.get("already") in (False, None)
        assert body.get("referrer_name") == "Surya", body
        assert "message" in body
        bal1 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        assert bal1 - bal0 == 25, f"referrer should gain +25 AED, got {bal1 - bal0}"

    def test_join_duplicate_does_not_double_credit(self, anon, client):
        email = f"dup-test-{uuid.uuid4().hex[:8]}@example.com"
        first = anon.post(f"{API}/waitlist/join", json={"email": email, "ref": REF_CODE})
        assert first.status_code == 200
        bal0 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        second = anon.post(f"{API}/waitlist/join", json={"email": email, "ref": REF_CODE})
        assert second.status_code == 200
        body = second.json()
        assert body.get("already") is True, body
        bal1 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        assert bal1 == bal0, "dedup should NOT re-credit referrer"

    def test_join_invalid_ref_still_records_no_credit(self, anon, client):
        bal0 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        email = f"badref-{uuid.uuid4().hex[:8]}@example.com"
        r = anon.post(f"{API}/waitlist/join", json={"email": email, "ref": "this-ref-does-not-exist-xyz"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["ok"] is True
        assert body.get("referrer_name") in (None, ""), body
        bal1 = client.get(f"{API}/dashboard").json()["stats"]["aed_balance"]
        assert bal1 == bal0, "no-ref or invalid ref must NOT credit anyone"

    def test_join_malformed_email_returns_400(self, anon):
        r = anon.post(f"{API}/waitlist/join", json={"email": "not-an-email", "ref": REF_CODE})
        assert r.status_code == 400, r.text
        detail = r.json().get("detail", "")
        assert "valid email" in detail.lower(), detail


class TestWaitlistInfo:
    def test_info_valid_ref(self, anon):
        r = anon.get(f"{API}/waitlist/info", params={"ref": REF_CODE})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("valid") is True
        assert body.get("referrer_name") == "Surya"
        assert "referrer_avatar" in body

    def test_info_unknown_ref(self, anon):
        r = anon.get(f"{API}/waitlist/info", params={"ref": "unknown-ref-xyz"})
        assert r.status_code == 200
        assert r.json().get("valid") is False

    def test_info_no_ref(self, anon):
        r = anon.get(f"{API}/waitlist/info")
        assert r.status_code == 200
        assert r.json().get("valid") is False


# -------------------- /api/referrals waitlist stats --------------------
class TestReferralsWaitlistView:
    def test_referrals_exposes_waitlist_signups(self, anon, client):
        # Ensure at least one waitlist signup exists attributed to our referrer.
        email = f"wl-stat-{uuid.uuid4().hex[:8]}@example.com"
        anon.post(f"{API}/waitlist/join", json={"email": email, "ref": REF_CODE, "source": "framer"})

        r = client.get(f"{API}/referrals")
        assert r.status_code == 200, r.text
        data = r.json()
        stats = data["stats"]
        assert "waitlist_signups" in stats, stats
        assert stats["waitlist_signups"] >= 1
        # Find at least one referee with status == 'waitlist' and aed_earned=25, tier='Waitlist'
        referees = data.get("referees") or data.get("rows") or data.get("friends") or []
        # The endpoint may key referees differently — try common keys
        if not referees:
            for k in ("referees", "rows", "friends", "list", "items"):
                if k in data and isinstance(data[k], list):
                    referees = data[k]
                    break
        # The actual key in server.py is computed but returned implicitly — look for any list with status='waitlist'
        if not referees:
            # fallback: scan all list-valued keys
            for v in data.values():
                if isinstance(v, list) and v and isinstance(v[0], dict) and "status" in v[0]:
                    referees = v
                    break
        assert any(r.get("status") == "waitlist" for r in referees), \
            f"expected at least one referee with status='waitlist' in {list(data.keys())}"
        wl = [r for r in referees if r.get("status") == "waitlist"]
        for w in wl:
            assert w.get("aed_earned") == 25
            assert w.get("tier") == "Waitlist"


# -------------------- Regression --------------------
class TestNoRegression:
    @pytest.mark.parametrize("path", [
        "/dashboard", "/referrals", "/webinars", "/leaderboard",
    ])
    def test_endpoint_200(self, client, path):
        r = client.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"
        body = r.json()
        assert isinstance(body, dict) or isinstance(body, list)
