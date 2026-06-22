import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import LevelDetailModal from "@/components/levels/LevelDetailModal";

const TIER_THRESHOLDS = {
  "Co-Owner Member": { level: 1, threshold: 500 },
  "Priority Co-Owner": { level: 2, threshold: 2500 },
  "Co-Owner Circle": { level: 3, threshold: 5000 },
  "Elite Co-Owner": { level: 4, threshold: 10000 },
};

const CoOwnerBenefits = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activeTier, setActiveTier] = useState(null);
  useEffect(() => { api.get("/co-owner-benefits").then(({ data }) => setData(data)); }, []);
  if (!data) return <div className="text-zinc-500" data-testid="co-benefits-loading">Loading benefits…</div>;

  // Group benefits by tier for a more solid, level-connected layout.
  const groups = data.benefits.reduce((acc, b) => {
    (acc[b.unlock_tier] = acc[b.unlock_tier] || []).push(b);
    return acc;
  }, {});
  const orderedTiers = ["Co-Owner Member", "Priority Co-Owner", "Co-Owner Circle", "Elite Co-Owner"]
    .filter((t) => groups[t]);

  return (
    <div data-testid="co-owner-benefits-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Co-Owner Benefits</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Exceptional experiences. Unlocked as you grow your AED Balance.</p>

      <div className="onex-card mt-8 p-6 flex items-center gap-4 flex-wrap" data-testid="co-benefits-current-state">
        <div className="w-12 h-12 rounded-2xl onex-gold-fill flex items-center justify-center"><Sparkles size={18} /></div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[12px] uppercase tracking-[0.15em] text-zinc-500">Your AED Balance</div>
          <div className="text-[#FACC15] text-[28px] font-display">AED {data.current_balance.toLocaleString()}</div>
        </div>
        <button onClick={() => navigate("/benefits-ladder")} className="btn-ghost border-[#FACC15]/30 text-[#FACC15]" data-testid="co-benefits-ladder-link">
          Open Benefits Ladder <ArrowRight size={14} />
        </button>
      </div>

      {orderedTiers.map((tierName) => {
        const tierMeta = TIER_THRESHOLDS[tierName];
        const tierUnlocked = data.current_balance >= tierMeta.threshold;
        return (
          <section key={tierName} className="mt-10" data-testid={`tier-section-${tierName.replace(/\s+/g, "-").toLowerCase()}`}>
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-[12px] uppercase tracking-[0.18em] text-[#FACC15]">Level {tierMeta.level}</span>
                <h2 className="text-2xl font-display text-white">{tierName}</h2>
                <span className={`onex-pill ${tierUnlocked ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-white/5 text-zinc-400"}`}>
                  {tierUnlocked ? "Unlocked" : `AED ${tierMeta.threshold.toLocaleString()} to unlock`}
                </span>
              </div>
              <button onClick={() => setActiveTier({ level: tierMeta.level, name: tierName, threshold: tierMeta.threshold })} data-testid={`tier-details-${tierMeta.level}`} className="text-[12px] text-[#FACC15] hover:underline flex items-center gap-1">
                See tier details <ArrowRight size={12} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {groups[tierName].map((b) => (
                <div key={b.id} className={`onex-card overflow-hidden flex flex-col transition-all ${b.unlocked ? "hover:-translate-y-1 hover:border-[#FACC15]/30" : "opacity-90"}`} data-testid={`benefit-${b.id}`}>
                  <div className="relative h-52">
                    <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/30 to-transparent" />
                    {!b.unlocked && (
                      <div className="absolute inset-0 backdrop-blur-[2px] bg-[#0A0A0B]/40 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-black/60 border border-white/15 flex items-center justify-center"><Lock size={20} className="text-white" /></div>
                      </div>
                    )}
                    {b.unlocked && <span className="absolute top-4 right-4 onex-pill onex-gold-fill"><Sparkles size={11} /> Unlocked</span>}
                  </div>
                  <div className="p-6 flex-1">
                    <h3 className="text-white text-[17px] font-semibold leading-tight">{b.title}</h3>
                    <p className="text-zinc-400 text-[13px] mt-2 leading-relaxed">{b.description}</p>
                    <div className="mt-4 flex items-center justify-between text-[12px]">
                      <span className="text-zinc-500">Unlock at AED {b.unlock_threshold.toLocaleString()}</span>
                      <span className={b.unlocked ? "text-[#22C55E]" : "text-[#FACC15]"}>{b.unlocked ? "Available now" : `AED ${Math.max(0, b.unlock_threshold - data.current_balance)} to go`}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <LevelDetailModal
        tier={activeTier}
        currentBalance={data.current_balance}
        onClose={() => setActiveTier(null)}
        onAction={(a) => { setActiveTier(null); navigate(a.route.replace("#topup", "")); }}
      />
    </div>
  );
};

export default CoOwnerBenefits;
