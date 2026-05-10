import { useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import MobileHeader from "@/components/MobileHeader";
import { Camera, Upload, Sparkles, FileSearch, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NoticeAnalyzer = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
    setFile(f);
    setAnalysis("");
    if (f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  };

  const reset = () => {
    setFile(null); setPreviewUrl(null); setAnalysis(""); setExtra("");
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const analyze = async () => {
    if (!file || !user) return;
    setLoading(true); setAnalysis("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("notices").upload(path, file, {
        upsert: false, contentType: file.type,
      });
      if (upErr) { toast.error("Upload failed: " + upErr.message); setLoading(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notice-analyze`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ storagePath: path, extraNote: extra }),
      });
      if (!resp.ok) {
        let msg = "Analysis failed";
        try { const j = await resp.json(); msg = j.error || msg; } catch {}
        toast.error(msg); return;
      }
      const j = await resp.json();
      const analysisText = j.analysis || "";
      setAnalysis(analysisText);
      // Auto-save to history
      if (analysisText) {
        await supabase.from("history_items").insert({
          user_id: user.id,
          kind: "notice",
          title: file.name.length > 60 ? file.name.slice(0, 60) : file.name,
          content: analysisText,
          meta: { filename: file.name, note: extra || null },
        });
      }
    } catch (e) {
      console.error(e); toast.error("Something went wrong");
    } finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <MobileHeader title="Notice Analyzer" back />
      <main className="px-4 pt-4 pb-24">
        <div className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Upload your notice — AI reads it for you
        </div>

        {!file && (
          <div className="rounded-2xl bg-card p-5 text-center shadow-soft">
            <FileSearch className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-lg font-bold">Upload your tax notice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF or photo. We'll explain what it means and what to do next.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl bg-secondary p-4 transition-smooth active:scale-[0.97]"
              >
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold">Take a photo</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl bg-secondary p-4 transition-smooth active:scale-[0.97]"
              >
                <Upload className="h-6 w-6 text-primary" />
                <span className="text-sm font-semibold">Choose file</span>
              </button>
            </div>

            <input
              ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <input
              ref={fileRef} type="file" accept="image/*,application/pdf" hidden
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {file && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-card p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between">
                <span className="truncate text-sm font-semibold">{file.name}</span>
                <button onClick={reset} className="text-muted-foreground active:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Notice preview" className="max-h-64 w-full rounded-xl object-contain bg-black/40" loading="lazy" />
              )}
              {!previewUrl && (
                <div className="flex h-24 items-center justify-center rounded-xl bg-secondary text-xs text-muted-foreground">
                  PDF · {(file.size / 1024).toFixed(0)} KB
                </div>
              )}
            </div>

            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Optional: add anything you want the AI to know (e.g. 'I'm salaried, FY24-25')"
              rows={3}
              className="w-full resize-none rounded-2xl bg-card p-4 text-sm outline-none placeholder:text-muted-foreground"
            />

            <button
              onClick={analyze}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-grad py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Analyzing your notice…" : "Analyze with AI"}
            </button>

            {analysis && (
              <div className="rounded-2xl bg-card p-4 shadow-soft">
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default NoticeAnalyzer;
