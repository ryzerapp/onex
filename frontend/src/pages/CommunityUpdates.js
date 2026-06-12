import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { Heart, Bookmark, Share2, Building2, Megaphone, BookOpen, Award } from "lucide-react";

const typeBadge = { launch: { icon: Building2, label: "Launch", color: "#FACC15" }, founder: { icon: Megaphone, label: "Founder", color: "#A78BFA" }, insight: { icon: BookOpen, label: "Insight", color: "#60A5FA" }, milestone: { icon: Award, label: "Milestone", color: "#22C55E" } };

const CommunityUpdates = () => {
  const [updates, setUpdates] = useState([]);
  const load = () => api.get("/community-updates").then(({ data }) => setUpdates(data.updates));
  useEffect(() => { load(); }, []);

  const like = async (u) => { try { await api.post("/community-updates/like", { update_id: u.id }); load(); } catch (e) { console.debug("[updates] like failed", e); } };
  const save = async (u) => { try { const { data } = await api.post("/community-updates/save", { update_id: u.id }); toast.success(data.saved ? "Saved" : "Removed"); load(); } catch (e) { console.debug("[updates] save failed", e); } };
  const share = (u) => { navigator.clipboard?.writeText(`OneX Club — ${u.title}`); toast.success("Update copied to share"); };

  return (
    <div data-testid="community-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Community Updates</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Stay in the loop with launches, founder notes, and insights.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {updates.map((u) => {
          const t = typeBadge[u.type] || typeBadge.insight;
          const Icon = t.icon;
          return (
            <article key={u.id} className="onex-card overflow-hidden hover:-translate-y-1 hover:border-[#FACC15]/30 transition-all flex flex-col" data-testid={`update-card-${u.id}`}>
              <div className="relative h-44">
                <img src={u.image} alt={u.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-transparent to-transparent" />
                <span className="absolute top-4 left-4 onex-pill backdrop-blur-md" style={{ background: `${t.color}22`, color: t.color, borderColor: `${t.color}44` }}><Icon size={11} /> {t.label}</span>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-zinc-500 text-[12px]">
                  <img src={u.author_avatar} alt={u.author} className="w-6 h-6 rounded-full" />
                  <span>{u.author}</span>
                  <span>·</span>
                  <span>{new Date(u.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <h4 className="text-white text-[17px] font-semibold mt-3 leading-tight">{u.title}</h4>
                <p className="text-zinc-400 text-[13px] mt-2 leading-relaxed line-clamp-3">{u.body}</p>
                <div className="mt-5 flex items-center justify-between text-zinc-400 text-[13px]">
                  <div className="flex items-center gap-4">
                    <button onClick={() => like(u)} className={`flex items-center gap-1.5 hover:text-white transition-colors ${u.liked ? "text-[#FACC15]" : ""}`} data-testid={`update-like-${u.id}`}>
                      <Heart size={15} fill={u.liked ? "#FACC15" : "none"} /> {u.likes}
                    </button>
                    <button onClick={() => save(u)} className={`flex items-center gap-1.5 hover:text-white transition-colors ${u.saved ? "text-[#FACC15]" : ""}`} data-testid={`update-save-${u.id}`}>
                      <Bookmark size={15} fill={u.saved ? "#FACC15" : "none"} />
                    </button>
                    <button onClick={() => share(u)} className="flex items-center gap-1.5 hover:text-white transition-colors" data-testid={`update-share-${u.id}`}>
                      <Share2 size={15} /> {u.shares}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default CommunityUpdates;
