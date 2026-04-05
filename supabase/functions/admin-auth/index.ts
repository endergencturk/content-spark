import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    // ⚠️ SECURITY NOTE: This is a lightweight client-side gate, NOT a secure auth system.
    // It protects against casual access only. For production security, implement proper
    // authentication with session tokens and server-side validation.
    const adminUser = Deno.env.get("ADMIN_USERNAME");
    const adminPw = Deno.env.get("ADMIN_PASSWORD");

    if (!adminUser || !adminPw) {
      return new Response(JSON.stringify({ error: "Admin authentication is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (username === adminUser && password === adminPw) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
