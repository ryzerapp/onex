import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate } from "react-router-dom";
import ProgressRing from "@/components/common/ProgressRing";
import {
  User, Lock, ArrowRight, CheckCircle2, Headphones, Camera, ShieldCheck, Home as HomeIcon,
  Building2, UserPlus, Calendar, Wallet, History,
} from "lucide-react";

const iconMap = { calendar: Calendar, "user-plus": UserPlus, "shield-check": ShieldCheck, home: HomeIcon, "building-2": Building2 };

const NEXT_TIER_RING_SIZE = 130;
const NEXT_TIER_RING_STROKE = 8;

const BenefitsLadder = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/benefits-ladder").then(({ data }) => setData(data)); }, []);
  if (!data) return <div className="text-zinc-500" data-testid="ladder-loading">Loading benefits…</div>;

  const balance = data.balance;
  const nextThreshold = data.next_tier.threshold;
  const nextPct = Math.min(100, Math.round((balance / nextThreshold) * 100));

  return (
    <div data-testid="benefits-ladder-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Benefits Ladder</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Every action lowers your future entry amount.</p>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
        <div className="xl:col-span-2 space-y-6">
          {/* Hero balance + skyline */}
          <div className="relative onex-card overflow-hidden onex-skyline min-h-[280px]" data-testid="ladder-hero-card">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A0A0B]/85 via-[#0A0A0B]/55 to-transparent" />
            <div className="relative p-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-zinc-300">Your AED Balance</div>
                <div className="text-[72px] sm:text-[88px] font-display font-medium text-[#FACC15] leading-none mt-3">AED {balance}</div>
                <div className="mt-4 text-zinc-300 text-[13px]">AED {data.next_tier.remaining} until {data.next_tier.name}</div>
                <div className="h-2 mt-3 rounded-full bg-white/10 overflow-hidden max-w-[280px]">
                  <div className="h-full bg-gradient-to-r from-[#FACC15] to-[#EAB308]" style={{ width: `${nextPct}%` }} />
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 max-w-sm ml-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FACC15]/15 border border-[#FACC15]/30 flex items-center justify-center"><User size={16} className="text-[#FACC15]" /></div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-zinc-400">Next Milestone</div>
                    <div className="text-white font-medium">{data.next_tier.name}</div>
                  </div>
                </div>
                <div className="mt-3 text-[12px] text-zinc-300">AED {nextThreshold} Balance required to unlock</div>
              </div>
            </div>
          </div>

          {/* Tier ladder */}
          <div className="onex-card p-8" data-testid="ladder-tiers-card">
            <div className="grid grid-cols-4 gap-3 sm:gap-6">
              {data.tiers.map((t, idx) => {
                const isCurrent = balance >= t.threshold && (idx + 1 === data.tiers.length || balance < data.tiers[idx + 1].threshold);
                const unlocked = balance >= t.threshold;
                return (
                  <div key={t.level} className="text-center relative" data-testid={`tier-${t.name.replace(/\s+/g, "-").toLowerCase()}`}>
                    {idx < data.tiers.length - 1 && (
                      <div className={`hidden sm:block absolute top-[34px] left-[55%] right-[-45%] h-px ${unlocked ? "bg-[#FACC15]" : "bg-[#27272A]"}`} />
                    )}
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Level {t.level}</div>
                    <div className={`relative w-16 h-16 rounded-full mx-auto flex items-center justify-center ${unlocked ? "onex-gold-fill onex-glow-gold" : "bg-[#15161A] border border-[#27272A] text-zinc-500"}`}>
                      {unlocked ? <User size={20} /> : <Lock size={18} />}
                    </div>
                    <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500">Level {t.level}</div>
                    <div className={`text-[13px] font-medium leading-tight mt-1 ${isCurrent ? "text-[#FACC15]" : "text-white"}`}>{t.name}</div>
                    <div className="onex-pill mt-2 bg-[#1E1F24] text-zinc-300">AED {t.threshold.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* You’re close + next-level benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="onex-card p-6" data-testid="ladder-close-card">
              <span className="onex-pill bg-[#FACC15]/15 text-[#FACC15]">You’re close!</span>
              <div className="flex items-center justify-between mt-5 gap-4">
                <div>
                  <div className="text-zinc-400 text-[13px]">You’re</div>
                  <div className="text-[44px] font-display text-[#FACC15] leading-none mt-1">AED {data.next_tier.remaining}</div>
                  <div className="text-zinc-400 text-[13px] mt-2">away from</div>
                  <div className="text-white text-[20px] font-semibold">{data.next_tier.name}</div>
                </div>
                <ProgressRing size={NEXT_TIER_RING_SIZE} stroke={NEXT_TIER_RING_STROKE} percent={nextPct}>
                  <div className="text-[22px] font-semibold text-white">{nextPct}%</div>
                </ProgressRing>
              </div>
              <div className="mt-4 text-[12px] text-zinc-500 flex items-center justify-between"><span>Progress to next level</span><span>AED {balance} / AED {nextThreshold}</span></div>
              <div className="h-2 mt-2 rounded-full bg-[#27272A] overflow-hidden"><div className="h-full bg-[#FACC15]" style={{ width: `${nextPct}%` }} /></div>
              <button onClick={() => navigate("/progress")} className="mt-5 w-full btn-gold" data-testid="ladder-continue-journey-btn">Continue Journey <ArrowRight size={16} /></button>
            </div>

            <div className="onex-card p-6" data-testid="ladder-next-benefits-card">
              <div className="flex items-center justify-between">
                <div className="text-zinc-400 text-[13px]">Next Level Benefits</div>
                <span className="onex-pill bg-white/10 text-white">Level {data.tiers.findIndex(t => t.name === data.next_tier.name) + 1 || 2}</span>
              </div>
              <div className="text-[22px] font-semibold text-white mt-3">{data.next_tier.name}</div>
              <div className="text-[#FACC15] text-[13px] mt-1">AED {nextThreshold.toLocaleString()} Balance</div>
              <ul className="mt-5 space-y-3">
                {(data.tiers.find(t => t.name === data.next_tier.name)?.benefits || []).map((b) => (
                  <li key={b} className="flex items-start gap-3 text-zinc-300 text-[14px]">
                    <CheckCircle2 size={16} className="text-[#FACC15] mt-0.5 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate("/co-owner-benefits")} className="mt-6 w-full btn-ghost" data-testid="ladder-view-benefits-btn">View All Benefits <ArrowRight size={14} /></button>
            </div>
          </div>

          {/* Ways to earn */}
          <div className="onex-card-soft p-6" data-testid="ladder-ways-to-earn">
            <h3 className="text-[20px] font-display text-white">Grow Your AED Balance</h3>
            <div className="text-zinc-500 text-[13px]">More actions. Lower entry.</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
              {data.ways_to_earn.map((w) => {
                const Icon = iconMap[w.icon] || Calendar;
                return (
                  <div key={w.id} className="onex-card-soft p-5 text-center hover:border-[#FACC15]/40 transition-all" data-testid={`way-${w.id}`}>
                    <div className="w-12 h-12 rounded-2xl bg-[#3A2F0F] border border-[#FACC15]/30 flex items-center justify-center mx-auto"><Icon size={18} className="text-[#FACC15]" /></div>
                    <div className="text-[13px] text-white font-medium mt-3 leading-tight">{w.title}</div>
                    <div className="text-[15px] font-semibold text-[#FACC15] mt-2">AED {w.aed}{w.id === "become_coowner" ? "+" : ""}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate("/progress")} className="mt-6 w-full btn-ghost border-[#FACC15]/30 text-[#FACC15]" data-testid="ladder-view-all-ways-btn">View All Ways to Earn AED <ArrowRight size={16} /></button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="onex-card p-6" data-testid="ladder-status-card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Your Status</div>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-14 h-14 rounded-full bg-[#FACC15]/15 border border-[#FACC15]/30 flex items-center justify-center"><User size={20} className="text-[#FACC15]" /></div>
              <div>
                <div className="text-[24px] font-display text-white leading-tight">Pre Co-Owner</div>
                <div className="text-zinc-400 text-[13px]">{data.current_tier} Tier</div>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">AED Balance</div>
              <div className="text-[28px] font-display text-[#FACC15]">AED {balance}</div>
            </div>
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Next Level</div>
              <div className="text-white text-[15px]">{data.next_tier.name}</div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Remaining</div>
              <div className="text-[#FACC15] text-[18px] font-semibold">AED {data.next_tier.remaining}</div>
            </div>
            <button onClick={() => navigate("/progress")} className="mt-5 w-full btn-gold" data-testid="ladder-earn-more-btn">Earn More AED <ArrowRight size={16} /></button>
          </div>

          <div className="onex-card p-6" data-testid="ladder-balance-summary-card">
            <h4 className="text-[16px] font-semibold text-white">Balance Summary</h4>
            <div className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between text-zinc-300"><span className="flex items-center gap-2"><Camera size={14} className="text-zinc-500" /> Total Earned</span><span className="font-semibold">AED {data.total_earned}</span></div>
              <div className="flex justify-between text-zinc-300"><span className="flex items-center gap-2"><Wallet size={14} className="text-zinc-500" /> Total Used</span><span className="font-semibold">AED {data.total_used}</span></div>
              <div className="flex justify-between text-zinc-300"><span className="flex items-center gap-2"><History size={14} className="text-zinc-500" /> Expires On</span><span className="font-semibold">Never</span></div>
            </div>
            <button onClick={() => navigate("/progress")} className="mt-5 w-full btn-ghost" data-testid="ladder-view-history-btn">View History <ArrowRight size={14} /></button>
          </div>

          <div className="onex-card p-6" data-testid="ladder-help-card">
            <div className="text-white text-[15px] font-medium">Need Help?</div>
            <div className="text-zinc-500 text-[12px] mt-1">Our team is here to help you on your journey.</div>
            <button onClick={() => navigate("/support")} className="mt-4 w-full btn-ghost" data-testid="ladder-help-contact-btn"><Headphones size={14} /> Contact Support</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsLadder;
