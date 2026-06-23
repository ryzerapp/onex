import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import ProgressRing from "@/components/common/ProgressRing";
import PhoneCaptureModal from "@/components/progress/PhoneCaptureModal";
import BrandMark from "@/components/common/BrandMark";
import {
  ArrowLeft, Flag, UserPlus, Smartphone, IdCard, Calendar, PieChart,
  CheckCircle2, Gift, Headphones, ChevronDown, ChevronUp, ArrowRight,
  Trophy, Crown, Building2, Share2, Bookmark, UserCheck, ShieldCheck,
  MessageSquare, Lock, Zap,
} from "lucide-react";

const iconMap = {
  "user-plus": UserPlus, smartphone: Smartphone, "id-card": IdCard, calendar: Calendar, "pie-chart": PieChart,
  building: Building2, share: Share2, bookmark: Bookmark, "user-check": UserCheck,
  "shield-check": ShieldCheck, "message-square": MessageSquare, trophy: Trophy,
};

// Each auto-step deep-links into the page where the user can actually do the action.
const AUTO_ROUTE = {
  browse_properties: { label: "Browse Properties", route: "/properties" },
  share_referral:    { label: "Open Invite & Earn", route: "/invite" },
  save_property:     { label: "Browse Properties", route: "/properties" },
  invite_friend:     { label: "Open Invite & Earn", route: "/invite" },
  friend_kyc:        { label: "Open Invite & Earn", route: "/invite" },
  join_community:    { label: "Open Community", route: "/community" },
};

// Manual-step CTAs that have a richer flow than just /progress/complete.
const MANUAL_ROUTE = {
  attend_webinar:    { label: "Browse Webinars",  route: "/webinars" },
  reserve_allocation:{ label: "Pick Interests",   route: "/allocation-interests" },
};

// Per-step AED reward (mirrors backend MILESTONE_REWARDS).
const STEP_REWARDS = {
  verify_mobile: 25, browse_properties: 10, share_referral: 20, attend_webinar: 25,
  save_property: 15, invite_friend: 50, complete_kyc: 50, reserve_allocation: 50,
  friend_kyc: 100, join_community: 10, allocation_ready: 0,
};

const PROGRESS_RING_SIZE = 160;
const PROGRESS_RING_STROKE = 10;

const STATUS_STYLES = {
  completed: { color: "#22C55E", bg: "#1F3A2D", label: "Completed" },
  pending: { color: "#8CFF2E", bg: "#1F3008", label: "Pending" },
  upcoming: { color: "#71717A", bg: "#1E1F24", label: "Upcoming" },
};

const NextRewardCard = ({ nextReward, percent, completedCount, total, balance, allDone, onCtaClick, onTopupClick, onGoToAction }) => {
  if (!nextReward) return null;

  if (nextReward.kind === "maxed") {
    return (
      <div className="onex-card p-6" data-testid="next-reward-card">
        <div className="flex items-center gap-2 text-[#8CFF2E]">
          <Crown size={16} />
          <span className="text-[13px] font-medium">Elite Status Achieved</span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl onex-gold-fill flex items-center justify-center"><Crown size={22} /></div>
          <div>
            <div className="text-[20px] font-semibold text-white leading-tight">You{"’"}ve reached the top.</div>
            <div className="text-[12px] text-zinc-500 mt-1">Every co-owner benefit is unlocked.</div>
          </div>
        </div>
        <button onClick={onCtaClick} className="mt-5 w-full btn-ghost border-[#8CFF2E]/40 text-[#8CFF2E]" data-testid="next-reward-elite-cta">
          See All Benefits <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (nextReward.kind === "tier") {
    const tierThreshold = nextReward.tier_threshold || 1;
    const tierPct = Math.min(100, Math.round((balance / tierThreshold) * 100));
    return (
      <div className="onex-card p-6" data-testid="next-reward-card">
        <div className="flex items-center gap-2 text-[#8CFF2E]">
          <Trophy size={16} />
          <span className="text-[13px] font-medium">Next Tier Reward</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 onex-pill bg-[#22C55E]/15 text-[#22C55E]" data-testid="journey-complete-pill">
          <CheckCircle2 size={12} /> Journey complete
        </div>
        <div className="mt-5 flex items-center gap-4">
          <BrandMark size={64} glow />
          <div>
            <div className="text-[24px] font-semibold text-[#8CFF2E]">AED {nextReward.amount}</div>
            <div className="text-[12px] text-zinc-500">to unlock {nextReward.tier_name}</div>
          </div>
        </div>
        <div className="h-2 mt-5 rounded-full bg-[#27272A] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#8CFF2E] to-[#6DDB1E]" style={{ width: `${tierPct}%` }} />
        </div>
        <div className="text-right text-[11px] text-zinc-500 mt-2 tabular-nums">AED {balance} / AED {tierThreshold}</div>
        <button onClick={onCtaClick} className="mt-5 w-full btn-gold" data-testid="next-reward-tier-cta">
          Earn More AED <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // milestone kind
  return (
    <div className="onex-card p-6" data-testid="next-reward-card">
      <div className="flex items-center gap-2 text-[#8CFF2E]"><Gift size={16} /><span className="text-[13px] font-medium">Next Reward</span></div>
      <div className="mt-5 flex items-center gap-4">
        <BrandMark size={64} glow />
        <div>
          <div className="text-[28px] font-semibold text-[#8CFF2E]">+AED {nextReward.amount}</div>
          <div className="text-[12px] text-zinc-500">Complete {nextReward.label}</div>
        </div>
      </div>
      <div className="h-2 mt-5 rounded-full bg-[#27272A] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#8CFF2E] to-[#6DDB1E]" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-right text-[11px] text-zinc-500 mt-2 tabular-nums">{completedCount} / {total} completed</div>
      {allDone && (
        <div className="mt-3 text-[12px] text-[#22C55E]">Journey complete — keep earning AED to unlock the next tier.</div>
      )}

      {/* Quick-action CTAs — make the next milestone immediately actionable. */}
      {!allDone && (onGoToAction || onTopupClick) && (
        <div className="grid grid-cols-2 gap-2 mt-5">
          {onGoToAction && (
            <button
              onClick={onGoToAction}
              data-testid="next-reward-go-action"
              className="btn-gold !py-3 text-[13px]"
            >
              Go to action <ArrowRight size={14} />
            </button>
          )}
          {onTopupClick && (
            <button
              onClick={onTopupClick}
              data-testid="next-reward-topup"
              className="btn-ghost !py-3 text-[13px] border-[#8CFF2E]/30 text-[#8CFF2E] hover:border-[#8CFF2E]"
            >
              <Zap size={14} /> Top up AED
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const MyProgress = () => {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const load = useCallback(() => api.get("/progress").then(({ data }) => setData(data)), []);
  useEffect(() => { load(); }, [load]);

  const finishMilestone = async (id, extras = {}) => {
    const { data: r } = await api.post("/progress/complete", { milestone_id: id, ...extras });
    toast.success(r.granted ? `+AED ${r.granted} added to your balance` : "Step marked complete");
    await load();
    refresh(); // refresh sidebar balance/tier
  };

  const complete = async (id) => {
    try {
      // KYC milestone has a dedicated Veriff flow — redirect to the hosted verification.
      if (id === "complete_kyc") {
        try {
          const { data: kyc } = await api.post("/kyc/start");
          if (kyc?.url) { window.location.href = kyc.url; return; }
        } catch (e) { /* fall through to manual mark-complete */ }
      }
      // Mobile verification — first collect a phone number, then complete.
      if (id === "verify_mobile") { setPhoneOpen(true); return; }
      await finishMilestone(id);
    } catch { toast.error("Could not update milestone"); }
  };

  const handlePhoneSubmit = async (phone) => {
    try {
      await finishMilestone("verify_mobile", { phone });
      setPhoneOpen(false);
    } catch { toast.error("Could not verify mobile"); }
  };

  if (!data) return <div className="text-zinc-500" data-testid="progress-loading">Loading progress…</div>;

  return (
    <div data-testid="progress-page">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-11 h-11 rounded-full border border-[#27272A] bg-[#15161A] hover:bg-[#1E1F24] flex items-center justify-center" data-testid="progress-back-btn">
          <ArrowLeft size={16} className="text-zinc-300" />
        </button>
        <div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">My Progress</h1>
          <p className="text-zinc-400 mt-2 text-[15px]">Track and complete the steps to become an active co-owner.</p>
        </div>
      </div>

      {/* Big completion card */}
      <div className="onex-card p-6 sm:p-8 mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center" data-testid="progress-summary-card">
        <div className="flex items-center gap-8 flex-wrap">
          <div>
            <div className="text-[13px] text-zinc-400 uppercase tracking-[0.15em]">Journey Completion</div>
            <div className="text-[64px] sm:text-[80px] font-display font-medium text-white leading-none mt-2">{data.percent}%</div>
            <div className="text-[#22C55E] text-[14px] mt-2">You’re doing great!</div>
          </div>
          <ProgressRing size={160} stroke={10} percent={data.percent}>
            <Flag className="text-[#8CFF2E]" size={36} />
          </ProgressRing>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: CheckCircle2, color: "#22C55E", bg: "#1F3A2D", value: `${data.completed_count} / ${data.total}`, label: "Steps Completed" },
            { icon: Calendar, color: "#A78BFA", bg: "#2A1F4A", value: data.upcoming_count, label: "Upcoming Steps" },
            { icon: Gift, color: "#8CFF2E", bg: "#1F3008", value: `AED ${data.to_next_reward}`, label: "To Next Reward" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center min-w-0">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: s.bg, border: `1px solid ${s.color}44` }}>
                  <Icon size={20} style={{ color: s.color }} />
                </div>
                <div className="mt-3 text-[18px] sm:text-[20px] font-semibold text-white">{s.value}</div>
                <div className="text-[11px] sm:text-[12px] text-zinc-500 mt-1 leading-tight">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Journey steps + side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-display tracking-tight text-white">Your Journey Steps</h2>
          <div className="mt-5 relative">
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-[#27272A]" />
            {data.milestones.map((m, idx) => {
              const Icon = iconMap[m.icon] || Flag;
              const open = expanded === m.id;
              const { color: statusColor, bg: statusBg, label: statusLabel } = STATUS_STYLES[m.status] || STATUS_STYLES.upcoming;
              const reward = STEP_REWARDS[m.id] || 0;
              const isLocked = m.status === "upcoming";
              const linked = AUTO_ROUTE[m.id] || MANUAL_ROUTE[m.id];
              const canAct = m.status !== "completed" && !isLocked;
              return (
                <div key={m.id} className={`flex gap-5 items-start mb-4 relative ${isLocked ? "opacity-65" : ""}`} data-testid={`milestone-${m.id}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold z-10" style={{ background: statusBg, border: `1.5px solid ${statusColor}` }}>
                    {m.status === "completed"
                      ? <CheckCircle2 size={18} className="text-[#22C55E]" />
                      : isLocked
                      ? <Lock size={14} style={{ color: statusColor }} />
                      : <span style={{ color: statusColor }}>{idx + 1}</span>}
                  </div>
                  <div className="flex-1 onex-card-soft px-5 py-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: statusBg, border: `1px solid ${statusColor}44` }}>
                        <Icon size={18} style={{ color: statusColor }} />
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <div className="text-white text-[15px] font-medium flex items-center gap-2 flex-wrap">
                          {m.title}
                          {reward > 0 && (
                            <span className="onex-pill bg-[#8CFF2E]/12 text-[#8CFF2E] border border-[#8CFF2E]/25 !text-[10px]">+AED {reward}</span>
                          )}
                          {m.kind === "auto" && m.status !== "completed" && (
                            <span className="onex-pill bg-[#A78BFA]/15 text-[#A78BFA] !text-[10px]"><Zap size={9} /> Auto</span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-[12px] mt-0.5">{m.subtitle}</div>
                      </div>
                      {/* Inline always-visible CTA — no dropdown needed. */}
                      {canAct ? (
                        linked ? (
                          <button onClick={() => navigate(linked.route)} className="btn-gold !py-2 !px-4 text-[12.5px] whitespace-nowrap" data-testid={`milestone-go-${m.id}`}>
                            {linked.label} <ArrowRight size={13} />
                          </button>
                        ) : (
                          <button onClick={() => complete(m.id)} className="btn-gold !py-2 !px-4 text-[12.5px] whitespace-nowrap" data-testid={`milestone-complete-${m.id}`}>
                            Mark Complete <ArrowRight size={13} />
                          </button>
                        )
                      ) : (
                        <span className="onex-pill" style={{ background: `${statusColor}22`, color: statusColor }}>{statusLabel}</span>
                      )}
                      <button onClick={() => setExpanded(open ? null : m.id)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center" data-testid={`milestone-expand-${m.id}`}>
                        {open ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                      </button>
                    </div>
                    {open && (
                      <div className="mt-4 pt-4 border-t border-[#27272A] text-[13px] text-zinc-400 fade-in">
                        {m.status === "completed"
                          ? (m.completed_at ? `Completed ${new Date(m.completed_at).toLocaleDateString()}` : "Completed")
                          : isLocked
                          ? "Locks open once the previous step is complete."
                          : m.kind === "auto"
                          ? "Auto-completes the moment you take the action above."
                          : "Tap the button to mark this step complete and earn AED."}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <NextRewardCard
            nextReward={data.next_reward}
            percent={data.percent}
            completedCount={data.completed_count}
            total={data.total}
            balance={data.aed_balance}
            allDone={data.all_milestones_done}
            onCtaClick={() => navigate("/benefits-ladder")}
            onTopupClick={() => navigate("/benefits-ladder#topup")}
            onGoToAction={() => {
              // Send the user to the page where they can complete the *next* milestone.
              const next = data.milestones?.find((m) => m.status === "pending");
              if (!next) { navigate("/benefits-ladder"); return; }
              const route =
                AUTO_ROUTE[next.id]?.route ||
                MANUAL_ROUTE[next.id]?.route ||
                "/progress";
              navigate(route);
            }}
          />
          <div className="onex-card p-6" data-testid="need-help-card">
            <div className="flex items-center gap-2 text-[#A78BFA]"><Headphones size={16} /><span className="text-[13px] font-medium">Need Help?</span></div>
            <div className="text-white text-[15px] mt-4">We’re here to help you</div>
            <div className="text-zinc-500 text-[12px] mt-1">Chat with our support team for any assistance.</div>
            <button onClick={() => navigate("/support")} className="mt-5 w-full btn-ghost" data-testid="need-help-contact-btn">Contact Support <ArrowRight size={14} /></button>
          </div>
        </div>
      </div>

      <PhoneCaptureModal open={phoneOpen} onSubmit={handlePhoneSubmit} onClose={() => setPhoneOpen(false)} />
    </div>
  );
};

export default MyProgress;
