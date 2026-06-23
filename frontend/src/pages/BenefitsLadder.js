import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import ProgressRing from "@/components/common/ProgressRing";
import TopUpModal, { POLL_INTERVAL_MS, MAX_POLLS } from "@/components/payments/TopUpModal";
import LevelDetailModal from "@/components/levels/LevelDetailModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  User, Lock, ArrowRight, CheckCircle2, Headphones, Camera, ShieldCheck, Home as HomeIcon,
  Building2, UserPlus, Calendar, Wallet, History, Plus, Loader2,
} from "lucide-react";

const iconMap = { calendar: Calendar, "user-plus": UserPlus, "shield-check": ShieldCheck, home: HomeIcon, "building-2": Building2 };

const NEXT_TIER_RING_SIZE = 130;
const NEXT_TIER_RING_STROKE = 8;

const BenefitsLadder = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [activeTier, setActiveTier] = useState(null);
  const [pollState, setPollState] = useState(null); // null | "polling" | "success" | "expired"

  const load = useCallback(() => api.get("/benefits-ladder").then(({ data }) => setData(data)), []);
  const loadHistory = useCallback(() => api.get("/payments/history").then(({ data }) => setHistory(data.transactions)), []);
  useEffect(() => { load(); loadHistory(); }, [load, loadHistory]);

  // Handle Stripe return — poll /api/payments/status/{session_id} until paid or expired
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const topupStatus = searchParams.get("topup");
    if (!sessionId) {
      if (topupStatus === "cancel") {
        toast.message("Top-up cancelled", { description: "Your card was not charged." });
        setSearchParams({}, { replace: true });
      }
      return;
    }

    setPollState("polling");
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      attempts += 1;
      try {
        const { data: status } = await api.get(`/payments/status/${sessionId}`);
        if (cancelled) return;
        if (status.payment_status === "paid") {
          setPollState("success");
          toast.success(`+AED ${status.aed_credited} credited`, { description: `New balance: AED ${status.aed_balance}` });
          await refresh();
          load();
          loadHistory();
          setSearchParams({}, { replace: true });
          return;
        }
        if (status.status === "expired") {
          setPollState("expired");
          toast.error("Checkout expired. Please try again.");
          setSearchParams({}, { replace: true });
          return;
        }
        if (attempts >= MAX_POLLS) {
          setPollState("expired");
          toast.message("Still processing", { description: "We'll credit your balance the moment Stripe confirms." });
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        if (cancelled) return;
        if (attempts >= MAX_POLLS) {
          setPollState("expired");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [searchParams, setSearchParams, refresh, load, loadHistory]);

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
                <div className="text-[72px] sm:text-[88px] font-display font-medium text-[#8CFF2E] leading-none mt-3">AED {balance}</div>
                <div className="mt-4 text-zinc-300 text-[13px]">AED {data.next_tier.remaining} until {data.next_tier.name}</div>
                <div className="h-2 mt-3 rounded-full bg-white/10 overflow-hidden max-w-[280px]">
                  <div className="h-full bg-gradient-to-r from-[#8CFF2E] to-[#6DDB1E]" style={{ width: `${nextPct}%` }} />
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 max-w-sm ml-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#8CFF2E]/15 border border-[#8CFF2E]/30 flex items-center justify-center"><User size={16} className="text-[#8CFF2E]" /></div>
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
            <div className="relative grid grid-cols-4 gap-3 sm:gap-6">
              {/* Animated connector — runs through the icon centers, behind the buttons.
                  Vertically anchored to the icon row (eyebrow ~24px + icon-half 32px = 56px).
                  Horizontally spans from first icon center to last icon center. */}
              <div className="hidden sm:block absolute top-[56px] left-[12.5%] right-[12.5%] h-[2px] -z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[#27272A] rounded-full" />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#8CFF2E] to-[#22C55E] rounded-full transition-[width] duration-700"
                  style={{
                    width: `${Math.min(100, Math.round(
                      (data.tiers.findIndex(
                        (t, i) => balance < t.threshold || i === data.tiers.length - 1
                      ) / Math.max(1, data.tiers.length - 1)) * 100
                    ))}%`,
                  }}
                />
                {/* Live shimmer that sweeps along the line to draw the eye forward. */}
                <div className="absolute inset-y-0 w-1/3 onex-shimmer-sweep rounded-full" />
              </div>

              {data.tiers.map((t, idx) => {
                const isCurrent = balance >= t.threshold && (idx + 1 === data.tiers.length || balance < data.tiers[idx + 1].threshold);
                const unlocked = balance >= t.threshold;
                return (
                  <button key={t.level} onClick={() => setActiveTier(t)} className="text-center relative group z-10" data-testid={`tier-${t.name.replace(/\s+/g, "-").toLowerCase()}`}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Level {t.level}</div>
                    <div className={`relative w-16 h-16 rounded-full mx-auto flex items-center justify-center group-hover:scale-105 transition-transform ${unlocked ? "onex-gold-fill onex-glow-gold" : "bg-[#15161A] border border-[#27272A] text-zinc-500"}`}>
                      {unlocked ? <User size={20} /> : <Lock size={18} />}
                    </div>
                    <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500">Level {t.level}</div>
                    <div className={`text-[13px] font-medium leading-tight mt-1 ${isCurrent ? "text-[#8CFF2E]" : "text-white"}`}>{t.name}</div>
                    <div className="onex-pill mt-2 bg-[#1E1F24] text-zinc-300">AED {t.threshold.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* You’re close + next-level benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="onex-card p-6" data-testid="ladder-close-card">
              <span className="onex-pill bg-[#8CFF2E]/15 text-[#8CFF2E]">You’re close!</span>
              <div className="flex items-center justify-between mt-5 gap-4">
                <div>
                  <div className="text-zinc-400 text-[13px]">You’re</div>
                  <div className="text-[44px] font-display text-[#8CFF2E] leading-none mt-1">AED {data.next_tier.remaining}</div>
                  <div className="text-zinc-400 text-[13px] mt-2">away from</div>
                  <div className="text-white text-[20px] font-semibold">{data.next_tier.name}</div>
                </div>
                <ProgressRing size={NEXT_TIER_RING_SIZE} stroke={NEXT_TIER_RING_STROKE} percent={nextPct}>
                  <div className="text-[22px] font-semibold text-white">{nextPct}%</div>
                </ProgressRing>
              </div>
              <div className="mt-4 text-[12px] text-zinc-500 flex items-center justify-between"><span>Progress to next level</span><span>AED {balance} / AED {nextThreshold}</span></div>
              <div className="h-2 mt-2 rounded-full bg-[#27272A] overflow-hidden"><div className="h-full bg-[#8CFF2E]" style={{ width: `${nextPct}%` }} /></div>
              <button onClick={() => navigate("/progress")} className="mt-5 w-full btn-gold" data-testid="ladder-continue-journey-btn">Continue Journey <ArrowRight size={16} /></button>
            </div>

            <div className="onex-card p-6" data-testid="ladder-next-benefits-card">
              <div className="flex items-center justify-between">
                <div className="text-zinc-400 text-[13px]">Next Level Benefits</div>
                <span className="onex-pill bg-white/10 text-white">Level {data.tiers.findIndex(t => t.name === data.next_tier.name) + 1 || 2}</span>
              </div>
              <div className="text-[22px] font-semibold text-white mt-3">{data.next_tier.name}</div>
              <div className="text-[#8CFF2E] text-[13px] mt-1">AED {nextThreshold.toLocaleString()} Balance</div>
              <ul className="mt-5 space-y-3">
                {(data.tiers.find(t => t.name === data.next_tier.name)?.benefits || []).map((b) => (
                  <li key={b} className="flex items-start gap-3 text-zinc-300 text-[14px]">
                    <CheckCircle2 size={16} className="text-[#8CFF2E] mt-0.5 shrink-0" />
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
                  <div key={w.id} className="onex-card-soft p-5 text-center hover:border-[#8CFF2E]/40 transition-all" data-testid={`way-${w.id}`}>
                    <div className="w-12 h-12 rounded-2xl bg-[#1F3008] border border-[#8CFF2E]/30 flex items-center justify-center mx-auto"><Icon size={18} className="text-[#8CFF2E]" /></div>
                    <div className="text-[13px] text-white font-medium mt-3 leading-tight">{w.title}</div>
                    <div className="text-[15px] font-semibold text-[#8CFF2E] mt-2">AED {w.aed}{w.id === "become_coowner" ? "+" : ""}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate("/progress")} className="mt-6 w-full btn-ghost border-[#8CFF2E]/30 text-[#8CFF2E]" data-testid="ladder-view-all-ways-btn">View All Ways to Earn AED <ArrowRight size={16} /></button>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="onex-card p-6" data-testid="ladder-status-card">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Your Status</div>
            <div className="flex items-center gap-4 mt-3">
              <div className="w-14 h-14 rounded-full bg-[#8CFF2E]/15 border border-[#8CFF2E]/30 flex items-center justify-center"><User size={20} className="text-[#8CFF2E]" /></div>
              <div>
                <div className="text-[24px] font-display text-white leading-tight">Pre Co-Owner</div>
                <div className="text-zinc-400 text-[13px]">{data.current_tier} Tier</div>
              </div>
            </div>
            <div className="mt-6">
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">AED Balance</div>
              <div className="text-[28px] font-display text-[#8CFF2E]">AED {balance}</div>
            </div>
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Next Level</div>
              <div className="text-white text-[15px]">{data.next_tier.name}</div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Remaining</div>
              <div className="text-[#8CFF2E] text-[18px] font-semibold">AED {data.next_tier.remaining}</div>
            </div>
            <button onClick={() => navigate("/progress")} className="mt-5 w-full btn-gold" data-testid="ladder-earn-more-btn">Earn More AED <ArrowRight size={16} /></button>
            <button onClick={() => setTopupOpen(true)} className="mt-3 w-full btn-ghost border-[#8CFF2E]/40 text-[#8CFF2E]" data-testid="ladder-topup-btn">
              {pollState === "polling" ? <><Loader2 size={14} className="animate-spin" /> Confirming top-up…</> : <><Plus size={14} /> Top up AED Balance</>}
            </button>
          </div>

          <div className="onex-card p-6" data-testid="ladder-balance-summary-card">
            <h4 className="text-[16px] font-semibold text-white">Balance Summary</h4>
            <div className="mt-4 space-y-3 text-[13px]">
              <div className="flex justify-between text-zinc-300"><span className="flex items-center gap-2"><Camera size={14} className="text-zinc-500" /> Total Earned</span><span className="font-semibold">AED {data.total_earned}</span></div>
              <div className="flex justify-between text-zinc-300"><span className="flex items-center gap-2"><Wallet size={14} className="text-zinc-500" /> Total Used</span><span className="font-semibold">AED {data.total_used}</span></div>
              <div className="flex justify-between text-zinc-300"><span className="flex items-center gap-2"><History size={14} className="text-zinc-500" /> Expires On</span><span className="font-semibold">Never</span></div>
            </div>

            {history.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[#27272A]" data-testid="ladder-recent-topups">
                <div className="flex items-center justify-between">
                  <div className="text-[12px] uppercase tracking-[0.15em] text-zinc-500">Recent Top-Ups</div>
                  <button onClick={() => setShowHistory((v) => !v)} data-testid="ladder-toggle-topups" className="text-[12px] text-[#8CFF2E] hover:underline">
                    {showHistory ? "Hide" : `View ${history.length}`}
                  </button>
                </div>
                {showHistory && (
                  <div className="mt-3 space-y-2 fade-in">
                    {history.slice(0, 5).map((t) => (
                      <div key={t.session_id} className="flex items-center justify-between text-[13px] onex-card-soft p-3" data-testid={`topup-row-${t.session_id}`}>
                        <div>
                          <div className="text-white font-medium">{t.package_name}</div>
                          <div className="text-zinc-500 text-[11px]">{new Date(t.credited_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#8CFF2E] font-semibold">+AED {t.aed_amount.toLocaleString()}</div>
                          <div className="text-zinc-500 text-[11px]">${t.amount_usd.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => navigate("/progress")} className="mt-5 w-full btn-ghost" data-testid="ladder-view-history-btn">View History <ArrowRight size={14} /></button>
          </div>

          <div className="onex-card p-6" data-testid="ladder-help-card">
            <div className="text-white text-[15px] font-medium">Need Help?</div>
            <div className="text-zinc-500 text-[12px] mt-1">Our team is here to help you on your journey.</div>
            <button onClick={() => navigate("/support")} className="mt-4 w-full btn-ghost" data-testid="ladder-help-contact-btn"><Headphones size={14} /> Contact Support</button>
          </div>
        </div>
      </div>
      <TopUpModal open={topupOpen} onClose={() => setTopupOpen(false)} />
      <LevelDetailModal
        tier={activeTier}
        currentBalance={balance}
        onClose={() => setActiveTier(null)}
        onAction={(a) => {
          setActiveTier(null);
          // Top-up actions return route="topup" — open the in-page TopUpModal.
          if (a.route === "topup" || (typeof a.route === "string" && a.route.endsWith("#topup"))) {
            setTopupOpen(true);
            return;
          }
          navigate(a.route);
        }}
      />
    </div>
  );
};

export default BenefitsLadder;
