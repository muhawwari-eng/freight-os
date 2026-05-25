import { createClient } from "@supabase/supabase-js";

const SHIPMENTS_TABLE = "freight_shipments_owned";
const CUSTOMERS_TABLE = "freight_customers_owned";
const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

function toDateKey(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function getLatestEvent(events) {
  return [...(events || [])]
    .filter((event) => event.event_date)
    .sort((left, right) => String(right.event_date).localeCompare(String(left.event_date)))[0] || null;
}

function getLatestActualEvent(events) {
  return getLatestEvent((events || []).filter((event) => String(event.event_type || "").toLowerCase() === "actual"));
}

function getMappedStatus(payload, latestEvent, currentStatus) {
  if (payload.container?.completed) return "Completed";
  const action = String(latestEvent?.action?.action_name || "").toLowerCase();
  if (action.includes("loaded on") || action.includes("depart")) return "At Sea";
  if (action.includes("discharged") || action.includes("arrived")) return "Arrived";
  if (action.includes("gate in full")) return "Loading";
  return currentStatus || "Booked";
}

function getCustomerEmail(shipment, customers) {
  if (shipment.customerEmail) return shipment.customerEmail;
  const match = customers.find((customer) => (
    String(customer.name || "").trim().toLowerCase() === String(shipment.customer || "").trim().toLowerCase()
  ));
  return match?.email || "";
}

function compactEvents(events) {
  return (events || []).map((event) => ({
    eventDate: event.event_date || "",
    action: event.action?.action_name || "",
    location: event.location?.port || event.location?.terminal || "",
    eventType: event.event_type || "",
    vessel: event.mode?.vessel?.vessel_name || "",
  }));
}

function parseWebhookBody(body) {
  if (typeof body !== "string") return body || {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

async function sendTrackingEmail(toEmail, shipment, tracking, env) {
  if (!toEmail) return false;
  const response = await fetch(EMAILJS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        recipient_email: toEmail,
        company_name: "FSC Lojistik",
        customer_name: shipment.customer || "Customer",
        booking_no: shipment.bookingNo || shipment.id || "Not set",
        shipment_id: shipment.id,
        route: `${shipment.pol || ""} to ${shipment.pod || ""}`,
        vessel: tracking.vessel || shipment.vessel || "Not set",
        task_type: "Tracking Update",
        event_date: tracking.eta || tracking.updatedAt.slice(0, 10),
        date: tracking.eta || tracking.updatedAt.slice(0, 10),
        subject: `Tracking Update - ${shipment.bookingNo || shipment.id}`,
        message: `Shipment status: ${tracking.latestStatus}. ETA: ${tracking.eta || "Not set"}.`,
      },
    }),
  });
  if (!response.ok) throw new Error(await response.text() || `EmailJS error ${response.status}`);
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const env = process.env;
    if (!env.FINDTEU_WEBHOOK_SECRET || String(req.query.token || "") !== env.FINDTEU_WEBHOOK_SECRET) {
      return res.status(401).json({ ok: false, error: "Invalid webhook token" });
    }
    const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
    const missing = required.filter((key) => !env[key]);
    if (missing.length) {
      return res.status(500).json({ ok: false, error: `Missing environment variables: ${missing.join(", ")}` });
    }

    const body = parseWebhookBody(req.body);
    const payload = body.data || body;
    const trackingNumber = String(payload.container?.number || "").trim().toUpperCase();
    if (!trackingNumber) return res.status(400).json({ ok: false, error: "Container number is missing." });

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    const [shipmentsResult, customersResult] = await Promise.all([
      supabase.from(SHIPMENTS_TABLE).select("owner_id,item_id,data"),
      supabase.from(CUSTOMERS_TABLE).select("owner_id,item_id,data"),
    ]);
    if (shipmentsResult.error) throw shipmentsResult.error;
    if (customersResult.error) throw customersResult.error;

    const customersByOwner = new Map();
    for (const row of customersResult.data || []) {
      const list = customersByOwner.get(row.owner_id) || [];
      list.push({ ...row.data, id: row.data?.id || row.item_id });
      customersByOwner.set(row.owner_id, list);
    }

    const matchingRows = (shipmentsResult.data || []).filter((row) => (
      String(row.data?.tracking?.trackingNumber || "").trim().toUpperCase() === trackingNumber
    ));
    const latestEvent = getLatestActualEvent(payload.events);
    let updated = 0;
    let sentEmails = 0;

    for (const row of matchingRows) {
      const shipment = { ...row.data, id: row.data?.id || row.item_id };
      const oldTracking = shipment.tracking || {};
      const eta = toDateKey(payload.pod?.eta_date || shipment.eta);
      const etd = toDateKey(payload.pol?.etd_date || shipment.etd);
      const latestStatus = getMappedStatus(payload, latestEvent, shipment.status);
      const vessel = latestEvent?.mode?.vessel?.vessel_name || shipment.vessel || "";
      const updatedAt = new Date().toISOString();
      const notificationKey = `${latestStatus}|${eta}|${latestEvent?.event_date || ""}`;
      const changed = oldTracking.latestStatus !== latestStatus || oldTracking.eta !== eta || oldTracking.etd !== etd;
      const tracking = {
        ...oldTracking,
        provider: "findTEU",
        trackingNumber,
        subscribed: !payload.container?.completed,
        completed: Boolean(payload.container?.completed),
        scac: payload.scac || oldTracking.scac || "",
        latestStatus,
        etd,
        eta,
        vessel,
        events: compactEvents(payload.events),
        updatedAt,
        lastError: Number(payload.error || 0) === 0 ? "" : (body.error?.text || payload.message || `findTEU error ${payload.error}`),
        emailNotifications: oldTracking.emailNotifications || {},
      };

      if (
        changed &&
        tracking.notifyCustomerEmail !== false &&
        !tracking.emailNotifications[notificationKey] &&
        env.EMAILJS_SERVICE_ID &&
        env.EMAILJS_TEMPLATE_ID &&
        env.EMAILJS_PUBLIC_KEY
      ) {
        const customerEmail = getCustomerEmail(shipment, customersByOwner.get(row.owner_id) || []);
        if (customerEmail) {
          try {
            await sendTrackingEmail(customerEmail, shipment, tracking, env);
            tracking.emailNotifications[notificationKey] = updatedAt;
            sentEmails += 1;
          } catch (error) {
            tracking.lastEmailError = error.message;
          }
        }
      }

      const nextShipment = {
        ...shipment,
        eta: eta || shipment.eta,
        etd: etd || shipment.etd,
        vessel: vessel || shipment.vessel,
        status: latestStatus,
        tracking,
      };
      const { error: updateError } = await supabase
        .from(SHIPMENTS_TABLE)
        .update({ data: nextShipment, updated_at: updatedAt })
        .eq("owner_id", row.owner_id)
        .eq("item_id", row.item_id);
      if (updateError) throw updateError;
      updated += 1;
    }

    return res.status(200).json({ ok: true, matched_shipments: matchingRows.length, updated_shipments: updated, sent_emails: sentEmails });
  } catch (error) {
    console.error("findteu-webhook failed:", error);
    return res.status(500).json({ ok: false, error: error.message || "Unknown error" });
  }
}
