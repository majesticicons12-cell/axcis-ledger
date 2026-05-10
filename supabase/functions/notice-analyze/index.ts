// Accepts a storage path to a notice file (PDF or image) in the 'notices' bucket
// and asks Groq (vision-capable model) to analyze it.
// Returns a structured analysis as plain markdown.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are an Indian tax expert. The user has uploaded a scan/PDF/photo of a tax notice from the Income Tax Department.
Read the document carefully and respond in markdown with these sections:
1. **What this notice is** — section number, type (intimation / scrutiny / defective / demand / refund), assessment year.
2. **Key numbers** — demand, refund, additions, TDS mismatch, etc.
3. **Why it was issued** — likely reason in plain English.
4. **What to do next** — numbered action plan with deadlines.
5. **Should you involve a CA?** — yes/no + why.
Be calm, precise, no jargon. Never invent section numbers.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { storagePath, extraNote } = await req.json();
    if (!storagePath || typeof storagePath !== "string") {
      return new Response(JSON.stringify({ error: "storagePath required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure the path belongs to this user
    if (!storagePath.startsWith(u.user.id + "/")) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: file, error: dlErr } = await admin.storage.from("notices").download(storagePath);
    if (dlErr || !file) {
      return new Response(JSON.stringify({ error: "Could not read file" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ab = await file.arrayBuffer();
    const bytes = new Uint8Array(ab);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);

    // Detect mime
    const lower = storagePath.toLowerCase();
    let mime = "image/jpeg";
    if (lower.endsWith(".png")) mime = "image/png";
    else if (lower.endsWith(".webp")) mime = "image/webp";
    else if (lower.endsWith(".pdf")) mime = "application/pdf";

    const userParts: any[] = [
      { type: "text", text: extraNote ? `Additional context from user: ${extraNote}\n\nNow analyze the attached notice.` : "Please analyze the attached notice." },
      { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
    ];

    const aiResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userParts },
        ],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("notice-analyze AI error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const j = await aiResp.json();
    const text = j.choices?.[0]?.message?.content ?? "Sorry, I couldn't read that file.";
    return new Response(JSON.stringify({ analysis: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notice-analyze", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
