import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProgressRing from "@/components/common/ProgressRing";
import PhoneCaptureModal from "@/components/progress/PhoneCaptureModal";
import {
  ArrowLeft, Flag, UserPlus, Smartphone, IdCard, Calendar, PieChart,
  CheckCircle2, Gift, Headphones, ChevronDown, ChevronUp, ArrowRight,
  Trophy, Crown,
} from "lucide-react";

const iconMap = { "user-plus": UserPlus, smartphone: Smartphone, "id-card": IdCard, calendar: Calendar, "pie-chart": PieChart };

const PROGRESS_RING_SIZE = 160;
const PROGRESS_RING_STROKE = 10;

const STATUS_STYLES = {
  completed: { color: "#22C55E", bg: "#1F3A2D", label: "Completed" },
  pending: { color: "#FACC15", bg: "#3A2F0F", label: "Pending" },
  upcoming: { color: "#71717A", bg: "#1E1F24", label: "Upcoming" },
};

const NextRewardCard = ({ nextReward, percent, completedCount, total, balance, allDone, onCtaClick }) => {
  if (!nextReward) return null;

  if (nextReward.kind === "maxed") {
    return (
      <div className="onex-card p-6" data-testid="next-reward-card">
        <div className="flex items-center gap-2 text-[#FACC15]">
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
        <button onClick={onCtaClick} className="mt-5 w-full btn-ghost border-[#FACC15]/40 text-[#FACC15]" data-testid="next-reward-elite-cta">
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
        <div className="flex items-center gap-2 text-[#FACC15]">
          <Trophy size={16} />
          <span className="text-[13px] font-medium">Next Tier Reward</span>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 onex-pill bg-[#22C55E]/15 text-[#22C55E]" data-testid="journey-complete-pill">
          <CheckCircle2 size={12} /> Journey complete
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl onex-gold-fill flex items-center justify-center font-bold text-xl">1X</div>
          <div>
            <div className="text-[24px] font-semibold text-[#FACC15]">AED {nextReward.amount}</div>
            <div className="text-[12px] text-zinc-500">to unlock {nextReward.tier_name}</div>
          </div>
        </div>
        <div className="h-2 mt-5 rounded-full bg-[#27272A] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FACC15] to-[#EAB308]" style={{ width: `${tierPct}%` }} />
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
      <div className="flex items-center gap-2 text-[#FACC15]"><Gift size={16} /><span className="text-[13px] font-medium">Next Reward</span></div>
      <div className="mt-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl onex-gold-fill flex items-center justify-center font-bold text-xl">1X</div>
        <div>
          <div className="text-[28px] font-semibold text-[#FACC15]">+AED {nextReward.amount}</div>
          <div className="text-[12px] text-zinc-500">Complete {nextReward.label}</div>
        </div>
      </div>
      <div className="h-2 mt-5 rounded-full bg-[#27272A] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#FACC15] to-[#EAB308]" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-right text-[11px] text-zinc-500 mt-2 tabular-nums">{completedCount} / {total} completed</div>
      {allDone && (
        <div className="mt-3 text-[12px] text-[#22C55E]">Journey complete — keep earning AED to unlock the next tier.</div>
      )}
    </div>
  );
};

const MyProgress = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const load = useCallback(() => api.get("/progress").then(({ data }) => setData(data)), []);
  useEffect(() => { load(); }, [load]);

  const finishMilestone = async (id, extras = {}) => {
    const { data: r } = await api.post("/progress/complete", { milestone_id: id, ...extras });
    toast.success(r.granted ? `+AED ${r.granted} added to your balance` : "Step marked complete");
    load();
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
            <Flag className="text-[#FACC15]" size={36} />
          </ProgressRing>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: CheckCircle2, color: "#22C55E", bg: "#1F3A2D", value: `${data.completed_count} / ${data.total}`, label: "Steps Completed" },
            { icon: Calendar, color: "#A78BFA", bg: "#2A1F4A", value: data.upcoming_count, label: "Upcoming Steps" },
            { icon: Gift, color: "#FACC15", bg: "#3A2F0F", value: `AED ${data.to_next_reward}`, label: "To Next Reward" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: s.bg, border: `1px solid ${s.color}44` }}>
                  <Icon size={20} style={{ color: s.color }} />
                </div>
                <div className="mt-3 text-[20px] font-semibold text-white">{s.value}</div>
                <div className="text-[12px] text-zinc-500 mt-1">{s.label}</div>
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
              return (
                <div key={m.id} className="flex gap-5 items-start mb-4 relative" data-testid={`milestone-${m.id}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold z-10" style={{ background: statusBg, border: `1.5px solid ${statusColor}` }}>
                    {m.status === "completed" ? <CheckCircle2 size={18} className="text-[#22C55E]" /> : <span style={{ color: statusColor }}>{idx + 1}</span>}
                  </div>
                  <div className="flex-1 onex-card-soft px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: statusBg, border: `1px solid ${statusColor}44` }}>
                        <Icon size={18} style={{ color: statusColor }} />
                      </div>
                      <div className="flex-1">
                        <div className="text-white text-[15px] font-medium">{m.title}</div>
                        <div className="text-zinc-500 text-[12px] mt-0.5">{m.subtitle}</div>
                      </div>
                      <span className="onex-pill" style={{ background: `${statusColor}22`, color: statusColor }}>{statusLabel}</span>
                      <button onClick={() => setExpanded(open ? null : m.id)} className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center" data-testid={`milestone-expand-${m.id}`}>
                        {open ? <ChevronUp size={14} className="text-zinc-400" /> : <ChevronDown size={14} className="text-zinc-400" />}
                      </button>
                    </div>
                    {open && (
                      <div className="mt-4 pt-4 border-t border-[#27272A] flex items-center justify-between fade-in">
                        <div className="text-[13px] text-zinc-400">{m.completed_at ? `Completed ${new Date(m.completed_at).toLocaleDateString()}` : "Tap below to mark this step complete and earn AED."}</div>
                        {m.status !== "completed" && (
                          <button onClick={() => complete(m.id)} className="btn-gold !py-2 !px-5 text-[13px]" data-testid={`milestone-complete-${m.id}`}>
                            Mark Complete <ArrowRight size={14} />
                          </button>
                        )}
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
