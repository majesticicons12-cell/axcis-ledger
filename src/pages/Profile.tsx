import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Star, Bell, Shield, HelpCircle, FileText, LogOut, ChevronRight,
  User as UserIcon, Mail, Pencil, MessageSquare, Crown,
} from "lucide-react";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  salaried: "Salaried Employee",
  business: "Business Owner",
  freelancer: "Freelancer / Professional",
  student: "Student",
  retired: "Retired / Pensioner",
  other: "Other",
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [used, setUsed] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const limit = plan === "premium" ? 100 : 10;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, profile_type, plan, plan_started_at, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      setName(data?.display_name || user.email?.split("@")[0] || "");
      setProfileType(data?.profile_type ?? null);
      const userPlan = (data?.plan as "free" | "premium") || "free";
      setPlan(userPlan);

      // Free: monthly. Premium: since plan_started_at (cumulative, no reset).
      let windowStart: Date;
      if (userPlan === "premium") {
        windowStart = new Date(data?.plan_started_at ?? data?.created_at ?? 0);
      } else {
        windowStart = new Date();
        windowStart.setUTCDate(1);
        windowStart.setUTCHours(0, 0, 0, 0);
      }
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("role", "user")
        .gte("created_at", windowStart.toISOString());
      setUsed(count ?? 0);

      const { data: roleRow } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!roleRow);
    })();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const settings = [
    { icon: Pencil, label: "Edit profile", to: "/profile/edit" },
    { icon: Bell, label: "Notifications", to: "/settings/notifications" },
    { icon: Shield, label: "Privacy & Security", to: "/settings/privacy" },
    { icon: FileText, label: "Tax Documents", to: "/settings/documents" },
    { icon: HelpCircle, label: "Help & Support", to: "/settings/help" },
    ...(isAdmin ? [{ icon: Crown, label: "Admin Console", to: "/admin" }] : []),
  ];

  const pct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <AppLayout>
      <header className="flex items-center justify-between px-5 pt-safe pt-4">
        <h1 className="text-xl font-bold">Profile</h1>
      </header>

      <main className="px-5 pt-6">
        {/* Avatar + name */}
        <section className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-primary">
            <UserIcon className="h-10 w-10" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold">{name || "User"}</h2>
          <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {user?.email}
          </div>
          {profileType && (
            <span className="mt-2 text-xs font-medium text-primary">
              {TYPE_LABELS[profileType] ?? profileType}
            </span>
          )}
          <span className={`mt-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${
            plan === "premium" ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground"
          }`}>
            {plan === "premium" ? "PREMIUM" : "FREE PLAN"}
          </span>
        </section>

        {/* Usage card */}
        <section className="mb-6 rounded-2xl bg-card p-5 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {plan === "premium" ? "AI Questions used" : "AI Questions this month"}
              </span>
            </div>
            <span className="text-sm font-bold">{used} / {limit}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary-grad transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {plan === "premium"
              ? "100 questions on your premium plan — no monthly reset. Renew when you've used them all."
              : "Free plan: 10 questions/month. Upgrade for 100 (no monthly reset)."}
          </p>
        </section>

        {/* Premium card */}
        {plan !== "premium" && (
          <section className="mb-6 rounded-2xl border border-primary/40 bg-premium-grad p-5">
            <div className="mb-2 flex items-center gap-2">
              <Star className="h-5 w-5 fill-warning text-warning" />
              <h3 className="font-bold">AXCIS Premium</h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              100 AI questions/month, priority support, advanced tax planning.
            </p>
            <div className="mb-4 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold">₹199</span>
              <span className="text-sm text-muted-foreground">/ month · 100 questions</span>
            </div>
            <button
              onClick={() => toast("Razorpay integration coming soon — you'll be able to subscribe here")}
              className="w-full rounded-xl bg-primary-grad py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth active:scale-[0.98]"
            >
              Upgrade to Premium
            </button>
          </section>
        )}

        {/* Settings list */}
        <section className="mb-6">
          <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Settings
          </h3>
          <div className="overflow-hidden rounded-2xl bg-card">
            {settings.map((s, i) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.label}
                  to={s.to}
                  className={`flex w-full items-center justify-between px-4 py-4 text-left transition-smooth active:bg-secondary ${
                    i !== settings.length - 1 ? "border-b border-border/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" strokeWidth={2.2} />
                    <span className="text-sm font-medium">{s.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>

        <button
          onClick={handleSignOut}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 py-4 text-sm font-semibold text-destructive transition-smooth active:scale-[0.98]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>

        <p className="pb-4 text-center text-xs text-muted-foreground">
          AXCIS Ledger · v1.0 · Intelligence Without Limits
        </p>
      </main>
    </AppLayout>
  );
};

export default Profile;
