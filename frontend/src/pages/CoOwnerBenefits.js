import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { Lock, Sparkles } from "lucide-react";

const CoOwnerBenefits = () => {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/co-owner-benefits").then(({ data }) => setData(data)); }, []);
  if (!data) return <div className="text-zinc-500" data-testid="co-benefits-loading">Loading benefits…</div>;

  return (
    <div data-testid="co-owner-benefits-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Co-Owner Benefits</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Exceptional experiences. Unlocked as you grow your AED Balance.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {data.benefits.map((b) => (
          <div key={b.id} className={`onex-card overflow-hidden flex flex-col transition-all ${b.unlocked ? "hover:-translate-y-1 hover:border-[#FACC15]/30" : "opacity-90"}`} data-testid={`benefit-${b.id}`}>
            <div className="relative h-56">
              <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/30 to-transparent" />
              {!b.unlocked && (
                <div className="absolute inset-0 backdrop-blur-[2px] bg-[#0A0A0B]/40 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-black/60 border border-white/15 flex items-center justify-center"><Lock size={20} className="text-white" /></div>
                </div>
              )}
              <span className="absolute top-4 left-4 onex-pill bg-black/40 text-white backdrop-blur-md">{b.unlock_tier}</span>
              {b.unlocked && <span className="absolute top-4 right-4 onex-pill onex-gold-fill"><Sparkles size={11} /> Unlocked</span>}
            </div>
            <div className="p-6 flex-1">
              <h3 className="text-white text-[18px] font-semibold leading-tight">{b.title}</h3>
              <p className="text-zinc-400 text-[13px] mt-2 leading-relaxed">{b.description}</p>
              <div className="mt-4 flex items-center justify-between text-[12px]">
                <span className="text-zinc-500">Unlock at AED {b.unlock_threshold.toLocaleString()}</span>
                <span className={b.unlocked ? "text-[#22C55E]" : "text-[#FACC15]"}>{b.unlocked ? "Available now" : `AED ${b.unlock_threshold - data.current_balance} to go`}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoOwnerBenefits;
