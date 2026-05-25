import { createClient } from "@supabase/supabase-js";

const SHIPMENTS_TABLE = "freight_shipments_owned";

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function withWebhookSecret(url, secret) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(secret)}`;
}

function getProviderError(payload, status) {
  const providerError = payload?.error;
  const code = typeof providerError === "object" ? providerError.code : providerError;
  if (Number(code || 0) === 0 && status >= 200 && status < 300) return "";
  const message = typeof providerError === "object" ? providerError.text : payload?.message;
  return message || `findTEU tracking request failed (${code || status})`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const env = process.env;
    const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "FINDTEU_API_KEY", "FINDTEU_WEBHOOK_URL", "FINDTEU_WEBHOOK_SECRET"];
    const missing = required.filter((key) => !env[key]);
    if (missing.length) {
      return res.status(500).json({ ok: false, error: `Missing environment variables: ${missing.join(", ")}` });
    }

    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ ok: false, error: "Authentication required" });

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const shipmentId = String(req.body?.shipmentId || "").trim();
    const trackingNumber = String(req.body?.trackingNumber || "").trim().toUpperCase();
    const notifyCustomerEmail = req.body?.notifyCustomerEmail !== false;
    if (!shipmentId || !trackingNumber) {
      return res.status(400).json({ ok: false, error: "Shipment and container number are required." });
    }

    const { data: rows, error: shipmentError } = await supabase
      .from(SHIPMENTS_TABLE)
      .select("owner_id,item_id,data")
      .eq("owner_id", authData.user.id)
      .eq("item_id", shipmentId)
      .limit(1);
    if (shipmentError) throw shipmentError;
    const row = rows?.[0];
    if (!row) return res.status(404).json({ ok: false, error: "Shipment not found." });

    const webhookUrl = withWebhookSecret(env.FINDTEU_WEBHOOK_URL, env.FINDTEU_WEBHOOK_SECRET);
    const providerResponse = await fetch(`https://api.findteu.com/container/${encodeURIComponent(trackingNumber)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Authorization-ApiKey": env.FINDTEU_API_KEY,
      },
      body: new URLSearchParams({
        use_webhook: "true",
        webhook_url: webhookUrl,
      }),
    });
    const providerPayload = await providerResponse.json().catch(() => ({}));
    const providerError = getProviderError(providerPayload, providerResponse.status);
    if (providerError) return res.status(502).json({ ok: false, error: providerError });

    const tracking = {
      ...(row.data?.tracking || {}),
      provider: "findTEU",
      trackingNumber,
      notifyCustomerEmail,
      subscribed: true,
      subscribedAt: new Date().toISOString(),
      requestedBy: authData.user.email || authData.user.id,
      lastError: "",
    };
    const updatedShipment = { ...row.data, tracking };
    const { error: updateError } = await supabase
      .from(SHIPMENTS_TABLE)
      .update({ data: updatedShipment, updated_at: new Date().toISOString() })
      .eq("owner_id", row.owner_id)
      .eq("item_id", row.item_id);
    if (updateError) throw updateError;

    return res.status(200).json({ ok: true, tracking });
  } catch (error) {
    console.error("findteu-subscribe failed:", error);
    return res.status(500).json({ ok: false, error: error.message || "Unknown error" });
  }
}
