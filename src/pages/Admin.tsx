import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Crown, UserX, Mail, Search, Users, Star, MessageSquare, KeyRound } from "lucide-react";

type ProfileRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  plan: string;
  profile_type: string | null;
  created_at: string;
};

type Stats = { total_users: number; premium_users: number; free_users: number; msgs_this_month: number };

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"users" | "tickets">("users");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [user]);

  const loadAll = async () => {
    const [{ data: s }, { data: p }, { data: t }] = await Promise.all([
      supabase.rpc("admin_user_stats"),
      supabase.from("profiles").select("id,user_id,display_name,email,plan,profile_type,created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("support_requests").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (s && Array.isArray(s) && s[0]) setStats(s[0] as Stats);
    if (p) setProfiles(p as ProfileRow[]);
    if (t) setTickets(t);
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  if (authLoading || isAdmin === null) {
    return <AppLayout><div className="grid h-screen place-items-center text-muted-foreground">Loading…</div></AppLayout>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <AppLayout>
        <MobileHeader title="Admin" />
        <main className="grid h-[60vh] place-items-center px-6 text-center">
          <div>
            <UserX className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Admins only</p>
            <p className="mt-1 text-sm text-muted-foreground">Your account doesn't have admin access.</p>
          </div>
        </main>
      </AppLayout>
    );
  }

  const togglePlan = async (row: ProfileRow) => {
    const next = row.plan === "premium" ? "free" : "premium";
    const update = {
      plan: next,
      plan_started_at: next === "premium" ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from("profiles").update(update).eq("user_id", row.user_id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Set to ${next.toUpperCase()}`);
    setProfiles((prev) => prev.map((p) => (p.user_id === row.user_id ? { ...p, plan: next } : p)));
  };

  const sendReset = async (row: ProfileRow) => {
    if (!row.email) { toast.error("No email on file"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(row.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Reset link sent to ${row.email}`);
  };

  const filtered = profiles.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (p.email || "").toLowerCase().includes(s) || (p.display_name || "").toLowerCase().includes(s);
  });

  const closeTicket = async (id: string) => {
    const { error } = await supabase.from("support_requests").update({ status: "closed" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket closed");
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: "closed" } : t)));
  };

  return (
    <AppLayout>
      <MobileHeader title="Admin Console" />
      <main className="px-4 pt-4 pb-24">
        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat icon={Users} label="Total users" value={stats.total_users} />
            <Stat icon={Star} label="Premium" value={stats.premium_users} highlight />
            <Stat icon={Users} label="Free" value={stats.free_users} />
            <Stat icon={MessageSquare} label="Msgs / month" value={stats.msgs_this_month} />
          </div>
        )}

        <div className="mb-3 flex gap-2 rounded-2xl bg-card p-1">
          {(["users", "tickets"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-xs font-bold uppercase tracking-wider ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or email"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              {filtered.map((p) => (
                <div key={p.user_id} className="rounded-2xl bg-card p-3 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.display_name || "—"}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {p.profile_type || "no type"} · joined {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => togglePlan(p)}
                      className={`ml-2 flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${
                        p.plan === "premium" ? "bg-warning/15 text-warning" : "bg-secondary text-foreground"
                      }`}>
                      <Crown className="h-3.5 w-3.5" />
                      {p.plan === "premium" ? "Premium" : "Make premium"}
                    </button>
                  </div>
                  <button
                    onClick={() => sendReset(p)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-semibold text-foreground active:opacity-70"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Send password reset
                  </button>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
              )}
            </div>
          </>
        )}

        {tab === "tickets" && (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-bold">{t.subject}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    t.status === "closed" ? "bg-secondary text-muted-foreground" : "bg-primary/20 text-primary"
                  }`}>{t.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.user_name || "—"} · {t.user_email}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{t.message}</p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={`mailto:${t.user_email}?subject=Re: ${encodeURIComponent(t.subject)}`}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary-grad py-2 text-xs font-semibold text-primary-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" /> Reply
                  </a>
                  {t.status !== "closed" && (
                    <button onClick={() => closeTicket(t.id)} className="rounded-xl bg-secondary px-3 py-2 text-xs font-semibold">
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
            {tickets.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No support tickets yet</p>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
};

const Stat = ({ icon: Icon, label, value, highlight }: any) => (
  <div className={`rounded-2xl p-4 shadow-soft ${highlight ? "bg-primary/10 border border-primary/30" : "bg-card"}`}>
    <Icon className="mb-2 h-5 w-5 text-primary" />
    <div className="text-2xl font-extrabold">{value}</div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

export default Admin;
