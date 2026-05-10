import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TYPES = [
  { id: "salaried", label: "Salaried Employee" },
  { id: "business", label: "Business Owner" },
  { id: "freelancer", label: "Freelancer / Professional" },
  { id: "student", label: "Student" },
  { id: "retired", label: "Retired / Pensioner" },
  { id: "other", label: "Other" },
];

const EditProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState("salaried");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, profile_type")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setName(data?.display_name || "");
        setType(data?.profile_type || "salaried");
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("Name can't be empty"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim(), profile_type: type })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    navigate("/profile");
  };

  return (
    <AppLayout>
      <MobileHeader title="Edit Profile" />
      <main className="px-5 pt-6 pb-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-6 w-full rounded-2xl bg-card px-4 py-3.5 text-sm outline-none ring-1 ring-border/50 focus:ring-primary/60"
            />

            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
            <input
              value={user?.email || ""}
              disabled
              className="mb-6 w-full rounded-2xl bg-card px-4 py-3.5 text-sm text-muted-foreground outline-none ring-1 ring-border/50"
            />

            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">I am a</label>
            <div className="mb-8 space-y-2">
              {TYPES.map((t) => {
                const active = type === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border bg-card px-4 py-3.5 text-left text-sm transition-smooth active:scale-[0.99] ${
                      active ? "border-primary bg-primary/10 font-semibold" : "border-border/50"
                    }`}
                  >
                    {t.label}
                    <div className={`h-5 w-5 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`} />
                  </button>
                );
              })}
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-2xl bg-primary-grad py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </>
        )}
      </main>
    </AppLayout>
  );
};

export default EditProfile;
