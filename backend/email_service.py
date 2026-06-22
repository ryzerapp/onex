"""Resend transactional emails.

All sends run inside ``asyncio.to_thread`` so we never block the FastAPI event loop.
Send failures are logged but never raise — emails are best-effort, never a
hard dependency of a transactional flow.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import resend

log = logging.getLogger("onex.email")

_BRAND_GOLD = "#8CFF2E"
_BG = "#0A0A0B"
_SURFACE = "#15161A"
_BORDER = "#27272A"
_TEXT = "#FFFFFF"
_DIM = "#A1A1AA"


def _configure_once() -> bool:
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        return False
    resend.api_key = key
    return True


def _shell(title: str, intro: str, body_html: str, cta_label: Optional[str] = None, cta_url: Optional[str] = None) -> str:
    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
        <tr><td align="center" style="padding:8px 32px 32px;">
          <a href="{cta_url}" style="display:inline-block;background:{_BRAND_GOLD};color:{_BG};text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:14px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">{cta_label} →</a>
        </td></tr>
        """
    return f"""<!doctype html>
<html><body style="margin:0;background:{_BG};font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:{_TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_BG};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:{_SURFACE};border:1px solid {_BORDER};border-radius:24px;overflow:hidden;">
        <tr><td style="padding:32px 32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="background:{_BRAND_GOLD};width:48px;height:48px;border-radius:14px;font-weight:700;color:{_BG};text-align:center;font-size:18px;line-height:48px;">1X</td>
            <td style="padding-left:12px;">
              <div style="color:{_TEXT};font-size:16px;font-weight:600;line-height:1;">OneX <span style="color:{_BRAND_GOLD};">Club</span></div>
              <div style="color:{_DIM};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;padding-top:6px;">Dubai · Assets</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:8px 32px 0;">
          <h1 style="margin:0;color:{_TEXT};font-size:28px;line-height:1.15;font-weight:600;letter-spacing:-0.01em;">{title}</h1>
          <p style="color:{_DIM};font-size:14px;line-height:1.6;margin:12px 0 0;">{intro}</p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px;">{body_html}</td></tr>
        {cta_block}
        <tr><td style="padding:24px 32px 32px;border-top:1px solid {_BORDER};color:{_DIM};font-size:11px;line-height:1.6;">
          You're receiving this because you joined OneX Club. Manage preferences in <span style="color:{_BRAND_GOLD};">Settings → Notifications</span>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


async def _send(to: str, subject: str, html: str) -> Optional[str]:
    if not _configure_once():
        log.warning("RESEND_API_KEY not set — skipping email '%s'", subject)
        return None
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    params = {"from": f"OneX Club <{sender}>", "to": [to], "subject": subject, "html": html}
    try:
        resp = await asyncio.to_thread(resend.Emails.send, params)
        email_id = resp.get("id") if isinstance(resp, dict) else None
        log.info("email sent id=%s to=%s subject=%s", email_id, to, subject)
        return email_id
    except Exception as e:  # noqa: BLE001
        log.exception("resend send failed to=%s subject=%s: %s", to, subject, e)
        return None


# -------------------- Template helpers --------------------
async def send_welcome(to: str, name: str, app_url: str) -> Optional[str]:
    body = f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;border:1px solid {_BORDER};border-radius:16px;">
      <tr><td style="padding:20px;">
        <div style="color:{_BRAND_GOLD};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Welcome aboard</div>
        <div style="color:{_TEXT};font-size:18px;font-weight:600;padding-top:8px;">You're in, {name.split(' ')[0]}.</div>
        <div style="color:{_DIM};font-size:13px;padding-top:6px;line-height:1.6;">Your priority access to Dubai's most exclusive co-ownership opportunities just started. Five flagship launches. Curated by OneX. Reserved for members.</div>
      </td></tr>
    </table>
    """
    return await _send(
        to=to,
        subject="Welcome to OneX Club — your access is live",
        html=_shell(
            title=f"Welcome to OneX Club, {name.split(' ')[0]}.",
            intro="Your invitation is active. Complete your onboarding to unlock the Benefits Ladder.",
            body_html=body,
            cta_label="Open my dashboard",
            cta_url=f"{app_url.rstrip('/')}/dashboard",
        ),
    )


async def send_topup_receipt(to: str, name: str, package_name: str, aed: int, usd: float, new_balance: int, tier: str, app_url: str) -> Optional[str]:
    body = f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;border:1px solid {_BORDER};border-radius:16px;">
      <tr><td style="padding:24px;">
        <div style="color:{_BRAND_GOLD};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Receipt · {package_name}</div>
        <div style="color:{_TEXT};font-size:32px;font-weight:600;padding-top:12px;letter-spacing:-0.01em;">+ AED {aed:,}</div>
        <div style="color:{_DIM};font-size:13px;padding-top:6px;">${usd:.2f} USD charged · processed by Stripe</div>
      </td></tr>
      <tr><td style="padding:0 24px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid {_BORDER};">
          <tr>
            <td style="padding:14px 0;color:{_DIM};font-size:12px;">New AED Balance</td>
            <td style="padding:14px 0;color:{_BRAND_GOLD};font-size:14px;font-weight:600;text-align:right;">AED {new_balance:,}</td>
          </tr>
          <tr>
            <td style="padding:14px 0;color:{_DIM};font-size:12px;border-top:1px solid {_BORDER};">Current Tier</td>
            <td style="padding:14px 0;color:{_TEXT};font-size:14px;font-weight:600;text-align:right;border-top:1px solid {_BORDER};">{tier}</td>
          </tr>
        </table>
      </td></tr>
    </table>
    """
    return await _send(
        to=to,
        subject=f"OneX top-up receipt · +AED {aed:,}",
        html=_shell(
            title=f"Top-up confirmed — you've added AED {aed:,}.",
            intro="Every AED you hold reduces your effective entry on every future Dubai allocation. We've added your purchase to your balance.",
            body_html=body,
            cta_label="View Benefits Ladder",
            cta_url=f"{app_url.rstrip('/')}/benefits-ladder",
        ),
    )


async def send_webinar_reminder(to: str, name: str, webinar_title: str, when_str: str, join_url: str, app_url: str) -> Optional[str]:
    body = f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;border:1px solid {_BORDER};border-radius:16px;">
      <tr><td style="padding:24px;">
        <div style="color:{_BRAND_GOLD};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Reminder set</div>
        <div style="color:{_TEXT};font-size:22px;font-weight:600;padding-top:10px;line-height:1.25;">{webinar_title}</div>
        <div style="color:{_DIM};font-size:13px;padding-top:8px;">{when_str}</div>
      </td></tr>
      <tr><td style="padding:0 24px 24px;">
        <a href="{join_url}" style="display:inline-block;background:{_BRAND_GOLD};color:{_BG};text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px;font-size:13px;">Open event page →</a>
      </td></tr>
    </table>
    """
    return await _send(
        to=to,
        subject=f"Reminder · {webinar_title}",
        html=_shell(
            title="We'll remind you when it's live.",
            intro=f"You're confirmed for “{webinar_title}”. We'll nudge you again 15 minutes before it starts.",
            body_html=body,
            cta_label="View all webinars",
            cta_url=f"{app_url.rstrip('/')}/webinars",
        ),
    )


async def send_support_inbound(user: dict, message: str, channel: str, app_url: str) -> Optional[str]:
    """Forward user's support query directly to the OneX concierge inbox."""
    support_to = os.environ.get("SUPPORT_INBOX", "surya@onex.exchange")
    name = user.get("name") or user.get("email") or "Member"
    phone = user.get("phone") or "—"
    tier = user.get("tier") or "Cadet"
    balance = user.get("aed_balance", 0)
    phone_html = (f' · or call <span style="color:{_TEXT};">{phone}</span>') if phone != "—" else ""
    body = f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;border:1px solid {_BORDER};border-radius:16px;">
      <tr><td style="padding:24px;">
        <div style="color:{_BRAND_GOLD};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">New {channel} message</div>
        <div style="color:{_TEXT};font-size:17px;font-weight:600;padding-top:10px;">{name}</div>
        <div style="color:{_DIM};font-size:13px;padding-top:4px;">{user.get('email','')} · {phone}</div>
        <div style="color:{_DIM};font-size:12px;padding-top:4px;">{tier} · AED {balance:,}</div>
      </td></tr>
      <tr><td style="padding:0 24px 8px;">
        <div style="color:{_BRAND_GOLD};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;padding-bottom:8px;">Their message</div>
        <div style="background:{_SURFACE};border:1px solid {_BORDER};border-radius:14px;padding:16px;color:{_TEXT};font-size:14px;line-height:1.6;white-space:pre-wrap;">{message}</div>
      </td></tr>
      <tr><td style="padding:16px 24px 24px;color:{_DIM};font-size:12px;">
        Reply directly to <a href="mailto:{user.get('email','')}" style="color:{_BRAND_GOLD};text-decoration:none;">{user.get('email','')}</a>{phone_html}
      </td></tr>
    </table>
    """
    html = _shell(
        title=f"New support note from {name}",
        intro=f"A OneX Club member just sent a message via the {channel} channel. Below is the full context — respond quickly.",
        body_html=body,
        cta_label="Open OneX admin",
        cta_url=app_url,
    )
    # Reply-to header so admin can just hit Reply.
    if not _configure_once():
        log.warning("RESEND_API_KEY not set — skipping support inbound email")
        return None
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    params = {
        "from": f"OneX Concierge <{sender}>",
        "to": [support_to],
        "subject": f"[OneX Support] {name} · {message[:60]}",
        "html": html,
        "reply_to": [user.get("email")] if user.get("email") else [],
    }
    try:
        resp = await asyncio.to_thread(resend.Emails.send, params)
        email_id = resp.get("id") if isinstance(resp, dict) else None
        log.info("support email sent id=%s to=%s", email_id, support_to)
        return email_id
    except Exception as e:  # noqa: BLE001
        log.exception("resend support send failed: %s", e)
        return None


async def send_milestone_done(to: str, name: str, milestone_title: str, granted_aed: int, new_balance: int, app_url: str) -> Optional[str]:
    body = f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;border:1px solid {_BORDER};border-radius:16px;">
      <tr><td style="padding:20px;">
        <div style="color:#22C55E;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">Milestone Complete</div>
        <div style="color:{_TEXT};font-size:20px;font-weight:600;padding-top:8px;">{milestone_title} ✓</div>
        <div style="color:{_DIM};font-size:13px;padding-top:6px;">+ AED {granted_aed} added · New balance AED {new_balance:,}</div>
      </td></tr>
    </table>
    """
    return await _send(
        to=to,
        subject=f"+AED {granted_aed} — {milestone_title} done",
        html=_shell(
            title=f"Nice work, {name.split(' ')[0]}.",
            intro=f"You just completed “{milestone_title}”. Your AED balance grew by AED {granted_aed}.",
            body_html=body,
            cta_label="See what's next",
            cta_url=f"{app_url.rstrip('/')}/progress",
        ),
    )
