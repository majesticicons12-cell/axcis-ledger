// Extracts structured ITR data from a free-form conversation using Groq.
// Returns JSON the client can use to fill the PDF.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `You are an Indian tax expert. From the user's answers, extract data needed to fill a basic ITR (Income Tax Return) for FY 2024-25 / AY 2025-26.
Return ONLY a tool call with the structured fields. If a field is unknown, use null. Recommend the correct ITR form (ITR-1, ITR-2, ITR-3 or ITR-4) based on income sources.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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

    const { conversation } = await req.json();
    if (!conversation || typeof conversation !== "string") {
      return new Response(JSON.stringify({ error: "conversation (string) required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const tools = [{
      type: "function",
      function: {
        name: "build_itr",
        description: "Structured ITR data ready to render into PDF",
        parameters: {
          type: "object",
          additionalProperties: false,
          properties: {
            recommended_form: { type: "string", description: "ITR-1, ITR-2, ITR-3 or ITR-4" },
            assessment_year: { type: "string" },
            personal: {
              type: "object",
              properties: {
                name: { type: "string" },
                pan: { type: "string" },
                dob: { type: "string" },
                mobile: { type: "string" },
                email: { type: "string" },
                address: { type: "string" },
                aadhaar_last4: { type: "string" },
              },
            },
            regime: { type: "string", description: "old or new" },
            income: {
              type: "object",
              properties: {
                salary: { type: "number" },
                house_property: { type: "number" },
                business_or_profession: { type: "number" },
                short_term_capital_gains: { type: "number" },
                long_term_capital_gains: { type: "number" },
                other_sources: { type: "number" },
              },
            },
            deductions: {
              type: "object",
              properties: {
                sec_80c: { type: "number" },
                sec_80d: { type: "number" },
                sec_80ccd_1b: { type: "number" },
                sec_80g: { type: "number" },
                hra_exempt: { type: "number" },
                std_deduction: { type: "number" },
                home_loan_interest: { type: "number" },
              },
            },
            tax: {
              type: "object",
              properties: {
                tds: { type: "number" },
                advance_tax: { type: "number" },
                self_assessment_tax: { type: "number" },
              },
            },
            bank: {
              type: "object",
              properties: {
                bank_name: { type: "string" },
                ifsc: { type: "string" },
                account_last4: { type: "string" },
              },
            },
            notes_for_user: { type: "string", description: "Plain-English summary of key points or missing info" },
          },
          required: ["recommended_form", "assessment_year"],
        },
      },
    }];

    const aiResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: conversation },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "build_itr" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("itr-extract AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: unknown = {};
    try { parsed = typeof args === "string" ? JSON.parse(args) : args; } catch { parsed = {}; }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("itr-extract", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
