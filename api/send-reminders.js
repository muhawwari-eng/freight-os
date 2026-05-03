import { createClient } from "@supabase/supabase-js";

const DEFAULT_OPERATION_EMAIL = "ops@fsclojistik.com";
const REMINDER_EMAIL_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

const ownedTables = {
  shipments: "freight_shipments_owned",
  customers: "freight_customers_owned",
};

function toDateKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const base = new Date(date);
  base.setDate(base.getDate() + days);
  return base;
}

function formatLongDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Not set";
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getReminderEventsForShipment(shipment) {
  return [
    { key: "cutOff", label: "Cut-Off Reminder", taskType: "Cut-Off", eventDate: shipment.cutOff, title: "Cut-Off reminder" },
    { key: "etd", label: "Departure Reminder", taskType: "ETD / Departure", eventDate: shipment.etd, title: "Departure / ETD reminder" },
    { key: "eta", label: "Arrival Reminder", taskType: "ETA / Arrival", eventDate: shipment.eta, title: "Arrival / ETA reminder" },
  ].filter((event) => event.eventDate);
}

function normalizeShipment(shipment) {
  return {
    ...shipment,
    id: shipment.id || shipment.item_id,
    bookingNo: shipment.bookingNo || "Not set",
    vessel: shipment.vessel || "Not set",
    cutOff: shipment.cutOff || "",
    etd: shipment.etd || "",
    eta: shipment.eta || "",
    emailReminderSent: shipment.emailReminderSent || {},
  };
}

function getCustomerEmailForShipment(shipment, customers) {
  if (shipment.customerEmail) return shipment.customerEmail;
  const match = customers.find((customer) =>
    String(customer.name || "").trim().toLowerCase() === String(shipment.customer || "").trim().toLowerCase()
  );
  return match?.email || "";
}

function buildReminderMessage({ shipment, event, recipientType, clientEmail }) {
  const booking = shipment.bookingNo || shipment.booking || shipment.id || "Not set";
  const customer = shipment.customer || "Customer";
  const route = `${shipment.pol || ""} → ${shipment.pod || ""}`;
  const vessel = shipment.vessel || "Not set";
  const eventDate = formatLongDate(event.eventDate);

  if (recipientType === "operation") {
    return `Operation reminder for ${event.label}.\n\nCustomer: ${customer}\nBooking: ${booking}\nRoute: ${route}\nVessel: ${vessel}\nDate: ${eventDate}${clientEmail ? `\nClient email: ${clientEmail}` : "\nClient email is missing in customer profile."}`;
  }

  return `Dear ${customer},\n\nThis is a friendly reminder regarding your shipment.\n\nBooking No: ${booking}\nRoute: ${route}\nVessel: ${vessel}\nReminder Type: ${event.label}\nDate: ${eventDate}\n\nPlease make sure all required actions are completed on time.\n\nBest regards,\nFSC Lojistik`;
}

async function sendEmailJsReminder(toEmail, params, env) {
  if (!toEmail) return { ok: false, error: "Missing recipient email" };

  const response = await fetch(REMINDER_EMAIL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        recipient_email: toEmail,
        ...params,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `EmailJS error ${response.status}`);
  }

  return { ok: true };
}

async function handleRequest(req, res) {
  const env = process.env;

  if (env.CRON_SECRET) {
    const authHeader = req.headers.authorization || "";
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  }

  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "EMAILJS_SERVICE_ID",
    "EMAILJS_TEMPLATE_ID",
    "EMAILJS_PUBLIC_KEY",
  ];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    return res.status(500).json({ ok: false, error: `Missing environment variables: ${missing.join(", ")}` });
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const tomorrow = toDateKey(addDays(new Date(), 1));
  const operationEmail = env.OPERATION_EMAIL || DEFAULT_OPERATION_EMAIL;

  const [shipmentsResult, customersResult] = await Promise.all([
    supabase.from(ownedTables.shipments).select("owner_id,item_id,data"),
    supabase.from(ownedTables.customers).select("owner_id,item_id,data"),
  ]);

  if (shipmentsResult.error) throw shipmentsResult.error;
  if (customersResult.error) throw customersResult.error;

  const customersByOwner = new Map();
  for (const row of customersResult.data || []) {
    const list = customersByOwner.get(row.owner_id) || [];
    list.push({ ...row.data, id: row.data?.id || row.item_id });
    customersByOwner.set(row.owner_id, list);
  }

  const results = [];
  let sentEmails = 0;
  let updatedShipments = 0;

  for (const row of shipmentsResult.data || []) {
    const shipment = normalizeShipment({ ...row.data, id: row.data?.id || row.item_id });
    const customers = customersByOwner.get(row.owner_id) || [];
    const clientEmail = getCustomerEmailForShipment(shipment, customers);
    const sentMap = shipment.emailReminderSent || {};
    const events = getReminderEventsForShipment(shipment)
      .filter((event) => toDateKey(event.eventDate) === tomorrow)
      .filter((event) => sentMap[event.key] !== toDateKey(event.eventDate));

    if (!events.length) continue;

    let changed = false;
    for (const event of events) {
      const booking = shipment.bookingNo || shipment.booking || shipment.id || "Not set";
      const route = `${shipment.pol || ""} → ${shipment.pod || ""}`;
      const eventDateKey = toDateKey(event.eventDate);
      const eventDateLong = formatLongDate(event.eventDate);

      const baseParams = {
        company_name: "FSC Lojistik",
        company_phone: "+905526302162",
        company_address: "Istanbul - Turkey",
        customer_name: shipment.customer || "Customer",
        booking_no: booking,
        shipment_id: shipment.id,
        route,
        vessel: shipment.vessel || "Not set",
        task_type: event.label,
        event_date: eventDateKey,
        date: eventDateLong,
        due_date: eventDateLong,
        task_date: eventDateLong,
        reminder_date: new Date().toISOString().slice(0, 10),
        subject: `${event.label} - ${booking}`,
      };

      const recipients = [{ type: "operation", email: operationEmail, name: "Operation Team" }];
      if (clientEmail) recipients.push({ type: "client", email: clientEmail, name: shipment.customer || "Customer" });

      let successCount = 0;
      const errors = [];

      for (const recipient of recipients) {
        try {
          await sendEmailJsReminder(recipient.email, {
            ...baseParams,
            recipient_type: recipient.type,
            recipient_name: recipient.name,
            message: buildReminderMessage({ shipment, event, recipientType: recipient.type, clientEmail }),
          }, env);
          successCount += 1;
          sentEmails += 1;
        } catch (error) {
          errors.push(`${recipient.type}: ${error.message}`);
        }
      }

      if (successCount > 0) {
        shipment.emailReminderSent = {
          ...(shipment.emailReminderSent || {}),
          [event.key]: eventDateKey,
        };
        changed = true;
      }

      results.push({
        owner_id: row.owner_id,
        shipment_id: shipment.id,
        booking_no: booking,
        reminder: event.label,
        event_date: eventDateKey,
        client_email: clientEmail || null,
        success_count: successCount,
        errors,
      });
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from(ownedTables.shipments)
        .update({ data: shipment, updated_at: new Date().toISOString() })
        .eq("owner_id", row.owner_id)
        .eq("item_id", row.item_id);

      if (updateError) throw updateError;
      updatedShipments += 1;
    }
  }

  return res.status(200).json({
    ok: true,
    checked_for: tomorrow,
    reminders: results.length,
    sent_emails: sentEmails,
    updated_shipments: updatedShipments,
    results,
  });
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    return await handleRequest(req, res);
  } catch (error) {
    console.error("send-reminders failed:", error);
    return res.status(500).json({ ok: false, error: error.message || "Unknown error" });
  }
}
