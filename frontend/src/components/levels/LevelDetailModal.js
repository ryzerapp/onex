import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import {
  X, Lock, Sparkles, Calendar, UserPlus, ShieldCheck, Wallet, Building2,
  Check, ArrowRight,
} from "lucide-react";

/**
 * Tier-detail modal — opened when the user clicks any of the 4 tier cards on
 * Co-Owner Benefits or Benefits Ladder.
 *
 * Centering: rendered through `createPortal(document.body)` so any ancestor
 * with `transform`, `filter`, or `will-change` cannot break `position:fixed`.
 *
 * Dynamic "Ways to get there": each action carries a `progressKey` + `target`.
 * On mount we fetch /api/tier-progress once and stamp each action with
 * `done: true` / `current: N` so the UI shows ✓ for completed items and
 * "+X more needed" for pending ones.
 */
const TIER_DETAILS = {
  "Member": {
    headline: "Your first access pass.",
    why: "The moment you unlock Member, every future Dubai launch opens to you 24 hours earlier than the public waitlist.",
    benefits: [
      "24-hour early window on every property launch",
      "Exclusive webinars with the OneX investment desk",
      "Reduced effective entry on selected assets",
    ],
    actions: [
      { icon: Calendar,    title: "Attend a webinar",            aed: 25,  route: "/webinars",        progressKey: "webinars_attended", target: 1 },
      { icon: UserPlus,    title: "Invite a friend who verifies", aed: 50,  route: "/invite",          progressKey: "verified_referrals", target: 1 },
      { icon: ShieldCheck, title: "Friend completes KYC",         aed: 100, route: "/invite",          progressKey: "kyc_referrals",      target: 1 },
      { icon: Wallet,      title: "Top up to AED 500",            aed: 500, route: "topup",           progressKey: "balance",            target: 500 },
    ],
  },
  "Insider": {
    headline: "Priority allocation. Closed-door briefings.",
    why: "Insiders allocate first, on better pricing, with direct access to OneX leadership.",
    benefits: [
      "24-hour priority access to new allocations",
      "Executive Q&A sessions with the founding team",
      "Better entry pricing on selected properties",
      "Priority room selection & allocation",
    ],
    actions: [
      { icon: Calendar,  title: "Attend 4 webinars",             aed: 100,  route: "/webinars",            progressKey: "webinars_attended",   target: 4 },
      { icon: UserPlus,  title: "Refer 5 verified friends",      aed: 250,  route: "/invite",              progressKey: "verified_referrals",  target: 5 },
      { icon: Wallet,    title: "Top up to AED 2,500",           aed: 2500, route: "topup",                progressKey: "balance",             target: 2500 },
      { icon: Building2, title: "Reserve allocation interest",   aed: 50,   route: "/allocation-interests", progressKey: "interests_reserved", target: 1 },
    ],
  },
  "Co-Owner": {
    headline: "Hospitality meets ownership.",
    why: "Co-Owners enjoy concierge-grade experiences on top of every allocation benefit.",
    benefits: [
      "Complimentary airport transfers in Dubai",
      "Two complimentary annual stays in OneX assets",
      "Private founder briefings before each launch",
      "Invitation to OneX Lounge events",
    ],
    actions: [
      { icon: UserPlus,  title: "Build a referral chain of 10", aed: 500,  route: "/invite",     progressKey: "verified_referrals", target: 10 },
      { icon: Building2, title: "Friend becomes a co-owner",    aed: 500,  route: "/properties", progressKey: "coowner_referrals",  target: 1 },
      { icon: Wallet,    title: "Top up to AED 5,000",          aed: 5000, route: "topup",       progressKey: "balance",            target: 5000 },
    ],
  },
  "Pro-Owner": {
    headline: "The top tier. Architect the OneX roadmap.",
    why: "Pro-Owners have a seat at the table — and a relationship manager who never sleeps.",
    benefits: [
      "Dedicated relationship manager (24/7)",
      "Advisory council access — shape OneX's roadmap",
      "Invitation-only events with co-investors",
      "All Co-Owner benefits, amplified",
    ],
    actions: [
      { icon: UserPlus,  title: "Reach 20 verified referrals", aed: 1000,  route: "/invite",     progressKey: "verified_referrals", target: 20 },
      { icon: Building2, title: "Co-own 2+ assets via referrals", aed: 1000, route: "/properties", progressKey: "coowner_referrals", target: 2 },
      { icon: Wallet,    title: "Top up to AED 10,000",        aed: 10000, route: "topup",       progressKey: "balance",            target: 10000 },
    ],
  },
};

const _isDone = (action, progress) => {
  if (!progress) return false;
  const v = progress[action.progressKey];
  if (action.progressKey === "interests_reserved") return Boolean(v);
  return Number(v ?? 0) >= action.target;
};

const _currentValue = (action, progress) => {
  if (!progress) return 0;
  const v = progress[action.progressKey];
  if (action.progressKey === "interests_reserved") return v ? 1 : 0;
  return Number(v ?? 0);
};

const LevelDetailModal = ({ tier, currentBalance, onClose, onAction }) => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!tier) return;
    api.get("/tier-progress").then(({ data }) => setProgress(data)).catch(() => {});
  }, [tier]);

  // Lock body scroll while the modal is open — prevents the page underneath from
  // jumping if the user wheel-scrolls.
  useEffect(() => {
    if (!tier) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [tier]);

  if (!tier) return null;
  const detail = TIER_DETAILS[tier.name];
  if (!detail) return null;
  const unlocked = currentBalance >= tier.threshold;
  const remaining = Math.max(0, tier.threshold - currentBalance);

  const handleAction = (a) => {
    if (a.route === "topup") {
      onAction?.(a);
      onClose?.();
      return;
    }
    onClose?.();
    navigate(a.route);
  };

  const node = (
    <div
      data-testid="level-detail-modal"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm fade-in p-6"
      onClick={onClose}
    >
      <div
        className="onex-card max-w-3xl w-full p-8 relative max-h-[90vh] overflow-y-auto onex-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} data-testid="level-detail-close" className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
          <X size={16} className="text-zinc-300" />
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${unlocked ? "onex-gold-fill onex-glow-gold" : "bg-[#15161A] border border-[#27272A]"}`}>
            {unlocked ? <Sparkles size={22} /> : <Lock size={22} className="text-zinc-400" />}
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-[#8CFF2E]">Level {tier.level}</div>
            <div className="text-[26px] font-display text-white leading-tight">{tier.name}</div>
            <div className="text-[12px] text-zinc-500">AED {tier.threshold.toLocaleString()} balance to unlock</div>
          </div>
        </div>

        <h3 className="text-[22px] font-display text-white mt-6 leading-tight">{detail.headline}</h3>
        <p className="text-zinc-400 text-[14px] mt-2">{detail.why}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-7">
          <div>
            <div className="text-[12px] uppercase tracking-[0.15em] text-zinc-500 mb-3">What unlocks at this level</div>
            <ul className="space-y-2.5">
              {detail.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-zinc-200 text-[13px]"><Check size={14} className="text-[#8CFF2E] mt-0.5 shrink-0" /><span>{b}</span></li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[12px] uppercase tracking-[0.15em] text-zinc-500 mb-3">Ways to get there</div>
            <div className="space-y-2.5">
              {detail.actions.map((a, idx) => {
                const ActionIcon = a.icon;
                const done = _isDone(a, progress);
                const current = _currentValue(a, progress);
                const remainingCount = Math.max(0, a.target - current);
                return (
                  <button
                    key={a.title}
                    onClick={() => handleAction(a)}
                    data-testid={`level-action-${idx}`}
                    className={`w-full p-3 flex items-center gap-3 rounded-2xl border transition-all text-left ${
                      done
                        ? "bg-[#22C55E]/10 border-[#22C55E]/40"
                        : "bg-[#15161A] border-[#27272A] hover:border-[#8CFF2E]/40"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                      done ? "bg-[#22C55E]/15 border border-[#22C55E]/40" : "bg-[#1F3008] border border-[#8CFF2E]/30"
                    }`}>
                      {done
                        ? <Check size={14} className="text-[#22C55E]" />
                        : <ActionIcon size={14} className="text-[#8CFF2E]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-medium truncate ${done ? "text-[#22C55E]" : "text-white"}`}>
                        {a.title}
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {done
                          ? <span className="text-[#22C55E]">Done · +AED {a.aed} earned</span>
                          : progress
                            ? <span className="text-zinc-400">
                                {a.progressKey === "balance"
                                  ? `AED ${remainingCount.toLocaleString()} more · `
                                  : a.progressKey === "interests_reserved"
                                    ? "Tap to reserve · "
                                    : `${remainingCount} more needed · `}
                                <span className="text-[#8CFF2E]">+AED {a.aed}</span>
                              </span>
                            : <span className="text-[#8CFF2E]">+AED {a.aed}</span>}
                      </div>
                    </div>
                    {!done && <ArrowRight size={14} className="text-zinc-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {!unlocked && (
          <div className="onex-card-soft p-4 mt-6 flex items-center justify-between gap-4" data-testid="level-detail-remaining">
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Remaining</div>
              <div className="text-[#8CFF2E] text-[22px] font-display">AED {remaining.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Your balance</div>
              <div className="text-white text-[14px] font-semibold">AED {currentBalance.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Portal to body so transformed ancestors can't hijack the fixed positioning.
  return typeof document !== "undefined" ? createPortal(node, document.body) : node;
};

export default LevelDetailModal;
