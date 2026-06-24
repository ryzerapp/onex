/**
 * Admin section pages — Users, Properties, Webinars, Community, Benefits,
 * Allocations, Notifications. Kept in a single file so the layout pattern is
 * obvious and the shared helpers (Field, Modal, etc) don't fragment.
 *
 * Each page does:
 *   1. Fetch list from `/api/admin/<entity>`
 *   2. Render a table
 *   3. Open a modal for create / edit / archive
 */
import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import {
  Plus, Edit3, Archive, Search, X, Bell, Send, Users as UsersIcon,
  Calendar, ExternalLink, Youtube, AlertCircle, Mail, Megaphone,
  Eye, EyeOff, Building2, Trash2,
} from "lucide-react";

// ─── Shared primitives ───────────────────────────────────────────────────────
const Field = ({ label, children, hint, testid }) => (
  <label className="block" data-testid={testid && `field-${testid}`}>
    <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 mb-1.5">{label}</div>
    {children}
    {hint && <div className="text-[11px] text-zinc-600 mt-1">{hint}</div>}
  </label>
);

const Input = (props) => (
  <input
    {...props}
    className={`w-full bg-[#0F1014] border border-[#27272A] rounded-xl px-3 py-2.5 text-white text-[14px]
                placeholder:text-zinc-600 focus:outline-none focus:border-[#8CFF2E]/60 ${props.className || ""}`}
  />
);

const Textarea = (props) => (
  <textarea
    {...props}
    className={`w-full bg-[#0F1014] border border-[#27272A] rounded-xl px-3 py-2.5 text-white text-[14px]
                placeholder:text-zinc-600 focus:outline-none focus:border-[#8CFF2E]/60 ${props.className || ""}`}
  />
);

const Select = (props) => (
  <select
    {...props}
    className={`w-full bg-[#0F1014] border border-[#27272A] rounded-xl px-3 py-2.5 text-white text-[14px]
                focus:outline-none focus:border-[#8CFF2E]/60 ${props.className || ""}`}
  />
);

const Modal = ({ open, onClose, title, children, testid }) => {
  if (!open) return null;
  return (
    <div
      data-testid={testid || "admin-modal"}
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 backdrop-blur-sm fade-in p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div className="onex-card max-w-2xl w-full p-7 my-10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[20px] font-display text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center" data-testid="admin-modal-close">
            <X size={14} className="text-zinc-300" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
    <div>
      <h1 className="text-[32px] font-display tracking-tight text-white">{title}</h1>
      {subtitle && <p className="text-zinc-400 text-[14px] mt-1.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// ─── Users ──────────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export const AdminUsers = () => {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tier) params.set("tier", tier);
    api.get(`/admin/users?${params.toString()}`).then(({ data }) => setItems(data.users || []));
  }, [q, tier]);
  useEffect(() => { load(); }, [load]);

  const ban = async (u) => {
    if (!window.confirm(`Ban ${u.email}? They'll be signed out immediately.`)) return;
    await api.post(`/admin/users/${u.user_id}/ban`); toast.success("User banned"); load();
  };
  const unban = async (u) => { await api.post(`/admin/users/${u.user_id}/unban`); toast.success("Unbanned"); load(); };

  return (
    <div data-testid="admin-users-page">
      <PageHeader title="Users" subtitle={`${items.length} matches`} />
      <div className="onex-card p-4 flex items-center gap-3 mb-4" data-testid="admin-users-toolbar">
        <Search size={16} className="text-zinc-500 ml-1" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email or referral code…"
          className="flex-1 bg-transparent text-white text-[14px] outline-none placeholder:text-zinc-600"
          data-testid="admin-users-search"
        />
        <Select value={tier} onChange={(e) => setTier(e.target.value)} className="!py-2 !w-44" data-testid="admin-users-tier-filter">
          <option value="">All tiers</option>
          <option>Member</option><option>Insider</option><option>Co-Owner</option><option>Pro-Owner</option>
        </Select>
      </div>

      <div className="onex-card overflow-x-auto" data-testid="admin-users-table">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-[#27272A]">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Tier</th>
              <th className="px-5 py-3 font-medium text-right">AED</th>
              <th className="px-5 py-3 font-medium text-right">Refs</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.user_id} className="border-b border-[#1a1b1f] hover:bg-white/[0.02]" data-testid={`admin-user-row-${u.user_id}`}>
                <td className="px-5 py-3.5">
                  <div className="text-white font-medium">{u.name}</div>
                  <div className="text-zinc-500 text-[11px]">{u.email}</div>
                </td>
                <td className="px-5 py-3.5"><span className="onex-pill bg-[#15161A]">{u.tier || "Member"}</span></td>
                <td className="px-5 py-3.5 text-right text-[#8CFF2E] tabular-nums">{(u.aed_balance || 0).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-zinc-300">{u.referrals_count || 0}</td>
                <td className="px-5 py-3.5">
                  {u.banned
                    ? <span className="text-[#EF4444] text-[12px]">● Banned</span>
                    : <span className="text-[#22C55E] text-[12px]">● Active</span>}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {u.banned
                    ? <button onClick={() => unban(u)} data-testid={`admin-unban-${u.user_id}`} className="text-[#22C55E] text-[12px] hover:underline">Unban</button>
                    : <button onClick={() => ban(u)} data-testid={`admin-ban-${u.user_id}`} className="text-[#EF4444] text-[12px] hover:underline">Ban</button>}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-500">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ─── Properties ─────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const PROPERTY_DEFAULTS = {
  name: "", location: "Dubai, UAE", image: "",
  category: "luxury", min_investment: 200000,
  yield_low: 12, yield_high: 16, spots_available: 0, spots_total: 100,
  waitlist_count: 0, description: "", status: "Coming Soon",
  launch_date: "", archived: false,
};

export const AdminProperties = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => api.get("/admin/properties").then(({ data }) => setItems(data.properties || [])), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing.name) return toast.error("Name required");
    await api.post("/admin/properties", editing);
    toast.success("Saved"); setEditing(null); load();
  };
  const archive = async (p) => {
    if (!window.confirm(`Archive ${p.name}? Members will no longer see it.`)) return;
    await api.delete(`/admin/properties/${p.id}`); toast.success("Archived"); load();
  };
  const blast = async (p) => {
    if (!window.confirm(`🔥 Send "Allocation opened" email to all opt-in members for "${p.name}"? This cannot be undone.`)) return;
    const { data } = await api.post("/admin/notify/allocation-opened", { property_id: p.id });
    toast.success(`Queued ${data.queued} emails for "${data.property_name}"`);
    load();
  };

  return (
    <div data-testid="admin-properties-page">
      <PageHeader
        title="Properties"
        subtitle={`${items.length} total · ${items.filter((p) => !p.archived).length} live`}
        action={<button onClick={() => setEditing({ ...PROPERTY_DEFAULTS })} data-testid="admin-property-new-btn" className="btn-gold"><Plus size={14}/> Add property</button>}
      />

      <div className="onex-card overflow-x-auto" data-testid="admin-properties-table">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-zinc-500 border-b border-[#27272A]">
            <th className="px-5 py-3 font-medium">Property</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Launch</th>
            <th className="px-5 py-3 font-medium text-right">Waitlist</th>
            <th className="px-5 py-3 font-medium text-right">Spots</th>
            <th className="px-5 py-3"></th>
          </tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={`border-b border-[#1a1b1f] hover:bg-white/[0.02] ${p.archived ? "opacity-50" : ""}`} data-testid={`admin-property-row-${p.id}`}>
                <td className="px-5 py-3.5">
                  <div className="text-white font-medium">{p.name}</div>
                  <div className="text-zinc-500 text-[11px]">{p.location} · {p.category}</div>
                </td>
                <td className="px-5 py-3.5"><span className="onex-pill bg-[#15161A]">{p.status}</span></td>
                <td className="px-5 py-3.5 text-zinc-400 tabular-nums">{p.launch_date ? new Date(p.launch_date).toLocaleString() : "—"}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-[#8CFF2E]">{p.waitlist_count || 0}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-zinc-300">{p.spots_available}/{p.spots_total}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3 justify-end">
                    <button onClick={() => blast(p)} data-testid={`admin-property-blast-${p.id}`} title="Send 'Allocation opened' bulk email" className="text-[#8CFF2E] hover:underline text-[12px] flex items-center gap-1"><Megaphone size={12}/> Blast</button>
                    <button onClick={() => setEditing(p)} data-testid={`admin-property-edit-${p.id}`} className="text-zinc-300 hover:text-white"><Edit3 size={14}/></button>
                    {!p.archived && <button onClick={() => archive(p)} data-testid={`admin-property-archive-${p.id}`} className="text-zinc-500 hover:text-[#EF4444]"><Archive size={14}/></button>}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-500">No properties yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit property" : "Add property"} testid="admin-property-modal">
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" testid="prop-name"><Input value={editing.name} onChange={(e) => setEditing({...editing, name: e.target.value})} placeholder="JBR Airbnb Lofts" data-testid="admin-prop-name"/></Field>
            <Field label="Location" testid="prop-loc"><Input value={editing.location} onChange={(e) => setEditing({...editing, location: e.target.value})} /></Field>
            <Field label="Image URL" testid="prop-image" hint="Paste a public Unsplash / Pexels link"><Input value={editing.image} onChange={(e) => setEditing({...editing, image: e.target.value})} placeholder="https://images.unsplash.com/…" /></Field>
            <Field label="Category">
              <Select value={editing.category} onChange={(e) => setEditing({...editing, category: e.target.value})}>
                {["luxury","residential","airbnb","commercial","hospitality"].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Min investment (AED)"><Input type="number" value={editing.min_investment} onChange={(e) => setEditing({...editing, min_investment: +e.target.value})}/></Field>
            <Field label="Status">
              <Select value={editing.status} onChange={(e) => setEditing({...editing, status: e.target.value})}>
                {["Coming Soon","Allocation Open","Sold Out","Live"].map((s) => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Yield low (%)"><Input type="number" value={editing.yield_low} onChange={(e) => setEditing({...editing, yield_low: +e.target.value})}/></Field>
            <Field label="Yield high (%)"><Input type="number" value={editing.yield_high} onChange={(e) => setEditing({...editing, yield_high: +e.target.value})}/></Field>
            <Field label="Spots available"><Input type="number" value={editing.spots_available} onChange={(e) => setEditing({...editing, spots_available: +e.target.value})}/></Field>
            <Field label="Spots total"><Input type="number" value={editing.spots_total} onChange={(e) => setEditing({...editing, spots_total: +e.target.value})}/></Field>
            <Field label="Launch date (drives Dashboard timer)" testid="prop-launch" hint="Pick the exact moment allocation opens — shows as a live countdown on every member's dashboard">
              <Input
                type="datetime-local"
                value={editing.launch_date ? new Date(editing.launch_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditing({...editing, launch_date: e.target.value ? new Date(e.target.value).toISOString() : ""})}
                data-testid="admin-prop-launch-date"
              />
            </Field>
            <Field label="Waitlist count (display only)"><Input type="number" value={editing.waitlist_count} onChange={(e) => setEditing({...editing, waitlist_count: +e.target.value})}/></Field>
            <div className="col-span-2"><Field label="Description"><Textarea rows={3} value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})}/></Field></div>
            <div className="col-span-2 flex justify-end gap-3 mt-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-gold" data-testid="admin-prop-save"><Send size={14}/> Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ─── Webinars ───────────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const WEBINAR_DEFAULTS = {
  title: "", description: "", image: "",
  starts_at: "", duration_minutes: 60,
  luma_url: "", recording_url: "", archived: false,
};

export const AdminWebinars = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => api.get("/admin/webinars").then(({ data }) => setItems(data.webinars || [])), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing.title || !editing.starts_at) return toast.error("Title and start date required");
    await api.post("/admin/webinars", editing); toast.success("Saved"); setEditing(null); load();
  };
  const archive = async (w) => {
    if (!window.confirm(`Archive "${w.title}"?`)) return;
    await api.delete(`/admin/webinars/${w.id}`); toast.success("Archived"); load();
  };

  return (
    <div data-testid="admin-webinars-page">
      <PageHeader
        title="Webinars"
        subtitle={`${items.length} total · ${items.filter((w) => !w.archived).length} active`}
        action={<button onClick={() => setEditing({ ...WEBINAR_DEFAULTS })} data-testid="admin-webinar-new-btn" className="btn-gold"><Plus size={14}/> Add webinar</button>}
      />

      <div className="onex-card overflow-x-auto" data-testid="admin-webinars-table">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-zinc-500 border-b border-[#27272A]">
            <th className="px-5 py-3 font-medium">Webinar</th>
            <th className="px-5 py-3 font-medium">Starts</th>
            <th className="px-5 py-3 font-medium text-right">Registered / Attended</th>
            <th className="px-5 py-3 font-medium">Links</th>
            <th className="px-5 py-3"></th>
          </tr></thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id} className={`border-b border-[#1a1b1f] ${w.archived ? "opacity-50" : ""}`} data-testid={`admin-webinar-row-${w.id}`}>
                <td className="px-5 py-3.5">
                  <div className="text-white font-medium">{w.title}</div>
                  <div className="text-zinc-500 text-[11px] truncate max-w-md">{w.description}</div>
                </td>
                <td className="px-5 py-3.5 text-zinc-400 tabular-nums">{new Date(w.starts_at).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-right tabular-nums">
                  <span className="text-zinc-300">{w.registered_count || 0}</span>
                  <span className="text-zinc-600"> / </span>
                  <span className="text-[#8CFF2E]">{w.attended_count || 0}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2 text-[11px]">
                    {w.luma_url && <a href={w.luma_url} target="_blank" rel="noreferrer" className="text-zinc-300 hover:text-white inline-flex items-center gap-1"><ExternalLink size={11}/> Luma</a>}
                    {w.recording_url && <a href={w.recording_url} target="_blank" rel="noreferrer" className="text-[#EF4444] hover:underline inline-flex items-center gap-1"><Youtube size={12}/> Recording</a>}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setEditing(w)} data-testid={`admin-webinar-edit-${w.id}`} className="text-zinc-300 hover:text-white"><Edit3 size={14}/></button>
                    {!w.archived && <button onClick={() => archive(w)} data-testid={`admin-webinar-archive-${w.id}`} className="text-zinc-500 hover:text-[#EF4444]"><Archive size={14}/></button>}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-500">No webinars yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit webinar" : "Add webinar"} testid="admin-webinar-modal">
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Field label="Title"><Input value={editing.title} onChange={(e) => setEditing({...editing, title: e.target.value})} placeholder="Burj 8 · Allocation Briefing" data-testid="admin-webinar-title"/></Field></div>
            <div className="col-span-2"><Field label="Description"><Textarea rows={3} value={editing.description} onChange={(e) => setEditing({...editing, description: e.target.value})}/></Field></div>
            <Field label="Starts at" hint="ISO 8601"><Input value={editing.starts_at} onChange={(e) => setEditing({...editing, starts_at: e.target.value})} placeholder="2026-07-12T14:00:00Z" data-testid="admin-webinar-starts"/></Field>
            <Field label="Duration (minutes)"><Input type="number" value={editing.duration_minutes} onChange={(e) => setEditing({...editing, duration_minutes: +e.target.value})}/></Field>
            <div className="col-span-2"><Field label="Image URL" hint="Hero image for the card"><Input value={editing.image} onChange={(e) => setEditing({...editing, image: e.target.value})}/></Field></div>
            <div className="col-span-2"><Field label="Luma RSVP link" hint="Guests join via this URL"><Input value={editing.luma_url || ""} onChange={(e) => setEditing({...editing, luma_url: e.target.value})} placeholder="https://lu.ma/abc-onex"/></Field></div>
            <div className="col-span-2"><Field label="Recording URL (YouTube/Vimeo)" hint="Past sessions: members can watch full-page in Learning Journey"><Input value={editing.recording_url || ""} onChange={(e) => setEditing({...editing, recording_url: e.target.value})} placeholder="https://www.youtube.com/watch?v=…" data-testid="admin-webinar-recording"/></Field></div>
            <div className="col-span-2 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-gold" data-testid="admin-webinar-save"><Send size={14}/> Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ─── Community Updates ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
const UPDATE_DEFAULTS = { type: "launch", title: "", body: "", image: "", archived: false };

export const AdminCommunity = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = useCallback(() => api.get("/admin/community-updates").then(({ data }) => setItems(data.items || [])), []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!editing.title || !editing.body) return toast.error("Title and body required");
    await api.post("/admin/community-updates", editing); toast.success("Saved"); setEditing(null); load();
  };
  const archive = async (u) => {
    if (!window.confirm(`Archive "${u.title}"?`)) return;
    await api.delete(`/admin/community-updates/${u.id}`); toast.success("Archived"); load();
  };

  return (
    <div data-testid="admin-community-page">
      <PageHeader
        title="Community Updates"
        subtitle={`${items.length} total`}
        action={<button onClick={() => setEditing({ ...UPDATE_DEFAULTS })} data-testid="admin-update-new-btn" className="btn-gold"><Plus size={14}/> New update</button>}
      />

      <div className="onex-card overflow-x-auto" data-testid="admin-community-table">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-zinc-500 border-b border-[#27272A]">
            <th className="px-5 py-3 font-medium">Update</th>
            <th className="px-5 py-3 font-medium">Type</th>
            <th className="px-5 py-3 font-medium">Created</th>
            <th className="px-5 py-3"></th>
          </tr></thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className={`border-b border-[#1a1b1f] ${u.archived ? "opacity-50" : ""}`} data-testid={`admin-update-row-${u.id}`}>
                <td className="px-5 py-3.5">
                  <div className="text-white font-medium">{u.title}</div>
                  <div className="text-zinc-500 text-[11px] truncate max-w-md">{u.body}</div>
                </td>
                <td className="px-5 py-3.5"><span className="onex-pill bg-[#15161A]">{u.type}</span></td>
                <td className="px-5 py-3.5 text-zinc-500 tabular-nums">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setEditing(u)} data-testid={`admin-update-edit-${u.id}`} className="text-zinc-300 hover:text-white"><Edit3 size={14}/></button>
                    {!u.archived && <button onClick={() => archive(u)} data-testid={`admin-update-archive-${u.id}`} className="text-zinc-500 hover:text-[#EF4444]"><Archive size={14}/></button>}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-zinc-500">No updates yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit update" : "New update"} testid="admin-update-modal">
        {editing && (
          <div className="space-y-4">
            <Field label="Type">
              <Select value={editing.type} onChange={(e) => setEditing({...editing, type: e.target.value})}>
                {["launch","webinar","community","partnership","system"].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Title"><Input value={editing.title} onChange={(e) => setEditing({...editing, title: e.target.value})}/></Field>
            <Field label="Body"><Textarea rows={5} value={editing.body} onChange={(e) => setEditing({...editing, body: e.target.value})}/></Field>
            <Field label="Image URL (optional)"><Input value={editing.image || ""} onChange={(e) => setEditing({...editing, image: e.target.value})}/></Field>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="btn-ghost">Cancel</button>
              <button onClick={save} className="btn-gold" data-testid="admin-update-save"><Send size={14}/> Save</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ─── Co-Owner Benefits visibility ───────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export const AdminBenefits = () => {
  const [items, setItems] = useState([]);
  const load = useCallback(() => api.get("/admin/benefits").then(({ data }) => setItems(data.items || [])), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (b) => {
    await api.post("/admin/benefits/toggle", { benefit_id: b.id, archived: !b.archived });
    toast.success(b.archived ? "Made visible" : "Hidden from members"); load();
  };

  return (
    <div data-testid="admin-benefits-page">
      <PageHeader title="Co-Owner Benefits" subtitle="Toggle each benefit on/off across all member-facing surfaces."/>

      <div className="onex-card overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-zinc-500 border-b border-[#27272A]">
            <th className="px-5 py-3 font-medium">Benefit</th>
            <th className="px-5 py-3 font-medium">Unlock tier</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3"></th>
          </tr></thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.id} className="border-b border-[#1a1b1f]" data-testid={`admin-benefit-row-${b.id}`}>
                <td className="px-5 py-3.5">
                  <div className="text-white font-medium">{b.title}</div>
                  <div className="text-zinc-500 text-[11px]">{b.description}</div>
                </td>
                <td className="px-5 py-3.5"><span className="onex-pill bg-[#15161A]">{b.unlock_tier}</span></td>
                <td className="px-5 py-3.5">
                  {b.archived
                    ? <span className="text-zinc-500 text-[12px]">● Hidden</span>
                    : <span className="text-[#22C55E] text-[12px]">● Visible</span>}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => toggle(b)} data-testid={`admin-benefit-toggle-${b.id}`} className="text-[12px] text-zinc-300 hover:text-white inline-flex items-center gap-1.5">
                    {b.archived ? <><Eye size={12}/> Show</> : <><EyeOff size={12}/> Hide</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ─── Allocation Interests ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export const AdminAllocations = () => {
  const [items, setItems] = useState([]);
  const load = useCallback(() => api.get("/admin/allocation-interests").then(({ data }) => setItems(data.interests || [])), []);
  useEffect(() => { load(); }, [load]);

  const archive = async (i) => {
    await api.post("/admin/allocation-interests/archive", { interest_id: i.id, archived: !i.archived });
    toast.success(i.archived ? "Restored" : "Archived"); load();
  };

  return (
    <div data-testid="admin-allocations-page">
      <PageHeader title="Allocation Interests" subtitle={`${items.length} reservations from members`}/>

      <div className="onex-card overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-zinc-500 border-b border-[#27272A]">
            <th className="px-5 py-3 font-medium">User</th>
            <th className="px-5 py-3 font-medium">Property</th>
            <th className="px-5 py-3 font-medium text-right">AED</th>
            <th className="px-5 py-3 font-medium">Reserved</th>
            <th className="px-5 py-3"></th>
          </tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={`border-b border-[#1a1b1f] ${i.archived ? "opacity-50" : ""}`} data-testid={`admin-alloc-row-${i.id}`}>
                <td className="px-5 py-3.5">
                  <div className="text-white">{i.user_name || "—"}</div>
                  <div className="text-zinc-500 text-[11px]">{i.user_email || "—"}</div>
                </td>
                <td className="px-5 py-3.5"><div className="flex items-center gap-1.5"><Building2 size={12} className="text-zinc-500"/> {i.property_name || i.property_id}</div></td>
                <td className="px-5 py-3.5 text-right text-[#8CFF2E] tabular-nums">{(i.amount_aed || 0).toLocaleString()}</td>
                <td className="px-5 py-3.5 text-zinc-400 tabular-nums">{i.created_at ? new Date(i.created_at).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3.5 text-right">
                  <button onClick={() => archive(i)} className="text-zinc-500 hover:text-[#EF4444] text-[12px] inline-flex items-center gap-1"><Trash2 size={12}/> {i.archived ? "Restore" : "Archive"}</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-zinc-500">No reservations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ─── Notifications — single nudge + bulk + audit log ───────────────────────
// ════════════════════════════════════════════════════════════════════════════
export const AdminNotify = () => {
  const [tab, setTab] = useState("bulk");
  const [users, setUsers] = useState([]);
  const [log, setLog] = useState([]);
  const [oneTo, setOneTo] = useState("");
  const [oneSubj, setOneSubj] = useState("");
  const [oneBody, setOneBody] = useState("");
  const [bulkTier, setBulkTier] = useState("");
  const [bulkSubj, setBulkSubj] = useState("");
  const [bulkBody, setBulkBody] = useState("");

  useEffect(() => {
    api.get("/admin/users?limit=500").then(({ data }) => setUsers(data.users || []));
    api.get("/admin/notifications/log").then(({ data }) => setLog(data.items || []));
  }, []);

  const sendOne = async () => {
    if (!oneTo || !oneSubj || !oneBody) return toast.error("Fill all fields");
    await api.post("/admin/notify/one", { user_id: oneTo, subject: oneSubj, message: oneBody });
    toast.success("Email queued");
    setOneSubj(""); setOneBody("");
    api.get("/admin/notifications/log").then(({ data }) => setLog(data.items || []));
  };

  const sendBulk = async () => {
    if (!bulkSubj || !bulkBody) return toast.error("Fill subject and body");
    if (!window.confirm(`Send to ${bulkTier ? `tier=${bulkTier}` : "ALL users"}? Cannot be undone.`)) return;
    const { data } = await api.post("/admin/notify/bulk", {
      subject: bulkSubj, message: bulkBody, only_tier: bulkTier || null,
    });
    toast.success(`Queued ${data.queued} emails`);
    setBulkSubj(""); setBulkBody("");
    api.get("/admin/notifications/log").then(({ data }) => setLog(data.items || []));
  };

  return (
    <div data-testid="admin-notify-page">
      <PageHeader title="Notifications" subtitle="Email a single member, broadcast to a tier, or fire the 'allocation opened' blast from the Properties page."/>

      <div className="flex gap-2 mb-5">
        {[["bulk","Bulk broadcast"],["one","Single nudge"],["log","Audit log"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} data-testid={`admin-notify-tab-${k}`}
                  className={`px-4 py-2 rounded-full text-[13px] ${tab===k ? "bg-[#8CFF2E]/12 text-[#8CFF2E] border border-[#8CFF2E]/30" : "text-zinc-400 hover:text-white border border-transparent"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "one" && (
        <div className="onex-card p-6 max-w-2xl space-y-4" data-testid="admin-notify-one-card">
          <Field label="Recipient">
            <Select value={oneTo} onChange={(e) => setOneTo(e.target.value)} data-testid="admin-notify-one-recipient">
              <option value="">— pick a user —</option>
              {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.name} · {u.email}</option>)}
            </Select>
          </Field>
          <Field label="Subject"><Input value={oneSubj} onChange={(e) => setOneSubj(e.target.value)} placeholder="A note from the OneX team"/></Field>
          <Field label="Message"><Textarea rows={5} value={oneBody} onChange={(e) => setOneBody(e.target.value)} placeholder="Hi {name}, …"/></Field>
          <button onClick={sendOne} className="btn-gold" data-testid="admin-notify-one-send"><Mail size={14}/> Send</button>
        </div>
      )}

      {tab === "bulk" && (
        <div className="onex-card p-6 max-w-2xl space-y-4" data-testid="admin-notify-bulk-card">
          <Field label="Tier filter (optional)">
            <Select value={bulkTier} onChange={(e) => setBulkTier(e.target.value)} data-testid="admin-notify-bulk-tier">
              <option value="">All members</option>
              <option>Member</option><option>Insider</option><option>Co-Owner</option><option>Pro-Owner</option>
            </Select>
          </Field>
          <Field label="Subject"><Input value={bulkSubj} onChange={(e) => setBulkSubj(e.target.value)} placeholder="🔥 Big news from OneX"/></Field>
          <Field label="Message"><Textarea rows={6} value={bulkBody} onChange={(e) => setBulkBody(e.target.value)}/></Field>
          <button onClick={sendBulk} className="btn-gold" data-testid="admin-notify-bulk-send"><Megaphone size={14}/> Broadcast</button>
          <div className="text-[11px] text-zinc-500 flex items-start gap-2 pt-2">
            <AlertCircle size={12} className="mt-0.5 shrink-0"/>
            For "🔥 Allocation opened — 24h priority window" emails, use the <strong>Blast</strong> button next to each property in the Properties page.
          </div>
        </div>
      )}

      {tab === "log" && (
        <div className="onex-card overflow-x-auto" data-testid="admin-notify-log">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-zinc-500 border-b border-[#27272A]">
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Kind</th>
              <th className="px-5 py-3 font-medium">Subject / Property</th>
              <th className="px-5 py-3 font-medium text-right">Recipients</th>
            </tr></thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id} className="border-b border-[#1a1b1f]">
                  <td className="px-5 py-3 text-zinc-400 tabular-nums">{new Date(l.sent_at).toLocaleString()}</td>
                  <td className="px-5 py-3"><span className="onex-pill bg-[#15161A]">{l.kind}</span></td>
                  <td className="px-5 py-3 text-white">{l.subject || l.property_id || "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-[#8CFF2E]">{l.recipient_count ?? 1}</td>
                </tr>
              ))}
              {log.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-zinc-500">No notifications sent yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Re-export the helper for use elsewhere if needed.
export { Modal, Field, Input, Textarea, Select, PageHeader };
