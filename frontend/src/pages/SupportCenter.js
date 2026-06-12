import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { MessageCircle, Phone, BookOpen, ChevronDown, ChevronUp, Send, Sparkles } from "lucide-react";

const SupportCenter = () => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { api.get("/support").then(({ data }) => setData(data)); }, []);
  if (!data) return <div className="text-zinc-500" data-testid="support-loading">Loading…</div>;

  const submit = async () => {
    if (!msg.trim()) return;
    try { const { data: r } = await api.post("/support/contact", { message: msg, channel: "chat" }); toast.success(r.message); setMsg(""); }
    catch { toast.error("Could not send message"); }
  };

  return (
    <div data-testid="support-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Support Center</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Your private concierge. Quiet, fast, human.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {[
          { icon: MessageCircle, title: "Start Live Chat", body: "Average reply 4 min", color: "#FACC15", bg: "#3A2F0F", id: "chat" },
          { icon: Phone, title: "Schedule a Call", body: "Book a 1:1 with a specialist", color: "#22C55E", bg: "#1F3A2D", id: "call" },
          { icon: BookOpen, title: "Browse Resources", body: "Articles, playbooks, primers", color: "#A78BFA", bg: "#2A1F4A", id: "resources" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => toast.message(`Concierge: ${c.title}`, { description: c.body })} className="onex-card p-6 text-left hover:-translate-y-1 hover:border-[#FACC15]/30 transition-all" data-testid={`support-action-${c.id}`}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.color}44` }}>
                <Icon size={20} style={{ color: c.color }} />
              </div>
              <div className="text-white text-[18px] font-semibold mt-5">{c.title}</div>
              <div className="text-zinc-400 text-[13px] mt-1">{c.body}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-2 onex-card p-6" data-testid="support-faqs">
          <h3 className="text-white text-[18px] font-semibold">Common Questions</h3>
          <div className="mt-4 space-y-2">
            {data.faqs.map((f) => {
              const isOpen = open === f.id;
              return (
                <div key={f.id} className="onex-card-soft px-4">
                  <button onClick={() => setOpen(isOpen ? null : f.id)} data-testid={`faq-${f.id}`} className="w-full flex items-center justify-between py-4 text-left">
                    <span className="text-white text-[14px] font-medium">{f.q}</span>
                    {isOpen ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                  </button>
                  {isOpen && <div className="text-zinc-400 text-[13px] pb-4 -mt-1 leading-relaxed fade-in">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="onex-card p-6" data-testid="support-concierge-card">
          <div className="flex items-center gap-3">
            <img src={data.specialist.avatar} alt={data.specialist.name} className="w-14 h-14 rounded-full object-cover" />
            <div>
              <div className="text-white text-[15px] font-semibold">{data.specialist.name}</div>
              <div className="text-zinc-500 text-[12px]">{data.specialist.role}</div>
              <div className="text-[#22C55E] text-[11px] mt-1 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> {data.specialist.status}</div>
            </div>
          </div>
          <div className="mt-5 onex-card-soft p-3 flex items-center gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              data-testid="support-message-input"
              placeholder="Send a private note…"
              className="flex-1 bg-transparent text-white text-[13px] outline-none px-2"
            />
            <button onClick={submit} className="btn-gold !py-2" data-testid="support-send-btn"><Send size={14} /></button>
          </div>
          <div className="mt-4 onex-card-soft p-3 text-[12px] text-zinc-400 flex items-center gap-2"><Sparkles size={12} className="text-[#FACC15]" /> You’re on the <span className="text-[#FACC15]">{data.tier}</span> tier — priority concierge.</div>
        </div>
      </div>
    </div>
  );
};

export default SupportCenter;
