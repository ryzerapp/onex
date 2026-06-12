import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProgressRing from "@/components/common/ProgressRing";
import {
  ArrowLeft, Flag, UserPlus, Smartphone, IdCard, Calendar, PieChart,
  CheckCircle2, Gift, Headphones, ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";

const iconMap = { "user-plus": UserPlus, smartphone: Smartphone, "id-card": IdCard, calendar: Calendar, "pie-chart": PieChart };

const MyProgress = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = () => api.get("/progress").then(({ data }) => setData(data));
  useEffect(() => { load(); }, []);

  const complete = async (id) => {
    try {
      const { data: r } = await api.post("/progress/complete", { milestone_id: id });
      toast.success(r.granted ? `+AED ${r.granted} added to your balance` : "Step marked complete");
      load();
    } catch { toast.error("Could not update milestone"); }
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
              const statusColor = m.status === "completed" ? "#22C55E" : m.status === "pending" ? "#FACC15" : "#71717A";
              const statusBg = m.status === "completed" ? "#1F3A2D" : m.status === "pending" ? "#3A2F0F" : "#1E1F24";
              const statusLabel = m.status === "completed" ? "Completed" : m.status === "pending" ? "Pending" : "Upcoming";
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
          <div className="onex-card p-6" data-testid="next-reward-card">
            <div className="flex items-center gap-2 text-[#FACC15]"><Gift size={16} /><span className="text-[13px] font-medium">Next Reward</span></div>
            <div className="mt-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl onex-gold-fill flex items-center justify-center font-bold text-xl">1X</div>
              <div>
                <div className="text-[28px] font-semibold text-[#FACC15]">+AED 50</div>
                <div className="text-[12px] text-zinc-500">Complete {data.upcoming_count} more steps</div>
              </div>
            </div>
            <div className="h-2 mt-5 rounded-full bg-[#27272A] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FACC15] to-[#EAB308]" style={{ width: `${data.percent}%` }} />
            </div>
            <div className="text-right text-[11px] text-zinc-500 mt-2 tabular-nums">{data.completed_count} / {data.total} completed</div>
          </div>
          <div className="onex-card p-6" data-testid="need-help-card">
            <div className="flex items-center gap-2 text-[#A78BFA]"><Headphones size={16} /><span className="text-[13px] font-medium">Need Help?</span></div>
            <div className="text-white text-[15px] mt-4">We’re here to help you</div>
            <div className="text-zinc-500 text-[12px] mt-1">Chat with our support team for any assistance.</div>
            <button onClick={() => navigate("/support")} className="mt-5 w-full btn-ghost" data-testid="need-help-contact-btn">Contact Support <ArrowRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProgress;
