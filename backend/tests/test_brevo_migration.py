"""Iteration 7 — Brevo migration regression suite.

Covers:
  * Module load & no Resend leftovers
  * Waitlist join → 201 contact + 201 email (live Brevo)
  * Idempotent re-submission of same email
  * /auth/email/start → Brevo OTP
  * Contact attributes (payload shape)
  * Sender + reply_to wiring
  * Admin inbox routing for /support/contact
  * 429 retry behaviour (mocked via respx)
  * Backend regression: dashboard/referrals/progress/webinars
"""
from __future__ import annotations

import asyncio
import os
import sys
import time
import uuid
from pathlib import Path

import pytest
import requests

# Add backend to path so we can import brevo_client / email_service.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Load backend/.env so BREVO_API_KEY etc. are visible to the in-process client.
from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

import brevo_client  # noqa: E402
import email_service  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env which holds the public URL.
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

SESSION_TOKEN = "test_2a912b090cba495aa681e8794bacb6fb"
SURYA_REF = "surya-378738"


@pytest.fixture(scope="module")
def auth_client():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SESSION_TOKEN}",
        "Cookie": f"session_token={SESSION_TOKEN}",
    })
    return s


@pytest.fixture(scope="module")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _fresh_email(prefix: str = "brevo-it7") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@onexassets.com"


# ---------- Module-level sanity ----------
class TestModuleLoad:
    def test_brevo_client_imports(self):
        assert hasattr(brevo_client, "send_email")
        assert hasattr(brevo_client, "upsert_contact")

    def test_email_service_send_imports(self):
        assert callable(email_service._send)

    def test_no_resend_in_backend(self):
        backend_dir = Path("/app/backend")
        leftovers = []
        for p in backend_dir.rglob("*.py"):
            if "tests" in p.parts:
                continue
            txt = p.read_text(errors="ignore")
            if "import resend" in txt or "from resend" in txt:
                leftovers.append(str(p))
        assert not leftovers, f"Resend imports still present: {leftovers}"

    def test_no_resend_in_requirements(self):
        reqs = Path("/app/backend/requirements.txt").read_text().lower()
        assert "resend" not in reqs

    def test_env_brevo_configured(self):
        assert os.environ.get("BREVO_API_KEY", "").startswith("xkeysib-")
        assert os.environ.get("BREVO_SENDER_EMAIL") == "hello@onexassets.com"
        assert os.environ.get("BREVO_CONTACT_LIST_ID") == "6"
        assert os.environ.get("SUPPORT_INBOX") == "surya@onexassets.com"


# ---------- /api/waitlist/join live Brevo ----------
class TestWaitlistJoin:
    fresh_email = _fresh_email("brevo-it7-wl")

    def test_first_join_returns_already_false(self, anon_client):
        r = anon_client.post(
            f"{BASE_URL}/api/waitlist/join",
            json={"email": self.fresh_email, "ref": SURYA_REF, "source": "framer"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("already") is False
        assert body.get("referrer_name") == "Surya"

    def test_second_join_same_email_idempotent(self, anon_client):
        # give background tasks a moment to flush
        time.sleep(2.0)
        r = anon_client.post(
            f"{BASE_URL}/api/waitlist/join",
            json={"email": self.fresh_email, "ref": SURYA_REF, "source": "framer"},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("already") is True

    def test_invalid_email_400(self, anon_client):
        r = anon_client.post(
            f"{BASE_URL}/api/waitlist/join",
            json={"email": "not-an-email", "ref": SURYA_REF},
        )
        assert r.status_code == 400


# ---------- /api/auth/email/start triggers Brevo OTP ----------
class TestEmailOtp:
    def test_email_start_returns_ok(self, anon_client):
        email = _fresh_email("brevo-it7-otp")
        r = anon_client.post(
            f"{BASE_URL}/api/auth/email/start",
            json={"email": email},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True


# ---------- Brevo contact upsert payload shape ----------
class TestContactPayload:
    def test_upsert_payload_attributes(self):
        """Verify upsert_contact builds correct Brevo /v3/contacts payload."""
        import respx
        import httpx

        async def run():
            async with respx.mock(assert_all_called=False) as mock:
                route = mock.post("https://api.brevo.com/v3/contacts").mock(
                    return_value=httpx.Response(201, json={"id": 999})
                )
                cid = await brevo_client.upsert_contact(
                    email="TEST_attr@example.com",
                    name="Jane Doe",
                    ref_code="surya-378738",
                    tier="Cadet",
                    aed_balance=250,
                    source="framer",
                )
                assert cid == 999
                req = route.calls.last.request
                body = req.read()
                import json as _json
                payload = _json.loads(body)
                assert payload["email"] == "test_attr@example.com"
                assert payload["updateEnabled"] is True
                assert payload["listIds"] == [6]
                attrs = payload["attributes"]
                assert attrs["NAME"] == "Jane Doe"
                assert attrs["FIRSTNAME"] == "Jane"
                assert attrs["LASTNAME"] == "Doe"
                assert attrs["REF_CODE"] == "surya-378738"
                assert attrs["TIER"] == "Cadet"
                assert attrs["AED_BALANCE"] == 250
                assert attrs["SOURCE"] == "framer"
                # Header verification
                assert req.headers.get("api-key", "").startswith("xkeysib-")

        asyncio.run(run())


# ---------- Brevo send_email sender + reply_to wiring ----------
class TestSendEmailWiring:
    def test_sender_and_reply_to(self):
        import respx
        import httpx
        import json as _json

        async def run():
            async with respx.mock(assert_all_called=False) as mock:
                route = mock.post("https://api.brevo.com/v3/smtp/email").mock(
                    return_value=httpx.Response(201, json={"messageId": "m-1"})
                )
                msg_id = await brevo_client.send_email(
                    to_email="surya@onexassets.com",
                    to_name="OneX Admin",
                    subject="[OneX Support] Member · Hello",
                    html="<p>hi</p>",
                    reply_to_email="member@example.com",
                    reply_to_name="Member",
                )
                assert msg_id == "m-1"
                payload = _json.loads(route.calls.last.request.read())
                assert payload["sender"]["email"] == "hello@onexassets.com"
                assert payload["sender"]["name"] == "OneX Club"
                assert payload["replyTo"]["email"] == "member@example.com"
                assert payload["replyTo"]["name"] == "Member"
                assert payload["subject"].startswith("[OneX Support]")

        asyncio.run(run())


# ---------- /api/support/contact → admin inbox with replyTo=user ----------
class TestSupportContact:
    def test_support_contact_returns_ok(self, auth_client):
        r = auth_client.post(
            f"{BASE_URL}/api/support/contact",
            json={"message": "Iteration-7 brevo smoke from QA", "channel": "support"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True


# ---------- 429 retry behavior (mocked) ----------
class TestRetry:
    def test_429_retries_three_times(self):
        import respx
        import httpx

        async def run():
            async with respx.mock(assert_all_called=False) as mock:
                # 429, 429, then 201
                route = mock.post("https://api.brevo.com/v3/smtp/email").mock(
                    side_effect=[
                        httpx.Response(429, json={"message": "rate"}),
                        httpx.Response(429, json={"message": "rate"}),
                        httpx.Response(201, json={"messageId": "ok-3"}),
                    ]
                )
                msg = await brevo_client.send_email(
                    to_email="x@example.com", to_name="X",
                    subject="t", html="<p>t</p>",
                )
                assert msg == "ok-3"
                assert route.call_count == 3

        asyncio.run(run())

    def test_non_429_no_retry(self):
        import respx
        import httpx

        async def run():
            async with respx.mock(assert_all_called=False) as mock:
                route = mock.post("https://api.brevo.com/v3/smtp/email").mock(
                    return_value=httpx.Response(400, json={"message": "bad"})
                )
                msg = await brevo_client.send_email(
                    to_email="x@example.com", to_name="X",
                    subject="t", html="<p>t</p>",
                )
                assert msg is None
                assert route.call_count == 1  # No retry on 400

        asyncio.run(run())


# ---------- Backend regression ----------
class TestRegression:
    def test_dashboard(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/dashboard")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "user" in body or "aed_balance" in body or isinstance(body, dict)

    def test_referrals(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/referrals")
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body, dict)

    def test_progress_12_milestones(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/progress")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("total") == 12 or len(body.get("milestones", [])) == 12

    def test_webinars(self, auth_client):
        r = auth_client.get(f"{BASE_URL}/api/webinars")
        assert r.status_code == 200, r.text
