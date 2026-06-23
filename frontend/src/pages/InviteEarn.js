import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { devDebug } from "@/lib/devDebug";
import {
  Copy, Share2, MessageCircle, Send, Linkedin, Mail, UserPlus, CheckCircle2,
  Phone, ShieldCheck, Calendar, MousePointerClick, Clock, AlertCircle, Sparkles,
  Eye, Code, ExternalLink, Globe,
} from "lucide-react";

const channels = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#22C55E",
    href: (link, msg) => `https://wa.me/?text=${encodeURIComponent(`${msg} ${link}`)}` },
  { id: "telegram", label: "Telegram", icon: Send, color: "#60A5FA",
    href: (link, msg) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}` },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#A78BFA",
    href: (link) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
  { id: "email", label: "Email", icon: Mail, color: "#8CFF2E",
    href: (link, msg) => `mailto:?subject=${encodeURIComponent("You're invited to OneX Club")}&body=${encodeURIComponent(`${msg}\n\n${link}`)}` },
];

const missionIcons = { invite: UserPlus, verify_mobile: Phone, complete_kyc: ShieldCheck, attend_webinar: Calendar };

const STATUS_STYLES = {
  signed_up:      { color: "#60A5FA", bg: "#1E2A3E", label: "Signed up" },
  verified:       { color: "#22C55E", bg: "#1F3A2D", label: "Verified" },
  kyc_completed:  { color: "#8CFF2E", bg: "#1F3008", label: "KYC complete" },
  waitlist:       { color: "#F472B6", bg: "#3A1E2D", label: "Joined waitlist" },
  pending:        { color: "#A78BFA", bg: "#241B3F", label: "Clicked · pending" },
  expired:        { color: "#71717A", bg: "#1E1F24", label: "Expired" },
};

const StatusPill = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}33` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} /> {s.label}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color, testid, hint }) => (
  <div className="onex-card-soft p-4" data-testid={testid}>
    <div className="flex items-center justify-between">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}1F`, border: `1px solid ${color}33` }}>
        <Icon size={15} style={{ color }} />
      </div>
      {hint && <span className="text-zinc-600 text-[10px] uppercase tracking-[0.12em]">{hint}</span>}
    </div>
    <div className="text-[24px] font-display text-white mt-3 leading-none tabular-nums">{value}</div>
    <div className="text-[11px] text-zinc-500 uppercase tracking-[0.14em] mt-1.5">{label}</div>
  </div>
);

const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};

const InviteEarn = () => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("referees");

  useEffect(() => { api.get("/referrals").then(({ data }) => setData(data)); }, []);

  if (!data) return <div className="text-zinc-500" data-testid="invite-loading">Loading…</div>;

  const inviteMsg = `Join OneX Club — Dubai's invitation-only co-ownership platform. Use my link to skip the waitlist:`;
  const share = async (channel) => {
    try {
      await api.post("/referrals/share", { channel });
      const c = channels.find((x) => x.id === channel);
      if (c) window.open(c.href(data.referral_link, inviteMsg), "_blank", "noopener,noreferrer");
    } catch (e) { devDebug("[invite] share failed", e); toast.error("Could not log share"); }
  };
  const copyLink = () => { navigator.clipboard?.writeText(data.referral_link); toast.success("Referral link copied"); };

  const allEntries = [
    ...data.referees.map((r) => ({ kind: "referee", ...r })),
    ...data.pending_clicks.map((c) => ({ kind: "click", ...c, status: "pending", name: "Anonymous visitor", email: "—", aed_earned: 0, joined_at: c.clicked_at })),
    ...data.expired_clicks.map((c) => ({ kind: "click", ...c, status: "expired", name: "Anonymous visitor", email: "—", aed_earned: 0, joined_at: c.clicked_at })),
  ];

  const tabData = tab === "all" ? allEntries
    : tab === "referees" ? allEntries.filter((e) => e.kind === "referee" && e.status !== "waitlist")
    : tab === "waitlist" ? allEntries.filter((e) => e.status === "waitlist")
    : tab === "pending" ? allEntries.filter((e) => e.status === "pending")
    : allEntries.filter((e) => e.status === "expired");

  return (
    <div data-testid="invite-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Invite & Earn</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Grow the OneX community. Track every click, signup and conversion in one place.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Left: link + share */}
        <div className="lg:col-span-2 onex-card p-6 sm:p-8" data-testid="referral-link-card">
          <div className="text-[12px] uppercase tracking-[0.18em] text-[#8CFF2E]">Your Referral Link</div>
          <div className="mt-5 onex-card-soft p-3 flex items-center gap-3">
            <div className="flex-1 text-zinc-300 text-[13px] truncate px-3 py-2 bg-[#0A0A0B] rounded-xl border border-[#27272A]" data-testid="referral-link-value">{data.referral_link}</div>
            <button onClick={copyLink} data-testid="referral-copy-btn" className="btn-gold !py-2.5"><Copy size={14} /> Copy</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {channels.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => share(c.id)}
                  data-testid={`share-${c.id}`}
                  className="onex-card-soft p-4 flex items-center gap-3 hover:border-[#8CFF2E]/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${c.color}1F`, border: `1px solid ${c.color}44` }}>
                    <Icon size={16} style={{ color: c.color }} />
                  </div>
                  <span className="text-white text-[13px] font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stats grid (6 cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
            <StatCard testid="referral-stat-clicks" icon={MousePointerClick} label="Total Clicks" value={data.stats.clicks_total} color="#60A5FA" hint={`${data.stats.clicks_unique} unique`} />
            <StatCard testid="referral-stat-signups" icon={UserPlus} label="Signups" value={data.stats.signups} color="#22C55E" />
            <StatCard testid="referral-stat-pending" icon={Clock} label="Pending" value={data.stats.pending} color="#A78BFA" hint="not signed-up yet" />
            <StatCard testid="referral-stat-verified" icon={CheckCircle2} label="Verified" value={data.stats.verified} color="#22C55E" />
            <StatCard testid="referral-stat-kyc" icon={ShieldCheck} label="KYC Completed" value={data.stats.kyc_completed} color="#8CFF2E" />
            <StatCard testid="referral-stat-aed" icon={Sparkles} label="AED Earned" value={`AED ${data.stats.aed_earned.toLocaleString()}`} color="#8CFF2E" />
          </div>

          {/* Expired alert */}
          {data.stats.expired > 0 && (
            <div className="mt-5 onex-card-soft p-4 flex items-center gap-3 border-[#71717A]/30" data-testid="referral-expired-banner">
              <AlertCircle size={16} className="text-zinc-400" />
              <div className="text-zinc-400 text-[12px]">
                <span className="text-white">{data.stats.expired} clicks expired</span> — visits older than 30 days that never signed up.
                Resend with a fresh message to re-engage.
              </div>
            </div>
          )}
        </div>

        {/* Right: missions */}
        <div className="onex-card p-6" data-testid="referral-missions-card">
          <h3 className="text-white text-[18px] font-semibold">Referral Missions</h3>
          <p className="text-zinc-500 text-[12px]">Earn at each step of your friend{"\u2019"}s journey.</p>
          <div className="mt-5 space-y-3">
            {data.missions.map((m) => {
              const Icon = missionIcons[m.id] || UserPlus;
              return (
                <div key={m.id} className="onex-card-soft p-4 flex items-center gap-3" data-testid={`mission-${m.id}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${m.completed ? "bg-[#1F3A2D] border border-[#22C55E]/40" : "bg-[#1F3008] border border-[#8CFF2E]/30"}`}>
                    {m.completed ? <CheckCircle2 size={16} className="text-[#22C55E]" /> : <Icon size={16} className="text-[#8CFF2E]" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-[14px] font-medium">{m.title}</div>
                    <div className="text-zinc-500 text-[12px]">{m.subtitle}</div>
                  </div>
                  <div className={`text-[13px] font-semibold ${m.completed ? "text-[#22C55E]" : "text-[#8CFF2E]"}`}>+AED {m.aed}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Referral dashboard / lifecycle table */}
      <div className="onex-card mt-8 p-6 sm:p-7" data-testid="referral-dashboard">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-white text-2xl font-display tracking-tight">Your Referral Pipeline</h2>
            <p className="text-zinc-500 text-[13px] mt-1">Each click and signup, tracked end-to-end. Stays attributable for 30 days from first click.</p>
          </div>
          <div className="flex gap-2 flex-wrap" data-testid="referral-tabs">
            {[
              { id: "referees", label: `Signups · ${data.referees.length}` },
              { id: "waitlist", label: `Waitlist · ${data.stats.waitlist_signups ?? 0}` },
              { id: "pending", label: `Pending · ${data.stats.pending}` },
              { id: "expired", label: `Expired · ${data.stats.expired}` },
              { id: "all", label: "All" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`referral-tab-${t.id}`}
                className={`px-4 py-2 rounded-full text-[12px] font-medium border transition-all ${tab === t.id ? "onex-gold-fill border-[#8CFF2E]" : "border-[#27272A] text-zinc-300 hover:border-[#8CFF2E]/30"}`}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {tabData.length === 0 ? (
          <div className="mt-8 onex-card-soft p-10 text-center" data-testid="referral-empty">
            <div className="w-14 h-14 rounded-2xl mx-auto onex-gold-fill flex items-center justify-center"><Eye size={20} /></div>
            <div className="text-white text-[15px] font-semibold mt-4">No referrals here yet</div>
            <div className="text-zinc-500 text-[13px] mt-2 max-w-md mx-auto">Copy your link and share — every click, signup and KYC completion will appear here in real time.</div>
            <button onClick={copyLink} className="mt-5 btn-gold mx-auto" data-testid="referral-empty-copy"><Copy size={14} /> Copy my link</button>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left" data-testid="referral-table">
              <thead>
                <tr className="text-zinc-500 text-[11px] uppercase tracking-[0.14em] border-b border-[#1F1F22]">
                  <th className="py-3 pr-3 font-medium">Friend</th>
                  <th className="py-3 pr-3 font-medium">Status</th>
                  <th className="py-3 pr-3 font-medium">Via</th>
                  <th className="py-3 pr-3 font-medium">When</th>
                  <th className="py-3 pr-3 font-medium text-right">AED Earned</th>
                </tr>
              </thead>
              <tbody>
                {tabData.map((e, i) => (
                  <tr key={`${e.kind}-${e.id || i}`} className="border-b border-[#1F1F22]/60 hover:bg-white/[0.02] transition-all" data-testid={`referral-row-${i}`}>
                    <td className="py-4 pr-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold ${e.kind === "click" ? "bg-zinc-800 text-zinc-400" : "onex-gold-fill"}`}>
                          {e.kind === "click" ? "?" : (e.name || "F").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white text-[13.5px] font-medium truncate">{e.name}</div>
                          <div className="text-zinc-500 text-[11.5px] truncate">{e.email || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-3"><StatusPill status={e.status} /></td>
                    <td className="py-4 pr-3 text-zinc-400 text-[12.5px] capitalize">{e.via || e.source || "link"}</td>
                    <td className="py-4 pr-3 text-zinc-400 text-[12.5px]">{fmtDate(e.joined_at)}</td>
                    <td className="py-4 pr-3 text-right">
                      <span className={`text-[13px] font-semibold ${e.aed_earned > 0 ? "text-[#8CFF2E]" : "text-zinc-600"}`}>
                        {e.aed_earned > 0 ? `+AED ${e.aed_earned}` : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ────────── Framer embed: install on your landing page ────────── */}
      <div className="onex-card mt-8 p-6 sm:p-7" data-testid="framer-embed-section">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-[#A78BFA]/15 border border-[#A78BFA]/30 flex items-center justify-center"><Globe size={18} className="text-[#A78BFA]" /></div>
          <div className="flex-1 min-w-[240px]">
            <h2 className="text-white text-2xl font-display tracking-tight">Capture emails from your Framer Waitlist</h2>
            <p className="text-zinc-500 text-[13px] mt-1 max-w-2xl leading-relaxed">
              Already using Framer{"\u2019"}s native <span className="text-white">Waitlist</span> component? Drop this Code Override onto it and every submitted email flows into OneX automatically —
              referrer attribution (+AED 25), waitlist entry visible above, and the contact pushed into your Brevo CRM list. Framer{"\u2019"}s own email capture keeps working too.
            </p>
          </div>
        </div>

        {/* Two action buttons + copyable snippet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            onClick={() => { const u = data.referral_link; navigator.clipboard?.writeText(u); toast.success("Referral link copied — paste into Framer as the button destination."); }}
            data-testid="framer-copy-link"
            className="onex-card-soft p-4 flex items-center justify-between hover:border-[#8CFF2E]/30 transition-all text-left"
          >
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Your referral landing URL</div>
              <div className="text-white text-[13px] mt-1 truncate font-mono">{data.referral_link}</div>
            </div>
            <Copy size={16} className="text-[#8CFF2E] flex-shrink-0 ml-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              const snippet = buildFramerOverride(data.referral_code);
              navigator.clipboard?.writeText(snippet);
              toast.success("Framer Code Override copied — paste into Framer's Code → New File.");
            }}
            data-testid="framer-copy-snippet"
            className="onex-card-soft p-4 flex items-center justify-between hover:border-[#A78BFA]/30 transition-all text-left"
          >
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Framer Code Override (native Waitlist)</div>
              <div className="text-white text-[13px] mt-1">Copy override · works with Framer{"\u2019"}s built-in Waitlist component</div>
            </div>
            <Code size={16} className="text-[#A78BFA] flex-shrink-0 ml-3" />
          </button>
        </div>

        {/* Preview of what will be sent */}
        <div className="mt-5 rounded-2xl border border-[#27272A] bg-[#0A0A0B] p-4 text-[12px] text-zinc-400 leading-relaxed">
          <div className="flex items-center gap-2 text-[#8CFF2E] text-[11px] uppercase tracking-[0.16em] mb-2"><Sparkles size={11} /> How to install the Code Override in Framer</div>
          <ol className="list-decimal list-inside space-y-1 text-zinc-300">
            <li>In your Framer project: <span className="text-white">Assets → Code → New File</span>. Name it <code className="text-[#8CFF2E]">onexCapture.tsx</code>. Paste.</li>
            <li>Select your <span className="text-white">native Waitlist component</span> on the canvas. Right panel → <span className="text-white">Code Overrides</span> → choose <code className="text-[#8CFF2E]">withOnexCapture</code>.</li>
            <li>Done. Every submit now fires both Framer{"\u2019"}s native capture <em>and</em> our <code className="text-[#8CFF2E]">/api/waitlist/join</code> (with referrer attribution and Brevo sync).</li>
          </ol>

          <div className="mt-4 pt-4 border-t border-[#1F1F22]">
            <div className="text-[#A78BFA] text-[11px] uppercase tracking-[0.16em] mb-2 flex items-center gap-2"><Code size={11} /> Verify it works from your Framer site</div>
            <div className="text-zinc-400 mb-2">Open your live Framer page → DevTools Console → paste:</div>
            <pre className="bg-black/60 border border-[#27272A] rounded-xl p-3 text-[11px] text-[#8CFF2E] overflow-x-auto whitespace-pre-wrap break-all">
{`fetch("${(process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "")}/api/waitlist/diag").then(r=>r.json()).then(console.log)`}
            </pre>
            <div className="text-zinc-500 mt-2">You should see <code className="text-[#8CFF2E]">{`{ok:true, signups_total: <number>, brevo_list_id: 6}`}</code>. The <span className="text-white">signups_total</span> increments by 1 on every successful Waitlist submit.</div>
          </div>

          <a href={`${data.referral_link}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#A78BFA] text-[12px] mt-3 hover:underline">
            Preview your shareable link <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  );
};

/** Returns a Framer Code Override (TypeScript) the user can paste into a new file.
 *  - Drop into Framer: Assets → Code → New File → onexCapture.tsx → paste.
 *  - Select the native Waitlist component and apply override `withOnexCapture`.
 *  - On submit, the override POSTs {email, ref, source} to /api/waitlist/join.
 *    Framer's own success behavior (open link / redirect) keeps working untouched.
 */
function buildFramerOverride(fallbackCode) {
  const API_BASE = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
  return `// onexCapture.tsx — Framer Code Override for the native Waitlist component.
// 1. Framer → Assets → Code → New File → onexCapture.tsx → paste this.
// 2. Select your Waitlist component on the canvas → right panel → Code Overrides → pick "withOnexCapture".
// 3. Publish. Every submit will fire BOTH Framer's native capture AND our /api/waitlist/join.
//
// The fetch uses mode:"no-cors" + sendBeacon as a fallback so the request goes through
// even if the browser blocks the CORS preflight (it always hits our server, which is what counts).
import type { ComponentType } from "react"
import { useEffect, useRef } from "react"

const ONEX_API = "${API_BASE}/api"
const FALLBACK_REF = "${fallbackCode}"

function postSignup(email: string, ref: string) {
  const body = JSON.stringify({ email, ref, source: "framer-waitlist" })
  // Beacon is the most reliable path on unload/redirect — fire it first.
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(\`\${ONEX_API}/waitlist/join\`, new Blob([body], { type: "application/json" }))
    }
  } catch (e) { /* ignore */ }
  // Belt-and-suspenders: also fire a no-cors fetch. The browser can't read the response
  // (mode:no-cors makes it opaque), but the request DOES reach our server every time.
  try {
    fetch(\`\${ONEX_API}/waitlist/join\`, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch (e) { /* ignore */ }
}

export function withOnexCapture(Component): ComponentType {
  return (props) => {
    const wrapRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const root = wrapRef.current
      if (!root) return
      const refCode = (new URLSearchParams(location.search).get("ref") || FALLBACK_REF || "").toLowerCase()

      const onSubmit = (e: Event) => {
        const form = e.target as HTMLFormElement
        const input = form.querySelector('input[type="email"]') as HTMLInputElement | null
        const email = input?.value?.trim()
        if (email) postSignup(email, refCode)
      }

      // Framer renders the form async — watch the subtree.
      const observer = new MutationObserver(() => {
        root.querySelectorAll("form").forEach((f) => {
          if ((f as any).__onex) return
          ;(f as any).__onex = true
          f.addEventListener("submit", onSubmit, { capture: true })
        })
      })
      observer.observe(root, { childList: true, subtree: true })
      // Initial scan (form may already be mounted).
      root.querySelectorAll("form").forEach((f) => {
        if ((f as any).__onex) return
        ;(f as any).__onex = true
        f.addEventListener("submit", onSubmit, { capture: true })
      })
      return () => observer.disconnect()
    }, [])

    return (
      <div ref={wrapRef} style={{ display: "contents" }}>
        <Component {...props} />
      </div>
    )
  }
}
`;
}

export default InviteEarn;
