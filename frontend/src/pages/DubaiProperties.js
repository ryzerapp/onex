import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { Heart, MapPin, Info, ArrowRight, Filter, ListOrdered, Gift, BarChart3, Globe2, TrendingUp, ShieldCheck } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Properties" },
  { id: "residential", label: "Residential" },
  { id: "airbnb", label: "Airbnb Rentals" },
  { id: "commercial", label: "Commercial" },
  { id: "luxury", label: "Luxury Villas" },
  { id: "hospitality", label: "Hospitality" },
];

const DubaiProperties = () => {
  const [category, setCategory] = useState("all");
  const [properties, setProperties] = useState([]);

  const load = (cat = category) => api.get(`/properties${cat && cat !== "all" ? `?category=${cat}` : ""}`).then(({ data }) => setProperties(data.properties));
  useEffect(() => { load(category); }, [category]);

  const join = async (p) => {
    try { await api.post("/properties/waitlist", { property_id: p.id }); toast.success(`Joined waitlist for ${p.name}`); load(category); }
    catch { toast.error("Could not join waitlist"); }
  };
  const save = async (p) => {
    try { const { data } = await api.post("/properties/save", { property_id: p.id }); toast.success(data.saved ? "Saved to favorites" : "Removed from favorites"); load(category); }
    catch (e) { /* ignore */ }
  };

  const savedCount = useMemo(() => properties.filter(p => p.saved).length, [properties]);

  return (
    <div data-testid="properties-page">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#3A2F0F] border border-[#FACC15]/30 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 22V8l6-4 6 4v14M9 22v-6h6v6M9 12h6" stroke="#FACC15" strokeWidth="1.5" /></svg></div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Dubai Properties</h1>
            <p className="text-zinc-400 mt-1 text-[15px]">Own a piece of Dubai. Built for high-yield. Backed by OneX.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button data-testid="properties-saved-btn" className="btn-ghost"><Heart size={14} /> Saved Properties{savedCount ? ` (${savedCount})` : ""}</button>
          <button data-testid="properties-notifications-btn" className="w-11 h-11 rounded-full border border-[#27272A] bg-[#15161A] hover:bg-[#1E1F24] flex items-center justify-center"><Filter size={14} className="text-zinc-300" /></button>
        </div>
      </div>

      {/* Filter row */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              data-testid={`properties-filter-${c.id}`}
              className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition-all border ${category === c.id ? "onex-gold-fill border-[#FACC15]" : "border-[#27272A] text-zinc-300 hover:border-[#FACC15]/30"}`}
            >{c.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost text-zinc-300" data-testid="properties-sort-btn"><ListOrdered size={14} /> Sort by: Launch Date</button>
          <button className="btn-ghost text-zinc-300" data-testid="properties-filter-btn"><Filter size={14} /> Filter</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((p) => (
            <div key={p.id} className="onex-card overflow-hidden hover:-translate-y-1 hover:border-[#FACC15]/30 transition-all flex flex-col" data-testid={`property-card-${p.id}`}>
              <div className="relative h-56">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 top-0 p-4 flex items-start justify-between">
                  <span className="onex-gold-fill onex-pill !text-[10px] !px-3">{p.status}</span>
                  <button onClick={() => save(p)} data-testid={`property-save-${p.id}`} className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${p.saved ? "bg-[#FACC15] text-black" : "bg-black/40 text-white hover:bg-black/60"}`}>
                    <Heart size={16} fill={p.saved ? "#0A0A0B" : "none"} />
                  </button>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-[18px] font-semibold text-white leading-tight">{p.name}</h3>
                <div className="flex items-center gap-2 text-zinc-400 text-[13px] mt-2"><MapPin size={13} className="text-[#FACC15]" /> {p.location}</div>
                <p className="text-zinc-400 text-[13px] mt-3 leading-relaxed line-clamp-3">{p.description}</p>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Min. Investment</div>
                    <div className="text-white font-semibold text-[14px] mt-1">AED {p.min_investment.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1">Est. Yield <Info size={10} className="text-zinc-600" /></div>
                    <div className="text-white font-semibold text-[14px] mt-1">{p.yield_low} – {p.yield_high}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Available Spots</div>
                    <div className="text-[#22C55E] font-semibold text-[14px] mt-1">{p.spots_available} / {p.spots_total}</div>
                  </div>
                </div>
                <button onClick={() => join(p)} disabled={p.joined_waitlist} data-testid={`property-join-${p.id}`} className={`mt-5 w-full btn-gold ${p.joined_waitlist ? "opacity-70 cursor-default" : ""}`}>
                  {p.joined_waitlist ? "Waitlist Joined" : "Join Waitlist"} <ArrowRight size={14} />
                </button>
                <div className="mt-4 flex items-center gap-2 text-zinc-500 text-[12px]">
                  <div className="flex -space-x-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-[#15161A] bg-[#FACC15]/20" />
                    ))}
                  </div>
                  <span>{p.waitlist_count}+ on waitlist</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Why invest in Dubai sidebar */}
        <div className="onex-card p-6 h-fit" data-testid="why-dubai-card">
          <h3 className="text-[18px] font-semibold text-white">Why Invest in Dubai?</h3>
          <div className="mt-5 space-y-5">
            {[
              { icon: BarChart3, title: "High Rental Demand", body: "Dubai ranks among the top cities for rental yields." },
              { icon: ShieldCheck, title: "100% Ownership", body: "Foreign investors enjoy full ownership rights." },
              { icon: Globe2, title: "Tax Benefits", body: "No property tax and no capital gains tax." },
              { icon: TrendingUp, title: "Strong ROI", body: "Attractive returns with long-term growth." },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#3A2F0F] border border-[#FACC15]/30 flex items-center justify-center shrink-0"><Icon size={16} className="text-[#FACC15]" /></div>
                  <div>
                    <div className="text-white text-[14px] font-medium">{b.title}</div>
                    <div className="text-zinc-500 text-[12px] mt-1 leading-relaxed">{b.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <button className="mt-6 text-[13px] text-[#FACC15] hover:underline flex items-center gap-1" data-testid="learn-more-dubai-btn">Learn more about Dubai <ArrowRight size={14} /></button>
        </div>
      </div>

      {/* Not a member yet section */}
      <div className="onex-card mt-10 p-8" data-testid="not-member-section">
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <h3 className="text-[20px] font-semibold text-white">Not a Member Yet?</h3>
            <p className="text-zinc-400 text-[13px] mt-1">Join the waitlist and become a co-owner in just a few simple steps.</p>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 relative">
              {["Join Waitlist", "Verify Mobile", "Complete KYC", "Attend Webinar", "Reserve Interest"].map((s, i) => (
                <div key={s} className="text-center" data-testid={`signup-step-${i + 1}`}>
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#15161A] border border-[#FACC15]/30 flex items-center justify-center"><span className="text-[#FACC15] text-[13px] font-semibold">{i + 1}</span></div>
                  <div className="text-[12px] text-white mt-2">{s}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="onex-card-soft p-6 max-w-sm">
            <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-2xl bg-[#3A2F0F] border border-[#FACC15]/30 flex items-center justify-center"><Gift size={16} className="text-[#FACC15]" /></div><div className="text-white text-[15px] font-medium">Early Access Advantage</div></div>
            <p className="text-zinc-400 text-[13px] mt-3">Be the first to know about new launches and secure the best allocation opportunities.</p>
            <button onClick={() => join(properties[0])} className="mt-5 w-full btn-ghost border-[#FACC15]/30 text-[#FACC15]" data-testid="not-member-join-btn">Join Waitlist Now <ArrowRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DubaiProperties;
