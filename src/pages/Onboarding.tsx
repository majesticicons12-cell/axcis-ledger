import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Building2, Palette, GraduationCap, Coffee, MoreHorizontal, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { id: "salaried", label: "Salaried Employee", desc: "Monthly salary, Form 16", icon: Briefcase },
  { id: "business", label: "Business Owner", desc: "Sole prop, partnership, company", icon: Building2 },
  { id: "freelancer", label: "Freelancer / Professional", desc: "Designer, consultant, doctor, lawyer", icon: Palette },
  { id: "student", label: "Student", desc: "No regular income yet", icon: GraduationCap },
  { id: "retired", label: "Retired / Pensioner", desc: "Pension, FD, dividends", icon: Coffee },
  { id: "other", label: "Other", desc: "Multiple income types", icon: MoreHorizontal },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user || !picked) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        profile_type: picked,
        display_name: name.trim() || user.email?.split("@")[0] || "User",
        onboarded: true,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save — try again");
      return;
    }
    toast.success("Welcome to Axcis Ledger");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="app-shell min-h-dvh">
      <div className="px-5 pt-12 pb-8">
        <div className="mb-2 text-xs font-bold tracking-[0.2em] text-primary">AXCIS LEDGER</div>
        <h1 className="mb-2 text-3xl font-bold leading-tight">Let's personalize your advice</h1>
        <p className="text-sm text-muted-foreground">
          So your AI CA gives answers tailored to you — not generic ones.
        </p>
      </div>

      <main className="px-5 pb-32">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={user?.email?.split("@")[0] || "Your name"}
          className="mb-6 w-full rounded-2xl bg-card px-4 py-3.5 text-sm outline-none ring-1 ring-border/50 focus:ring-primary/60"
        />

        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
          I am a...
        </label>
        <div className="space-y-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = picked === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setPicked(t.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-smooth active:scale-[0.99] ${
                  active ? "border-primary bg-primary/10" : "border-border/50"
                }`}
              >
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-primary/20 text-primary" : "bg-secondary text-foreground/70"}`}>
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
                <div className={`h-5 w-5 shrink-0 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`} />
              </button>
            );
          })}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-border/40 bg-background/95 px-5 py-4 backdrop-blur-xl pb-safe">
        <button
          onClick={submit}
          disabled={!picked || saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-grad py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
