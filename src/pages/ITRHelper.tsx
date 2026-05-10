import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { Send, FileDown, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateItrPdf, type ItrData } from "@/lib/itrPdf";

type Msg = { role: "user" | "assistant"; content: string };

const STARTER = (profileType: string | null, name: string) =>
  `Hi${name ? " " + name : ""}! I'll help you prepare your ITR for **AY 2025-26**.

Tell me about your income — I'll ask follow-ups, then generate a filled PDF working sheet you can use to file on the Income Tax portal.

To start, share:
1. Your **PAN** (or last 4)
2. Your **employment** — ${profileType ? `you're noted as **${profileType}**, is that right?` : "salaried, business, freelancer, or other?"}
3. Your **gross annual income** for FY 2024-25

You can answer in one message — be as detailed as you like.`;

const ITRHelper = () => {
  const { user } = useAuth();
  const [profileType, setProfileType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles").select("display_name, profile_type")
        .eq("user_id", user.id).maybeSingle();
      const n = data?.display_name || "";
      const t = data?.profile_type ?? null;
      setName(n); setProfileType(t);
      setMessages([{ role: "assistant", content: STARTER(t, n) }]);
    })();
  }, [user]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next); setInput(""); setLoading(true);

    let assistant = "";
    const upsert = (chunk: string) => {
      assistant += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && assistant.length > 0 && prev.length > next.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistant } : m));
        }
        return [...prev, { role: "assistant", content: assistant }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please sign in again"); setLoading(false); return; }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-ca-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: next, mode: "itr" }),
      });

      if (!resp.ok) {
        let msg = "AI service error";
        try { const j = await resp.json(); msg = j.message || j.error || msg; } catch {}
        toast.error(msg);
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false); return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      console.error(e); toast.error("Connection error");
    } finally { setLoading(false); }
  };

  const buildPdf = async () => {
    if (building) return;
    if (messages.filter((m) => m.role === "user").length < 1) {
      toast.error("Tell me about your income first."); return;
    }
    setBuilding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please sign in again"); return; }
      const transcript = messages
        .map((m) => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`)
        .join("\n\n");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/itr-extract`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ conversation: transcript }),
      });
      if (!resp.ok) {
        toast.error("Could not build the PDF"); return;
      }
      const j = await resp.json();
      const data: ItrData = j.data || {};
      generateItrPdf(data);
      // Save to history
      const transcriptShort = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n---\n\n");
      await supabase.from("history_items").insert({
        user_id: user!.id,
        kind: "itr",
        title: `ITR session · ${new Date().toLocaleDateString()}`,
        content: transcriptShort || "ITR session",
        meta: { extracted: data },
      });
      toast.success("ITR PDF downloaded & saved to history");
    } catch (e) {
      console.error(e); toast.error("Failed to build PDF");
    } finally { setBuilding(false); }
  };

  return (
    <AppLayout>
      <MobileHeader title="ITR Filing Helper" back />
      <main className="px-4 pt-4 pb-44">
        <div className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Conversational ITR builder
        </div>

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-soft ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2">
                    <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-card px-4 py-3 shadow-soft">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <button
          onClick={buildPdf}
          disabled={building || loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-grad py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth active:scale-[0.98] disabled:opacity-60"
        >
          <FileDown className="h-4 w-4" />
          {building ? "Building your ITR PDF…" : "Generate filled ITR PDF"}
        </button>
      </main>

      <div className="fixed inset-x-0 bottom-[72px] z-40 mx-auto w-full max-w-[480px] border-t border-border/40 bg-background/95 px-3 py-3 backdrop-blur-xl pb-safe">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl bg-card px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Answer the AI's question…"
              disabled={loading}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-grad text-primary-foreground shadow-glow transition-smooth active:scale-95 disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </AppLayout>
  );
};

export default ITRHelper;
