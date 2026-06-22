import React from "react";
import { X, Lock, Sparkles, Calendar, UserPlus, ShieldCheck, Wallet, Building2, ArrowRight, Check } from "lucide-react";

/**
 * Detailed level breakdown — fired when a member taps a tier on the Benefits Ladder.
 * Shows the full benefit list + actionable ways to unlock the level beyond referrals.
 */

const TIER_DETAILS = {
  "Co-Owner Member": {
    icon: Sparkles,
    color: "#8CFF2E",
    headline: "Your first access pass.",
    why: "The moment you unlock Co-Owner Member, every future Dubai launch opens to you 24 hours earlier than the public waitlist.",
    benefits: [
      "24-hour early window on every property launch",
      "Exclusive webinars with the OneX investment desk",
      "Reduced effective entry on selected assets",
    ],
    actions: [
      { icon: Calendar, title: "Attend a webinar", aed: 25, route: "/webinars" },
      { icon: UserPlus, title: "Invite a friend who verifies", aed: 50, route: "/invite" },
      { icon: ShieldCheck, title: "Friend completes KYC", aed: 100, route: "/invite" },
      { icon: Wallet, title: "Top up AED Balance", aed: 250, route: "/benefits-ladder#topup" },
    ],
  },
  "Priority Co-Owner": {
    icon: Sparkles,
    color: "#8CFF2E",
    headline: "Priority allocation. Closed-door briefings.",
    why: "Priority members allocate first, on better pricing, with direct access to OneX leadership.",
    benefits: [
      "24-hour priority access to new allocations",
      "Executive Q&A sessions with the founding team",
      "Better entry pricing on selected properties",
      "Priority room selection & allocation",
    ],
    actions: [
      { icon: Calendar, title: "Attend 4 more webinars", aed: 100, route: "/webinars" },
      { icon: UserPlus, title: "Refer 5 verified friends", aed: 250, route: "/invite" },
      { icon: Wallet, title: "Top up to fast-track", aed: 1500, route: "/benefits-ladder#topup" },
      { icon: Building2, title: "Reserve allocation interest", aed: 50, route: "/allocation-interests" },
    ],
  },
  "Co-Owner Circle": {
    icon: Sparkles,
    color: "#8CFF2E",
    headline: "The Circle — hospitality meets ownership.",
    why: "Members of the Circle enjoy concierge-grade experiences on top of every allocation benefit.",
    benefits: [
      "Complimentary airport transfers in Dubai",
      "Two complimentary annual stays in OneX assets",
      "Private founder briefings before each launch",
      "Invitation to OneX Lounge events",
    ],
    actions: [
      { icon: UserPlus, title: "Build a referral chain of 10", aed: 500, route: "/invite" },
      { icon: Building2, title: "Become a co-owner", aed: 500, route: "/properties" },
      { icon: Wallet, title: "Top up to AED 5,000", aed: 3000, route: "/benefits-ladder#topup" },
    ],
  },
  "Elite Co-Owner": {
    icon: Sparkles,
    color: "#8CFF2E",
    headline: "The top tier. Architect the OneX roadmap.",
    why: "Elite members have a seat at the table — and a relationship manager who never sleeps.",
    benefits: [
      "Dedicated relationship manager (24/7)",
      "Advisory council access — shape OneX's roadmap",
      "Invitation-only events with co-investors",
      "All Circle benefits, amplified",
    ],
    actions: [
      { icon: UserPlus, title: "Reach 20 verified referrals", aed: 1000, route: "/invite" },
      { icon: Building2, title: "Co-own 2+ assets", aed: 1000, route: "/properties" },
      { icon: Wallet, title: "Top up to AED 10,000", aed: 6500, route: "/benefits-ladder#topup" },
    ],
  },
};

const LevelDetailModal = ({ tier, currentBalance, onClose, onAction }) => {
  if (!tier) return null;
  const detail = TIER_DETAILS[tier.name];
  if (!detail) return null;
  const Icon = detail.icon;
  const unlocked = currentBalance >= tier.threshold;
  const remaining = Math.max(0, tier.threshold - currentBalance);

  return (
    <div
      data-testid="level-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm fade-in p-6"
      onClick={onClose}
    >
      <div
        className="onex-card max-w-3xl w-full p-8 relative max-h-[88vh] overflow-y-auto onex-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} data-testid="level-detail-close" className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
          <X size={16} className="text-zinc-300" />
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${unlocked ? "onex-gold-fill onex-glow-gold" : "bg-[#15161A] border border-[#27272A]"}`}>
            {unlocked ? <Icon size={22} /> : <Lock size={22} className="text-zinc-400" />}
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
                return (
                  <button
                    key={a.title}
                    onClick={() => onAction?.(a)}
                    data-testid={`level-action-${idx}`}
                    className="w-full onex-card-soft p-3 flex items-center gap-3 hover:border-[#8CFF2E]/30 transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-2xl bg-[#1F3008] border border-[#8CFF2E]/30 flex items-center justify-center shrink-0">
                      <ActionIcon size={14} className="text-[#8CFF2E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[13px] font-medium truncate">{a.title}</div>
                      <div className="text-[#8CFF2E] text-[12px]">+AED {a.aed}</div>
                    </div>
                    <ArrowRight size={14} className="text-zinc-500" />
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
};

export default LevelDetailModal;
