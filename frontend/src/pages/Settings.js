import React, { useEffect, useState } from "react";
import { api } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Globe2, Bell, Shield, LogOut, User as UserIcon, Mail, Lock, Wallet } from "lucide-react";

const Section = ({ title, icon: Icon, children, testId }) => (
  <div className="onex-card p-6" data-testid={testId}>
    <div className="flex items-center gap-2 text-[#FACC15] mb-4"><Icon size={16} /><span className="text-[14px] font-medium">{title}</span></div>
    {children}
  </div>
);

const Toggle = ({ label, value, onChange, testId }) => (
  <div className="flex items-center justify-between py-2.5">
    <span className="text-white text-[13px]">{label}</span>
    <Switch checked={value} onCheckedChange={onChange} data-testid={testId} />
  </div>
);

const Settings = () => {
  const { user, refresh, logout } = useAuth();
  const [data, setData] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    api.get("/settings").then(({ data }) => { setData(data); setName(data.user.name); });
  }, []);

  if (!data) return <div className="text-zinc-500" data-testid="settings-loading">Loading…</div>;

  const update = (path, value) => {
    const next = JSON.parse(JSON.stringify(data.settings));
    let cur = next;
    for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
    cur[path[path.length - 1]] = value;
    setData({ ...data, settings: next });
  };

  const save = async () => {
    try { await api.put("/settings", { settings: data.settings, name }); await refresh(); toast.success("Settings saved"); }
    catch (e) { toast.error("Could not save"); }
  };

  return (
    <div data-testid="settings-page">
      <h1 className="text-4xl sm:text-5xl font-display tracking-tight text-white">Settings</h1>
      <p className="text-zinc-400 mt-2 text-[15px]">Manage your OneX profile and preferences.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="onex-card p-6" data-testid="settings-profile-summary">
          <div className="flex items-center gap-4">
            {user?.picture ? <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-[#FACC15]/15 text-[#FACC15] flex items-center justify-center text-xl font-semibold">{(user?.name || "U").slice(0, 2).toUpperCase()}</div>}
            <div>
              <div className="text-white text-[18px] font-semibold">{user?.name}</div>
              <div className="text-zinc-500 text-[12px]">{user?.email}</div>
              <div className="text-[#FACC15] text-[12px] mt-1">{user?.tier} Tier</div>
            </div>
          </div>
          <div className="onex-card-soft p-4 mt-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3A2F0F] border border-[#FACC15]/30 flex items-center justify-center"><Wallet size={16} className="text-[#FACC15]" /></div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">AED Balance</div>
              <div className="text-[20px] font-semibold text-[#FACC15]">AED {user?.aed_balance}</div>
            </div>
          </div>
          <button onClick={logout} className="mt-5 w-full btn-ghost text-zinc-300" data-testid="settings-logout-btn"><LogOut size={14} /> Sign out</button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Section title="Personal Information" icon={UserIcon} testId="settings-personal-section">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-[12px] text-zinc-500">
                Full Name
                <input value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name-input" className="onex-card-soft px-4 py-3 text-white outline-none focus:border-[#FACC15]/40 transition-all" />
              </label>
              <label className="flex flex-col gap-2 text-[12px] text-zinc-500">
                Email
                <input value={data.user.email} readOnly data-testid="settings-email-input" className="onex-card-soft px-4 py-3 text-white outline-none opacity-70 cursor-not-allowed" />
              </label>
            </div>
          </Section>

          <Section title="Notifications" icon={Bell} testId="settings-notifications-section">
            <Toggle label="Email updates" value={data.settings.notifications.email} onChange={(v) => update(["notifications", "email"], v)} testId="settings-notif-email" />
            <Toggle label="Push notifications" value={data.settings.notifications.push} onChange={(v) => update(["notifications", "push"], v)} testId="settings-notif-push" />
            <Toggle label="SMS alerts" value={data.settings.notifications.sms} onChange={(v) => update(["notifications", "sms"], v)} testId="settings-notif-sms" />
            <Toggle label="Weekly digest" value={data.settings.notifications.weekly_digest} onChange={(v) => update(["notifications", "weekly_digest"], v)} testId="settings-notif-digest" />
          </Section>

          <Section title="Preferences" icon={Globe2} testId="settings-preferences-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex flex-col gap-2 text-[12px] text-zinc-500">
                Language
                <select value={data.settings.preferences.language} onChange={(e) => update(["preferences", "language"], e.target.value)} data-testid="settings-language" className="onex-card-soft px-4 py-3 text-white outline-none">
                  <option>English</option><option>العربية</option><option>हिन्दी</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-[12px] text-zinc-500">
                Currency
                <select value={data.settings.preferences.currency} onChange={(e) => update(["preferences", "currency"], e.target.value)} data-testid="settings-currency" className="onex-card-soft px-4 py-3 text-white outline-none">
                  <option>AED</option><option>USD</option><option>EUR</option><option>INR</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-[12px] text-zinc-500">
                Timezone
                <select value={data.settings.preferences.timezone} onChange={(e) => update(["preferences", "timezone"], e.target.value)} data-testid="settings-timezone" className="onex-card-soft px-4 py-3 text-white outline-none">
                  <option>Asia/Dubai</option><option>Asia/Kolkata</option><option>Europe/London</option>
                </select>
              </label>
            </div>
          </Section>

          <Section title="Security & Privacy" icon={Shield} testId="settings-security-section">
            <Toggle label="Two-factor authentication" value={data.settings.security.two_factor} onChange={(v) => update(["security", "two_factor"], v)} testId="settings-2fa" />
            <Toggle label="Login alerts" value={data.settings.security.login_alerts} onChange={(v) => update(["security", "login_alerts"], v)} testId="settings-login-alerts" />
            <Toggle label="Public profile" value={data.settings.privacy.public_profile} onChange={(v) => update(["privacy", "public_profile"], v)} testId="settings-public-profile" />
            <Toggle label="Show on leaderboard" value={data.settings.privacy.show_on_leaderboard} onChange={(v) => update(["privacy", "show_on_leaderboard"], v)} testId="settings-show-leaderboard" />
          </Section>

          <button onClick={save} className="btn-gold w-full md:w-auto" data-testid="settings-save-btn">Save changes</button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
