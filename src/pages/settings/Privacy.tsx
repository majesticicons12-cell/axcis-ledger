import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, KeyRound, Trash2, ShieldCheck, Download } from "lucide-react";

const Privacy = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const sendReset = async () => {
    if (!user?.email) return;
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  };

  const exportData = async () => {
    if (!user) return;
    setBusy(true);
    const [profiles, conversations, messages, transactions] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id),
      supabase.from("conversations").select("*").eq("user_id", user.id),
      supabase.from("messages").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("*").eq("user_id", user.id),
    ]);
    setBusy(false);
    const blob = new Blob(
      [JSON.stringify({ profile: profiles.data, conversations: conversations.data, messages: messages.data, transactions: transactions.data }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `axcis-ledger-export-${Date.now()}.json`;
    a.click();
    toast.success("Export downloaded");
  };

  const deleteAll = async () => {
    if (!user) return;
    if (!confirm("This will permanently delete all your chats, transactions and account data. Continue?")) return;
    setBusy(true);
    await Promise.all([
      supabase.from("messages").delete().eq("user_id", user.id),
      supabase.from("conversations").delete().eq("user_id", user.id),
      supabase.from("transactions").delete().eq("user_id", user.id),
    ]);
    setBusy(false);
    toast.success("Data deleted. Signing out...");
    await signOut();
    navigate("/", { replace: true });
  };

  const Item = ({ icon: Icon, label, desc, onClick, danger }: any) => (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-4 text-left transition-smooth last:border-b-0 active:bg-secondary disabled:opacity-50`}
    >
      <Icon className={`h-5 w-5 ${danger ? "text-destructive" : "text-primary"}`} strokeWidth={2.2} />
      <div className="flex-1">
        <div className={`text-sm font-medium ${danger ? "text-destructive" : ""}`}>{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );

  return (
    <AppLayout>
      <MobileHeader title="Privacy & Security" />
      <main className="px-4 pt-4">
        <section className="mb-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Your data is encrypted</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Stored securely in our backend. We never share your tax info with third parties or use it to train AI models.
          </p>
        </section>

        <div className="overflow-hidden rounded-2xl bg-card">
          <Item icon={KeyRound} label="Reset password" desc="Send a reset link to your email" onClick={sendReset} />
          <Item icon={Download} label="Export my data" desc="Download a JSON copy of everything" onClick={exportData} />
          <Item icon={Lock} label="Sign out everywhere" desc="Sign out of all devices" onClick={async () => { await signOut(); navigate("/"); }} />
          <Item icon={Trash2} label="Delete all my data" desc="Permanently remove your account contents" onClick={deleteAll} danger />
        </div>
      </main>
    </AppLayout>
  );
};

export default Privacy;
