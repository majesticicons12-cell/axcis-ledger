import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { MessageSquare, FileSearch, FileText, Trash2, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Tab = "chats" | "notice" | "itr";

type Convo = { id: string; title: string; mode: string; updated_at: string };
type HistItem = { id: string; kind: string; title: string; content: string; created_at: string };

const History = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("chats");
  const [convos, setConvos] = useState<Convo[]>([]);
  const [items, setItems] = useState<HistItem[]>([]);
  const [open, setOpen] = useState<HistItem | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [c, h] = await Promise.all([
      supabase.from("conversations").select("id, title, mode, updated_at")
        .eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100),
      supabase.from("history_items").select("id, kind, title, content, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setConvos((c.data as Convo[]) ?? []);
    setItems((h.data as HistItem[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const deleteConvo = async (id: string) => {
    await supabase.from("messages").delete().eq("conversation_id", id);
    await supabase.from("conversations").delete().eq("id", id);
    setConvos((prev) => prev.filter((c) => c.id !== id));
    toast.success("Deleted");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("history_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Deleted");
  };

  const filteredItems = items.filter((i) => i.kind === tab);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "chats", label: "Chats", icon: MessageSquare },
    { id: "notice", label: "Notices", icon: FileSearch },
    { id: "itr", label: "ITR", icon: FileText },
  ];

  return (
    <AppLayout>
      <MobileHeader title="History" back />
      <main className="px-4 pt-4 pb-24">
        <div className="mb-4 flex gap-2 rounded-2xl bg-card p-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-smooth ${
                  active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        {loading && <p className="text-center text-sm text-muted-foreground">Loading…</p>}

        {!loading && tab === "chats" && (
          <div className="space-y-2">
            {convos.length === 0 && <EmptyState text="No chats yet. Ask the AI anything!" />}
            {convos.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <Link to={`/chat?mode=${c.mode}&cid=${c.id}`} className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.mode} · {new Date(c.updated_at).toLocaleDateString()}
                  </div>
                </Link>
                <button onClick={() => deleteConvo(c.id)} className="text-muted-foreground active:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}

        {!loading && tab !== "chats" && (
          <div className="space-y-2">
            {filteredItems.length === 0 && (
              <EmptyState text={tab === "notice" ? "No saved notice analyses yet." : "No saved ITR sessions yet."} />
            )}
            {filteredItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <button onClick={() => setOpen(item)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-semibold">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </button>
                <button onClick={() => deleteItem(item.id)} className="text-muted-foreground active:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(null)}
          >
            <div
              className="max-h-[85vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-card p-5 shadow-glow sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="text-base font-bold">{open.title}</h2>
                <button onClick={() => setOpen(null)} className="text-muted-foreground">✕</button>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{open.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </main>
    </AppLayout>
  );
};

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
    {text}
  </div>
);

export default History;
