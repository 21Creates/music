import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { subscriptionId, userId } = await req.json();
    if (!subscriptionId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing subscriptionId or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sub, error: subErr } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, payment_ref, payment_amount, receipt_path, created_at")
      .eq("id", subscriptionId)
      .single();

    if (subErr || !sub) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (sub.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: settings } = await supabase
      .from("app_settings")
      .select("payment_webhook_url, premium_currency")
      .eq("id", 1)
      .single();

    const webhookUrl = settings?.payment_webhook_url;
    if (!webhookUrl) {
      await supabase
        .from("user_subscriptions")
        .update({ webhook_status: "failed" })
        .eq("id", subscriptionId);
      return new Response(
        JSON.stringify({ error: "No webhook URL configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(userId);

    let receiptUrl: string | null = null;
    if (sub.receipt_path) {
      const { data: signedData } = await supabase.storage
        .from("vinyl-receipts")
        .createSignedUrl(sub.receipt_path, 3600);
      receiptUrl = signedData?.signedUrl || null;
    }

    const payload = {
      type: "premium_subscription",
      customerName: profile?.display_name || "A listener",
      email: authUser?.user?.email || "",
      plan: "Premium",
      billingCycle: "yearly",
      amount: sub.payment_amount || 0,
      currency: settings?.premium_currency || "NGN",
      reference: sub.payment_ref,
      paymentImage: receiptUrl || "",
      paymentChannel: "bank_transfer",
      createdAt: new Date(sub.created_at).toISOString(),
      note: "",
    };

    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const signature = await hmacSha256(webhookSecret, `${timestamp}.${body}`);

    let webhookStatus = "sent";
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Vinyl-Signature": `sha256=${signature}`,
          "X-Vinyl-Timestamp": timestamp,
        },
        body,
      });
      if (!res.ok) webhookStatus = "failed";
    } catch {
      webhookStatus = "failed";
    }

    await supabase
      .from("user_subscriptions")
      .update({ webhook_status: webhookStatus })
      .eq("id", subscriptionId);

    return new Response(
      JSON.stringify({ ok: true, webhookStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
