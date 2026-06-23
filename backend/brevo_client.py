"""Thin Brevo (formerly Sendinblue) REST client.

Brevo exposes a simple JSON REST API; using `httpx` directly keeps our footprint
small and lets us reuse the same `BackgroundTasks` pattern we already had with
Resend. Two surfaces are used:
  • POST /v3/smtp/email        — send a transactional email (HTML + replyTo).
  • POST /v3/contacts          — upsert a contact and add it to a list.

All calls are best-effort: failures are logged but never raise — emails and
CRM sync must never block the primary HTTP flow.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import httpx

log = logging.getLogger("onex.brevo")

_BASE = "https://api.brevo.com/v3"
_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


def _api_key() -> Optional[str]:
    return os.environ.get("BREVO_API_KEY")


def _sender() -> dict:
    return {
        "email": os.environ.get("BREVO_SENDER_EMAIL", "hello@onexassets.com"),
        "name":  os.environ.get("BREVO_SENDER_NAME",  "OneX Club"),
    }


def _list_id() -> Optional[int]:
    raw = os.environ.get("BREVO_CONTACT_LIST_ID", "").strip().lstrip("#")
    return int(raw) if raw.isdigit() else None


async def send_email(
    *,
    to_email: str,
    to_name: str,
    subject: str,
    html: str,
    reply_to_email: Optional[str] = None,
    reply_to_name: Optional[str] = None,
    headers: Optional[dict] = None,
) -> Optional[str]:
    """Send a transactional HTML email via Brevo. Returns the messageId on success."""
    key = _api_key()
    if not key:
        log.warning("BREVO_API_KEY not set — skipping email '%s'", subject)
        return None

    payload: dict = {
        "sender": _sender(),
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html,
    }
    if reply_to_email:
        payload["replyTo"] = {"email": reply_to_email, "name": reply_to_name or "OneX Concierge"}
    if headers:
        payload["headers"] = headers

    # Brevo's free tier is generous but bursts can hit short rate-limits — retry
    # transient 429s twice with a short backoff.
    delays = (0, 0.4, 1.2)
    last: Optional[Exception] = None
    for attempt, delay in enumerate(delays, start=1):
        if delay:
            await asyncio.sleep(delay)
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.post(
                    f"{_BASE}/smtp/email",
                    headers={"api-key": key, "Content-Type": "application/json", "Accept": "application/json"},
                    json=payload,
                )
            if r.status_code in (200, 201, 202):
                msg_id = (r.json() or {}).get("messageId")
                log.info("brevo email sent id=%s to=%s subject=%s attempt=%d", msg_id, to_email, subject, attempt)
                return msg_id
            if r.status_code == 429:
                log.warning("brevo rate-limited (attempt %d) to=%s", attempt, to_email)
                continue
            log.error("brevo email failed status=%s to=%s body=%s", r.status_code, to_email, r.text[:300])
            return None
        except Exception as e:  # noqa: BLE001
            last = e
            log.warning("brevo email exception attempt=%d to=%s: %s", attempt, to_email, e)
    log.exception("brevo email gave up to=%s subject=%s after %d attempts: %s", to_email, subject, len(delays), last)
    return None


async def upsert_contact(
    *,
    email: str,
    name: Optional[str] = None,
    ref_code: Optional[str] = None,
    tier: Optional[str] = None,
    aed_balance: Optional[int] = None,
    source: str = "app",
    extra_attrs: Optional[dict] = None,
) -> Optional[int]:
    """Create-or-update a contact in Brevo and add it to BREVO_CONTACT_LIST_ID.

    Uses `updateEnabled=true` so re-submissions never throw a duplicate-email 400.
    Returns the Brevo contact id on success (or None on best-effort failure).
    """
    key = _api_key()
    if not key:
        log.warning("BREVO_API_KEY not set — skipping CRM upsert for %s", email)
        return None

    attributes = {"SOURCE": source}
    if name:
        attributes["NAME"] = name
        # Split into first/last for any default templates that expect those.
        parts = name.strip().split(None, 1)
        attributes["FIRSTNAME"] = parts[0]
        if len(parts) > 1:
            attributes["LASTNAME"] = parts[1]
    if ref_code:
        attributes["REF_CODE"] = ref_code
    if tier:
        attributes["TIER"] = tier
    if aed_balance is not None:
        attributes["AED_BALANCE"] = int(aed_balance)
    if extra_attrs:
        attributes.update(extra_attrs)

    payload: dict = {
        "email": email.strip().lower(),
        "attributes": attributes,
        "updateEnabled": True,
    }
    lid = _list_id()
    if lid:
        payload["listIds"] = [lid]

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.post(
                f"{_BASE}/contacts",
                headers={"api-key": key, "Content-Type": "application/json", "Accept": "application/json"},
                json=payload,
            )
        if r.status_code in (200, 201, 204):
            contact_id = (r.json() or {}).get("id") if r.content else None
            log.info("brevo contact upserted id=%s email=%s list=%s", contact_id, email, lid)
            return contact_id
        # Brevo returns 400 with "Contact already exist" when updateEnabled isn't honoured —
        # we set it explicitly, so any 400 here is something else worth logging fully.
        log.error("brevo contact upsert failed status=%s email=%s body=%s", r.status_code, email, r.text[:300])
        return None
    except Exception as e:  # noqa: BLE001
        log.exception("brevo contact upsert exception for %s: %s", email, e)
        return None
