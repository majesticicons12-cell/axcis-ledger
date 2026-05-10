// AI Chartered Accountant streaming chat via Groq
// Persists conversations & messages, enforces monthly quota.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_LIMIT = 10;
const PREMIUM_LIMIT = 100;

const SYSTEM_PROMPT = `You are "Axcis Ledger", a friendly, highly-skilled personal Chartered Accountant and tax advisor for India (FY 2024-25 / AY 2025-26 by default).

You help with: personal income tax (old vs new), 80C/80D/80CCD/HRA/LTA, GST basics, decoding tax notices, ITR form selection, capital gains (STCG/LTCG, sec 54/54F/54EC), salary structuring, freelance/crypto/foreign income, PPF/ELSS/NPS, budgeting.

Style:
- Warm, clear, like a trusted family CA. Simple language, explain abbreviations once.
- Markdown: short paragraphs, **bold** key numbers, bullets, small comparison tables.
- Walk through deductions with example numbers when relevant.
- Always end with ONE short actionable next step.

Boundaries:
- Never invent section numbers, limits or due dates. If unsure, say so.
- For audits, scrutiny notices or amounts above ~25 lakh, recommend a human CA.
- Not legal advice on disputes — general guidance only.`;

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
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth-scoped client (to identify the user)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client to bypass RLS for inserts & quota lookup
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const messages: { role: string; content: string }[] = body.messages ?? [];
    const mode: string = body.mode ?? "default";
    let conversationId: string | null = body.conversationId ?? null;

    // Get profile (plan + profile_type + plan_started_at)
    const { data: profile } = await admin
      .from("profiles")
      .select("plan, profile_type, display_name, plan_started_at, created_at")
      .eq("user_id", user.id)
      .maybeSingle();

    const plan = profile?.plan ?? "free";
    const limit = plan === "premium" ? PREMIUM_LIMIT : FREE_LIMIT;

    // Quota window:
    // - Free: count user messages from start of current calendar month (resets monthly).
    // - Premium: count user messages since plan_started_at (no reset; cumulative until 100).
    let windowStart: Date;
    if (plan === "premium") {
      windowStart = profile?.plan_started_at
        ? new Date(profile.plan_started_at)
        : new Date(profile?.created_at ?? 0);
    } else {
      windowStart = new Date();
      windowStart.setUTCDate(1);
      windowStart.setUTCHours(0, 0, 0, 0);
    }
    const { count: usedThisMonth } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("role", "user")
      .gte("created_at", windowStart.toISOString());

    if ((usedThisMonth ?? 0) >= limit) {
      return new Response(
        JSON.stringify({
          error: "quota_exceeded",
          message: plan === "premium"
            ? `You've used all ${PREMIUM_LIMIT} questions on your premium plan. Renew to get another 100.`
            : `Free plan allows ${FREE_LIMIT} questions/month. Upgrade to Premium (₹199) for ${PREMIUM_LIMIT}.`,
          plan, used: usedThisMonth, limit,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure conversation exists
    if (!conversationId) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content ?? "New chat";
      const title = lastUserMsg.slice(0, 60);
      const { data: convo, error: cErr } = await admin
        .from("conversations")
        .insert({ user_id: user.id, title, mode })
        .select("id")
        .single();
      if (cErr) throw cErr;
      conversationId = convo.id;
    } else {
      await admin.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    }

    // Persist the latest user message
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "user") {
      await admin.from("messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "user",
        content: lastMsg.content,
      });
    }

    // Build dynamic system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (profile?.profile_type) {
      systemPrompt += `\n\nUser context: This person identifies as a **${profile.profile_type}**. Tailor advice accordingly. Do NOT assume any other employment type — ask follow-up questions if you need more detail.`;
    } else {
      systemPrompt += `\n\nUser context: Employment type is UNKNOWN. Before giving tax-saving advice, ASK the user whether they are salaried, a business owner, a freelancer/professional, a student, retired, or other. Do not assume.`;
    }
    if (profile?.display_name) systemPrompt += `\n\nAddress them as ${profile.display_name} when natural.`;
    if (mode === "notice") {
      systemPrompt += `\n\nThe user is analyzing an income tax notice. Extract: (1) Section, (2) Assessment Year, (3) Demand/refund amount, (4) Reason. Then explain in 4 bullets and a numbered action plan.`;
    } else if (mode === "itr") {
      systemPrompt += `\n\nThe user wants help filing their ITR. First ask about: salary, business/professional income, capital gains, house property, foreign income, crypto. Then recommend the correct ITR form (1/2/3/4) and list documents needed.`;
    }

    const aiResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Tee the SSE stream: forward to client, accumulate full assistant content, save at end.
    let assistantText = "";
    const transform = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        try {
          const text = new TextDecoder().decode(chunk);
          for (const line of text.split("\n")) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const json = l.slice(5).trim();
            if (json === "[DONE]") continue;
            try {
              const p = JSON.parse(json);
              const c = p.choices?.[0]?.delta?.content;
              if (c) assistantText += c;
            } catch { /* partial */ }
          }
        } catch { /* ignore */ }
      },
      async flush() {
        if (assistantText.trim() && conversationId) {
          await admin.from("messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: assistantText,
          });
        }
      },
    });

    return new Response(aiResp.body!.pipeThrough(transform), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Conversation-Id": conversationId ?? "",
      },
    });
  } catch (e) {
    console.error("ai-ca-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
