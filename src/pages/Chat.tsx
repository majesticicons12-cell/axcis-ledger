import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { Send, Sparkles, FileSearch, FileText, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS: Record<string, { label: string; prompt: string }[]> = {
  default: [
    { label: "Best way to save tax on ₹15L salary?", prompt: "I earn ₹15 lakh per year. What are the best legal ways to save tax? Compare old vs new regime." },
    { label: "ELSS or PPF for 80C?", prompt: "I want to use my 80C limit. Should I go with ELSS mutual funds or PPF? I am 28 years old and can take some risk." },
    { label: "Freelancer tax basics", prompt: "I am a freelance designer earning ₹8 lakh a year. What taxes do I pay, do I need GST, and which ITR do I file?" },
  ],
  notice: [
    { label: "I got a 143(1) notice", prompt: "I received a notice under section 143(1). What does it mean and what should I do?" },
    { label: "Defective return 139(9)", prompt: "My ITR was marked defective under section 139(9). How do I fix it?" },
  ],
  itr: [
    { label: "Which ITR form for me?", prompt: "Help me figure out which ITR form I should file. Ask me the questions I need to answer." },
    { label: "Documents I need", prompt: "What documents do I need to file my ITR as a salaried person with some mutual fund investments?" },
  ],
};

const Chat = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const mode = (params.get("mode") || "default") as keyof typeof STARTERS;
  const cidParam = params.get("cid");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load specific or most-recent conversation for this mode
  useEffect(() => {
    if (!user) return;
    (async () => {
      let cid: string | null = cidParam;
      if (!cid) {
        const { data } = await supabase
          .from("conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("mode", mode)
          .order("updated_at", { ascending: false })
          .limit(1);
        cid = data?.[0]?.id ?? null;
      }
      if (!cid) return;
      setConversationId(cid);
      const { data: msgs } = await supabase
        .from("messages")
        .select("role, content, created_at")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: true });
      if (msgs) setMessages(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    })();
  }, [user, mode, cidParam]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistant = "";
    const upsert = (chunk: string) => {
      assistant += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: next, mode, conversationId }),
      });

      if (!resp.ok) {
        let errMsg = "AI service error";
        try { const j = await resp.json(); errMsg = j.message || j.error || errMsg; } catch {}
        if (resp.status === 403) toast.error(errMsg);
        else if (resp.status === 429) toast.error("Too many requests — please wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error(errMsg);
        // remove the optimistic user msg on hard fail
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      const newCid = resp.headers.get("X-Conversation-Id");
      if (newCid && newCid !== conversationId) setConversationId(newCid);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const modeMeta = {
    default: { icon: MessageSquare, title: "AI Tax Assistant" },
    notice: { icon: FileSearch, title: "Notice Analyzer" },
    itr: { icon: FileText, title: "ITR Filing Helper" },
  } as const;
  const m = modeMeta[mode] ?? modeMeta.default;

  return (
    <AppLayout>
      <MobileHeader title={m.title} back={true} />

      <main className="px-4 pt-4 pb-44">
        {messages.length === 0 && (
          <div className="mb-4">
            <h2 className="mb-3 text-2xl font-bold">{m.title}</h2>
            <div className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Try a starter
            </div>
            <div className="space-y-2">
              {(STARTERS[mode] ?? STARTERS.default).map((s) => (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  className="w-full rounded-xl border border-border/50 bg-card p-3.5 text-left text-sm transition-smooth active:scale-[0.99] active:bg-secondary"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-soft ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:font-semibold">
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
      </main>

      <div className="fixed inset-x-0 bottom-[72px] z-40 mx-auto w-full max-w-[480px] border-t border-border/40 bg-background/95 px-3 py-3 backdrop-blur-xl pb-safe">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl bg-card px-4 py-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "notice" ? "Paste your notice text..." : "Ask your tax question..."}
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

export default Chat;
