import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, FileText, AlertTriangle, Newspaper,
  ShieldCheck, Lightbulb, Settings, Star, ArrowRight,
} from "lucide-react";
import logo from "@/assets/logo.png";

const TYPE_LABELS: Record<string, string> = {
  salaried: "Salaried Employee",
  business: "Business Owner",
  freelancer: "Freelancer / Professional",
  student: "Student",
  retired: "Retired / Pensioner",
  other: "Mixed Income",
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "premium">("free");
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const monthlyLimit = plan === "premium" ? 100 : 10;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, profile_type, plan, plan_started_at, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      setName(profile?.display_name || user.email?.split("@")[0] || "");
      setProfileType(profile?.profile_type ?? null);
      const userPlan = (profile?.plan as "free" | "premium") || "free";
      setPlan(userPlan);

      // Free: monthly window. Premium: since plan_started_at (cumulative, no reset).
      let windowStart: Date;
      if (userPlan === "premium") {
        windowStart = new Date(profile?.plan_started_at ?? profile?.created_at ?? 0);
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
      setUsedThisMonth(count ?? 0);
    })();
  }, [user]);

  const quickActions = [
    { to: "/chat", icon: MessageSquare, label: "Ask AI CA" },
    { to: "/itr", icon: FileText, label: "ITR Filing" },
    { to: "/notice", icon: AlertTriangle, label: "Notice Help" },
    { to: "/updates", icon: Newspaper, label: "Tax Updates" },
  ];

  return (
    <AppLayout>
      <header className="flex items-center justify-between px-5 pt-safe pt-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Axcis Ledger" className="h-9 w-9 rounded-xl" width={36} height={36} />
          <div className="text-sm font-bold tracking-[0.18em]">AXCIS</div>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="grid h-9 w-9 place-items-center rounded-full text-foreground/80 transition-smooth active:bg-secondary"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <main className="px-5 pt-6">
        <section className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight">{name || "there"}</h1>
            {profileType ? (
              <p className="mt-1 text-sm font-medium text-primary">
                {TYPE_LABELS[profileType] ?? profileType}
              </p>
            ) : (
              <Link to="/profile/edit" className="mt-1 text-sm font-medium text-primary underline">
                Set your profile type →
              </Link>
            )}
          </div>
          <span className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider ${
            plan === "premium" ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground"
          }`}>
            {plan === "premium" ? "PREMIUM" : "FREE"}
          </span>
        </section>

        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-card p-5 shadow-soft">
            <MessageSquare className="mb-3 h-6 w-6 text-primary" strokeWidth={2.2} />
            <div className="text-2xl font-extrabold">
              {usedThisMonth}/{monthlyLimit}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{plan === "premium" ? "Questions used (of 100)" : "Questions this month"}</div>
          </div>
          <div className="rounded-2xl bg-card p-5 shadow-soft">
            <ShieldCheck className="mb-3 h-6 w-6 text-primary" strokeWidth={2.2} />
            <div className="text-2xl font-extrabold">Active</div>
            <div className="mt-1 text-xs text-muted-foreground">Status</div>
          </div>
        </section>

        <section className="mb-7 rounded-2xl border border-warning/30 bg-tip-grad p-4">
          <div className="mb-1 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            <h3 className="font-semibold text-warning">Tax Saving Tip</h3>
          </div>
          <p className="text-sm leading-relaxed text-foreground/85">
            Maximize your Section 80C deductions up to ₹1.5L
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-lg font-bold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex aspect-[1.4/1] flex-col items-center justify-center gap-3 rounded-2xl bg-card p-5 shadow-soft transition-smooth active:scale-[0.97]"
                >
                  <Icon className="h-7 w-7 text-primary" strokeWidth={2.2} />
                  <span className="text-sm font-semibold">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {plan !== "premium" && (
          <Link
            to="/profile"
            className="mb-6 flex items-center justify-between rounded-2xl border border-primary/40 bg-premium-grad p-4 transition-smooth active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-warning/15">
                <Star className="h-5 w-5 fill-warning text-warning" />
              </div>
              <div>
                <div className="text-sm font-semibold">Upgrade to Premium</div>
                <div className="text-xs text-muted-foreground">
                  100 AI questions/month for ₹199
                </div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
          </Link>
        )}
      </main>
    </AppLayout>
  );
};

export default Dashboard;
