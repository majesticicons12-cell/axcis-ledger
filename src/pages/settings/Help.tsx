import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { ChevronDown, Mail, MessageSquare, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const faqs = [
  { q: "How accurate is the AI tax advice?", a: "Axcis Ledger uses an advanced AI model trained on Indian tax law (FY 2024-25). For routine personal tax it's reliable, but for complex matters — scrutiny notices, business audits, large capital gains — please consult a human CA." },
  { q: "How many free questions do I get?", a: "Free plan: 10 AI questions per month. Premium plan (₹199/month): 100 questions per month plus priority support." },
  { q: "Is my financial data safe?", a: "Yes. All data is stored in our secure backend with encryption. We never sell your data or use your conversations to train AI models. You can export or delete everything from Privacy & Security." },
  { q: "Which ITR form should I use?", a: "Open the ITR Filing Helper from the Tools tab — answer a few questions and the AI will recommend the right form (ITR-1/2/3/4) and generate a PDF working sheet for you." },
  { q: "Can I file my ITR through this app?", a: "Not directly yet. We help you understand which form, what documents and how to fill each section, and we generate a filled PDF you can use. The actual filing happens on the official Income Tax portal." },
  { q: "How do I cancel Premium?", a: "Premium is billed monthly. You can cancel anytime from Profile → Manage Premium and you'll keep access until the end of the current billing cycle." },
];

const Help = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState<number | null>(0);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!user) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in subject and message"); return;
    }
    setSending(true);
    try {
      const { data: profile } = await supabase
        .from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      const { error } = await supabase.from("support_requests").insert({
        user_id: user.id,
        user_email: user.email ?? "",
        user_name: profile?.display_name ?? null,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) throw error;

      // Also open mailto as a backup so the support team gets it instantly
      const body = encodeURIComponent(
        `From: ${profile?.display_name || user.email}\nEmail: ${user.email}\n\n${message.trim()}`
      );
      window.location.href = `mailto:axcis.ai@gmail.com?subject=${encodeURIComponent(subject.trim())}&body=${body}`;

      toast.success("Sent to support — we'll reply within 24h");
      setSubject(""); setMessage(""); setShowForm(false);
    } catch (e) {
      console.error(e);
      toast.error("Could not send. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <AppLayout>
      <MobileHeader title="Help & Support" />
      <main className="px-4 pt-4 pb-8">
        <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Frequently asked
        </h2>
        <div className="overflow-hidden rounded-2xl bg-card">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className={`${i !== faqs.length - 1 ? "border-b border-border/50" : ""}`}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left active:bg-secondary"
                >
                  <span className="text-sm font-medium">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</div>
                )}
              </div>
            );
          })}
        </div>

        <h2 className="mb-3 mt-6 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Contact us
        </h2>
        <div className="space-y-2">
          <Link to="/chat" className="flex items-center gap-3 rounded-2xl bg-card p-4 active:bg-secondary">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Ask the AI CA</div>
              <div className="text-xs text-muted-foreground">Instant tax answers, 24/7</div>
            </div>
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left active:bg-secondary"
          >
            <Mail className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Email support</div>
              <div className="text-xs text-muted-foreground">axcis.ai@gmail.com · replies in 24h</div>
            </div>
          </button>

          {showForm && (
            <div className="space-y-3 rounded-2xl bg-card p-4 shadow-soft">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                maxLength={120}
                className="w-full rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question…"
                rows={5}
                maxLength={2000}
                className="w-full resize-none rounded-xl bg-secondary px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>From: {user?.email}</span>
                <span>{message.length}/2000</span>
              </div>
              <button
                onClick={submit}
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-grad py-3 text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98] disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending…" : "Send to support"}
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">Axcis Ledger · v1.0</p>
      </main>
    </AppLayout>
  );
};

export default Help;
