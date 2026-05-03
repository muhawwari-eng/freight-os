import { createClient } from "@supabase/supabase-js";

const DEFAULT_OPERATION_EMAIL = "ops@fsclojistik.com";
const REMINDER_EMAIL_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

const ownedTables = {
  shipments: "freight_shipments_owned",
  customers: "freight_customers_owned",
};

async function sendWhatsApp(to, params, env) {
  if (!to || !env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) return false;

  const cleanTo = String(to).replace(/[^\d]/g, "");
  if (!cleanTo) return false;

  const url = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: cleanTo,
      type: "text",
      text: {
        body: `Reminder:
Customer: ${params.customer_name}
Booking: ${params.booking_no}
Route: ${params.route}
Vessel: ${params.vessel}
Date: ${params.date}`,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }

  return true;
}

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
    { key: "cutOff", label: "Cut-Off Reminder", eventDate: shipment.cutOff },
    { key: "etd", label: "Departure Reminder", eventDate: shipment.etd },
    { key: "eta", label: "Arrival Reminder", eventDate: shipment.eta },
  ].filter((event) => event.eventDate);
}

function normalizeShipment(shipment) {
  return {
    ...shipment,
    id: shipment.id || shipment.item_id,
    bookingNo: shipment.bookingNo || shipment.booking || "Not set",
    vessel: shipment.vessel || "Not set",
    emailReminderSent: shipment.emailReminderSent || {},
    whatsappReminderSent: shipment.whatsappReminderSent || {},
  };
}

function getCustomerEmailForShipment(shipment, customers) {
  if (shipment.customerEmail) return shipment.customerEmail;

  const match = customers.find(
    (customer) =>
      String(customer.name || "").trim().toLowerCase() ===
      String(shipment.customer || "").trim().toLowerCase()
  );

  return match?.email || "";
}

function getCustomerPhoneForShipment(shipment, customers) {
  if (shipment.customerPhone) return shipment.customerPhone;
  if (shipment.phone) return shipment.phone;
  if (shipment.whatsapp) return shipment.whatsapp;

  const match = customers.find(
    (customer) =>
      String(customer.name || "").trim().toLowerCase() ===
      String(shipment.customer || "").trim().toLowerCase()
  );

  return match?.phone || match?.whatsapp || "";
}

async function sendEmailJsReminder(toEmail, params, env) {
  if (!toEmail) return false;

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

  return true;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const env = process.env;

    const required = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "EMAILJS_SERVICE_ID",
      "EMAILJS_TEMPLATE_ID",
      "EMAILJS_PUBLIC_KEY",
    ];

    const missing = required.filter((key) => !env[key]);
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        error: `Missing environment variables: ${missing.join(", ")}`,
      });
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const tomorrow = toDateKey(addDays(new Date(), 1));
    const operationEmail = env.OPERATION_EMAIL || DEFAULT_OPERATION_EMAIL;
    const operationWhatsApp = env.OPERATION_WHATSAPP || "";

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

    let sentEmails = 0;
    let sentWhatsApp = 0;
    let updatedShipments = 0;
    const results = [];

    for (const row of shipmentsResult.data || []) {
      const shipment = normalizeShipment({
        ...row.data,
        id: row.data?.id || row.item_id,
      });

      const customers = customersByOwner.get(row.owner_id) || [];
      const clientEmail = getCustomerEmailForShipment(shipment, customers);
      const clientWhatsApp = getCustomerPhoneForShipment(shipment, customers);

      const events = getReminderEventsForShipment(shipment).filter(
        (event) => toDateKey(event.eventDate) === tomorrow
      );

      if (!events.length) continue;

      let changed = false;

      for (const event of events) {
        const eventDateKey = toDateKey(event.eventDate);
        const emailKey = `${event.key}_${eventDateKey}`;
        const whatsappKey = `${event.key}_${eventDateKey}`;

        const params = {
          company_name: "FSC Lojistik",
          customer_name: shipment.customer || "Customer",
          booking_no: shipment.bookingNo || shipment.booking || shipment.id || "Not set",
          shipment_id: shipment.id,
          route: `${shipment.pol || ""} → ${shipment.pod || ""}`,
          vessel: shipment.vessel || "Not set",
          task_type: event.label,
          event_date: eventDateKey,
          date: formatLongDate(event.eventDate),
          due_date: formatLongDate(event.eventDate),
          subject: `${event.label} - ${shipment.bookingNo || shipment.id}`,
        };

        const errors = [];
        let emailSentThisEvent = 0;
        let whatsappSentThisEvent = 0;

        if (!shipment.emailReminderSent[emailKey]) {
          const emailRecipients = [operationEmail];
          if (clientEmail) emailRecipients.push(clientEmail);

          for (const email of emailRecipients) {
            try {
              await sendEmailJsReminder(email, params, env);
              sentEmails++;
              emailSentThisEvent++;
            } catch (error) {
              errors.push(`email ${email}: ${error.message}`);
            }
          }

          if (emailSentThisEvent > 0) {
            shipment.emailReminderSent[emailKey] = new Date().toISOString();
            changed = true;
          }
        }

        if (!shipment.whatsappReminderSent[whatsappKey]) {
          const whatsappRecipients = [];
          if (operationWhatsApp) whatsappRecipients.push(operationWhatsApp);
          if (clientWhatsApp) whatsappRecipients.push(clientWhatsApp);

          for (const phone of whatsappRecipients) {
            try {
              const ok = await sendWhatsApp(phone, params, env);
              if (ok) {
                sentWhatsApp++;
                whatsappSentThisEvent++;
              }
            } catch (error) {
              errors.push(`whatsapp ${phone}: ${error.message}`);
            }
          }

          if (whatsappSentThisEvent > 0) {
            shipment.whatsappReminderSent[whatsappKey] = new Date().toISOString();
            changed = true;
          }
        }

        results.push({
          shipment_id: shipment.id,
          booking_no: params.booking_no,
          reminder: event.label,
          event_date: eventDateKey,
          email_sent: emailSentThisEvent,
          whatsapp_sent: whatsappSentThisEvent,
          errors,
        });
      }

      if (changed) {
        const { error: updateError } = await supabase
          .from(ownedTables.shipments)
          .update({
            data: shipment,
            updated_at: new Date().toISOString(),
          })
          .eq("owner_id", row.owner_id)
          .eq("item_id", row.item_id);

        if (updateError) throw updateError;
        updatedShipments++;
      }
    }

    return res.status(200).json({
      ok: true,
      checked_for: tomorrow,
      sent_emails: sentEmails,
      sent_whatsapp: sentWhatsApp,
      updated_shipments: updatedShipments,
      results,
    });
  } catch (error) {
    console.error("send-reminders failed:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Unknown error",
    });
  }
}