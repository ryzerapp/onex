import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { Check, RotateCcw, Plus, Target, Bell, Users, Lightbulb, ArrowRight, Building2, Home as HomeIcon, Diamond, BedDouble, Sparkles } from "lucide-react";

const categoryIcons = {
  cat_residential: Building2,
  cat_airbnb: HomeIcon,
  cat_commercial: Building2,
  cat_luxury: Diamond,
  cat_hospitality: BedDouble,
};

const AllocationInterests = () => {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);

  const load = useCallback(() => api.get("/allocation-interests").then(({ data }) => { setCategories(data.categories); setSelected(data.selected_ids); }), []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const reset = () => setSelected([]);
  const save = async () => {
    try { await api.post("/allocation-interests", { category_ids: selected }); toast.success("Your preferences are saved."); }
    catch { toast.error("Could not save preferences"); }
  };

  return (
    <div data-testid="allocation-interests-page">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Allocation Interests</h1>
          <p className="text-zinc-400 mt-2 text-[15px]">Choose the types of properties you’re most interested in.</p>
        </div>
        <div className="onex-card p-5 max-w-sm flex items-center gap-4" data-testid="why-set-interests-card">
          <div className="w-12 h-12 rounded-full bg-[#3A2F0F] border border-[#FACC15]/30 flex items-center justify-center"><Sparkles size={16} className="text-[#FACC15]" /></div>
          <div>
            <div className="text-white text-[14px] font-medium">Why set your interests?</div>
            <div className="text-zinc-500 text-[12px] mt-1">We’ll prioritize opportunities that match your preferences.</div>
            <button className="mt-2 text-[#FACC15] text-[12px] hover:underline flex items-center gap-1" data-testid="learn-more-interests-btn">Learn More <ArrowRight size={12} /></button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <div className="text-white text-[20px] font-display">Your Selection <span className="onex-gold-text">({selected.length}/{categories.length} selected)</span></div>
        <button onClick={reset} className="btn-ghost text-zinc-300" data-testid="reset-interests-btn"><RotateCcw size={14} /> Reset All</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 mt-5">
        {categories.map((c) => {
          const isSelected = selected.includes(c.id);
          const Icon = categoryIcons[c.id] || Target;
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              data-testid={`category-${c.id}`}
              className={`onex-card relative overflow-hidden text-left transition-all ${isSelected ? "ring-2 ring-[#FACC15] !border-[#FACC15]" : "hover:border-[#FACC15]/30"}`}
            >
              <div className="relative h-44">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/40 to-transparent" />
                <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-[#FACC15]/15 border border-[#FACC15]/30 backdrop-blur-md flex items-center justify-center"><Icon size={16} className="text-[#FACC15]" /></div>
                <div className={`absolute top-3 right-3 w-7 h-7 rounded-full border flex items-center justify-center transition-all ${isSelected ? "onex-gold-fill border-[#FACC15]" : "bg-black/40 border-white/20"}`}>
                  {isSelected && <Check size={14} />}
                </div>
              </div>
              <div className="p-4">
                <div className="text-white text-[16px] font-semibold">{c.name}</div>
                <div className="text-zinc-400 text-[12px] mt-2 leading-relaxed">{c.description}</div>
                <span className="onex-pill mt-3 bg-white/5 text-zinc-300">{c.badge}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary + How it works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        <div className="lg:col-span-2 onex-card p-6" data-testid="interest-summary-card">
          <h3 className="text-white text-[18px] font-semibold">Your Interest Summary</h3>
          <p className="text-zinc-500 text-[12px]">You’ve selected {selected.length} out of {categories.length} property types.</p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selected.length === 0 && <div className="text-zinc-500 text-[13px] col-span-2 px-2">Select at least one category above.</div>}
            {selected.map((id) => {
              const c = categories.find(x => x.id === id);
              if (!c) return null;
              return (
                <div key={id} className="flex items-center gap-3 onex-card-soft p-3" data-testid={`summary-${id}`}>
                  <img src={c.image} alt={c.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-1 text-white text-[14px] font-medium">{c.name}</div>
                  <div className="w-6 h-6 rounded-full onex-gold-fill flex items-center justify-center"><Check size={12} /></div>
                </div>
              );
            })}
          </div>
          {selected.length < categories.length && (
            <div className="mt-5 onex-card-soft p-4 flex items-center gap-3" data-testid="select-more-cta">
              <div className="w-10 h-10 rounded-2xl bg-[#15161A] border border-[#27272A] flex items-center justify-center"><Plus size={16} className="text-zinc-400" /></div>
              <div>
                <div className="text-white text-[14px] font-medium">Select up to {categories.length - selected.length} more interests</div>
                <div className="text-zinc-500 text-[12px]">This helps us match you with the best opportunities.</div>
              </div>
            </div>
          )}
        </div>

        <div className="onex-card p-6" data-testid="how-it-works-card">
          <div className="flex items-center gap-2 text-[#FACC15] mb-3"><Lightbulb size={16} /><span className="font-medium">How it works</span></div>
          {[
            { icon: Target, title: "We match opportunities", body: "Get early access to properties that match your interests." },
            { icon: Bell, title: "You stay updated", body: "Receive alerts for launches and high-return opportunities." },
            { icon: Users, title: "You invest with confidence", body: "Choose the right properties based on your goals." },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="flex gap-3 mt-4">
                <div className="w-10 h-10 rounded-2xl bg-[#3A2F0F] border border-[#FACC15]/30 flex items-center justify-center shrink-0"><Icon size={16} className="text-[#FACC15]" /></div>
                <div>
                  <div className="text-white text-[14px] font-medium">{b.title}</div>
                  <div className="text-zinc-500 text-[12px] mt-1">{b.body}</div>
                </div>
              </div>
            );
          })}
          <button onClick={save} disabled={selected.length === 0} className={`mt-6 w-full btn-gold ${selected.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} data-testid="save-preferences-btn">
            Save My Preferences <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocationInterests;
