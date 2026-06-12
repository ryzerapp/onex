import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { devDebug } from "@/lib/devDebug";
import { Copy, Share2, MessageCircle, Send, Linkedin, Mail, UserPlus, CheckCircle2, Phone, ShieldCheck, Calendar } from "lucide-react";

const channelIcons = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "#22C55E" },
  { id: "telegram", label: "Telegram", icon: Send, color: "#60A5FA" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#A78BFA" },
  { id: "email", label: "Email", icon: Mail, color: "#FACC15" },
];

const missionIcons = { invite: UserPlus, verify_mobile: Phone, complete_kyc: ShieldCheck, attend_webinar: Calendar };

const InviteEarn = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/referrals").then(({ data }) => setData(data)); }, []);

  if (!data) return <div className="text-zinc-500" data-testid="invite-loading">Loading…</div>;

  const share = async (channel) => {
    try { await api.post("/referrals/share", { channel }); toast.success(`Shared via ${channel}`); }
    catch (e) { devDebug("[invite] share failed", e); }
  };
  const copyLink = () => {
    navigator.clipboard?.writeText(data.referral_link);
    toast.success("Referral link copied");
  };

  return (
    <div data-testid="invite-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Invite & Earn</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Grow the OneX community. Lower your future entry amount.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Left: referral link + share */}
        <div className="lg:col-span-2 onex-card p-8" data-testid="referral-link-card">
          <div className="text-[12px] uppercase tracking-[0.18em] text-[#FACC15]">Your Referral Link</div>
          <div className="mt-5 onex-card-soft p-3 flex items-center gap-3">
            <div className="flex-1 text-zinc-300 text-[13px] truncate px-3 py-2 bg-[#0A0A0B] rounded-xl border border-[#27272A]">{data.referral_link}</div>
            <button onClick={copyLink} data-testid="referral-copy-btn" className="btn-gold !py-2.5"><Copy size={14} /> Copy</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {channelIcons.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => share(c.id)}
                  data-testid={`share-${c.id}`}
                  className="onex-card-soft p-4 flex items-center gap-3 hover:border-[#FACC15]/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${c.color}1F`, border: `1px solid ${c.color}44` }}>
                    <Icon size={16} style={{ color: c.color }} />
                  </div>
                  <span className="text-white text-[13px] font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              { label: "Invites Sent", value: data.stats.invites_sent, icon: Share2, color: "#60A5FA" },
              { label: "Verified", value: data.stats.verified, icon: CheckCircle2, color: "#22C55E" },
              { label: "KYC Completed", value: data.stats.kyc_completed, icon: ShieldCheck, color: "#A78BFA" },
              { label: "AED Earned", value: `AED ${data.stats.aed_earned}`, icon: UserPlus, color: "#FACC15" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="onex-card-soft p-4" data-testid={`referral-stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                  <Icon size={16} style={{ color: s.color }} />
                  <div className="text-[20px] font-semibold text-white mt-3">{s.value}</div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-[0.12em] mt-1">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: missions */}
        <div className="onex-card p-6" data-testid="referral-missions-card">
          <h3 className="text-white text-[18px] font-semibold">Referral Missions</h3>
          <p className="text-zinc-500 text-[12px]">Earn at each step of your friend’s journey.</p>
          <div className="mt-5 space-y-3">
            {data.missions.map((m) => {
              const Icon = missionIcons[m.id] || UserPlus;
              return (
                <div key={m.id} className="onex-card-soft p-4 flex items-center gap-3" data-testid={`mission-${m.id}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${m.completed ? "bg-[#1F3A2D] border border-[#22C55E]/40" : "bg-[#3A2F0F] border border-[#FACC15]/30"}`}>
                    {m.completed ? <CheckCircle2 size={16} className="text-[#22C55E]" /> : <Icon size={16} className="text-[#FACC15]" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-white text-[14px] font-medium">{m.title}</div>
                    <div className="text-zinc-500 text-[12px]">{m.subtitle}</div>
                  </div>
                  <div className={`text-[13px] font-semibold ${m.completed ? "text-[#22C55E]" : "text-[#FACC15]"}`}>+AED {m.aed}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteEarn;
