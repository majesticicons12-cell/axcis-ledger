// WhatsApp OTP password reset via WhatsApp Cloud API
// Stores OTP in a password_reset_codes table, sends via WhatsApp Business API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { action, phone, otp, newPassword } = await req.json();

    if (!phone || typeof phone !== "string") {
      return new Response(JSON.stringify({ error: "Phone number required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Send OTP ──
    if (action === "send") {
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

      // Upsert OTP (replace any existing for this phone)
      await admin.from("password_reset_codes").upsert(
        { phone, otp: code, expires_at: expiresAt },
        { onConflict: "phone" }
      );

      // Send via WhatsApp Cloud API
      let sent = false;
      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
        const waResp = await fetch(
          `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WHATSAPP_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "template",
              template: {
                name: "otp_reset",
                language: { code: "en" },
                components: [{
                  type: "body",
                  parameters: [{ type: "text", text: code }],
                }],
              },
            }),
          }
        );
        if (waResp.ok) sent = true;
        else {
          const errText = await waResp.text();
          console.error("WhatsApp API error:", waResp.status, errText);
        }
      }

      // Fallback: log OTP to console for testing
      if (!sent) {
        console.log(`[DEV] OTP for ${phone}: ${code}`);
        // For dev environments without WhatsApp, return the code directly
        return new Response(JSON.stringify({ sent: false, dev_otp: code, message: "OTP generated (WhatsApp not configured — dev mode)" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ sent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Verify OTP ──
    if (action === "verify") {
      if (!otp || !newPassword) {
        return new Response(JSON.stringify({ error: "OTP and new password required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: record } = await admin
        .from("password_reset_codes")
        .select("otp, expires_at")
        .eq("phone", phone)
        .maybeSingle();

      if (!record) {
        return new Response(JSON.stringify({ error: "No OTP requested for this number. Request one first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (new Date(record.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "OTP expired. Request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (record.otp !== otp) {
        return new Response(JSON.stringify({ error: "Invalid OTP. Check and try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Find the user by phone
      const { data: users } = await admin.auth.admin.listUsers();
      const user = users.users.find((u: any) => u.phone === phone);
      if (!user) {
        return new Response(JSON.stringify({ error: "No account found with this phone number." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update password via admin API
      const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
      if (updateErr) throw updateErr;

      // Delete the OTP record
      await admin.from("password_reset_codes").delete().eq("phone", phone);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("whatsapp-reset error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
