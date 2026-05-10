import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const KEY = "axcis.notifications";
type Prefs = {
  itrReminders: boolean;
  taxNews: boolean;
  noticeAlerts: boolean;
  tipsAndTricks: boolean;
  productUpdates: boolean;
};
const DEFAULT: Prefs = {
  itrReminders: true,
  taxNews: true,
  noticeAlerts: true,
  tipsAndTricks: false,
  productUpdates: true,
};

const Row = ({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 border-b border-border/50 px-4 py-4 last:border-b-0">
    <div className="flex-1">
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
    </div>
    <Switch checked={value} onCheckedChange={onChange} />
  </div>
);

const Notifications = () => {
  const [p, setP] = useState<Prefs>(DEFAULT);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setP({ ...DEFAULT, ...JSON.parse(s) }); } catch {}
  }, []);

  const update = (k: keyof Prefs, v: boolean) => {
    const next = { ...p, [k]: v };
    setP(next);
    localStorage.setItem(KEY, JSON.stringify(next));
    toast.success("Saved");
  };

  return (
    <AppLayout>
      <MobileHeader title="Notifications" />
      <main className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl bg-card">
          <Row label="ITR filing reminders" desc="Due-date nudges for July & September" value={p.itrReminders} onChange={(v) => update("itrReminders", v)} />
          <Row label="Tax news" desc="Budget changes, slab updates, GST notifications" value={p.taxNews} onChange={(v) => update("taxNews", v)} />
          <Row label="Notice alerts" desc="When we detect a notice you should act on" value={p.noticeAlerts} onChange={(v) => update("noticeAlerts", v)} />
          <Row label="Tips & tricks" desc="Weekly tax-saving ideas" value={p.tipsAndTricks} onChange={(v) => update("tipsAndTricks", v)} />
          <Row label="Product updates" desc="New features in Axcis Ledger" value={p.productUpdates} onChange={(v) => update("productUpdates", v)} />
        </div>
        <p className="mt-4 px-1 text-xs text-muted-foreground">
          Push notifications require installing Axcis Ledger on your home screen. Email alerts are sent to your registered email.
        </p>
      </main>
    </AppLayout>
  );
};

export default Notifications;
