import { createClient } from "@supabase/supabase-js";

const DEFAULT_OPERATION_EMAIL = "ops@fsclojistik.com";
const REMINDER_EMAIL_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

const ownedTables = {
  shipments: "freight_shipments_owned",
  customers: "freight_customers_owned",
};

// ✅ WhatsApp function
async function sendWhatsApp(to, params, env) {
  if (!to) return;

  const url = `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: {
        body: `Reminder:\nCustomer: ${params.customer_name}\nBooking: ${params.booking_no}\nRoute: ${params.route}\nDate: ${params.date}`
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(err);
  }
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
    bookingNo: shipment.bookingNo || "Not set",
    vessel: shipment.vessel || "Not set",
    emailReminderSent: shipment.emailReminderSent || {},
  };
}

function getCustomerEmailForShipment(shipment, customers) {
  if (shipment.customerEmail) return shipment.customerEmail;
  const match = customers.find((customer) =>
    String(customer.name || "").toLowerCase() === String(shipment.customer || "").toLowerCase()
  );
  return match?.email || "";
}

async function sendEmailJsReminder(toEmail, params, env) {
  if (!toEmail) return;

  await fetch(REMINDER_EMAIL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: env.EMAILJS_SERVICE_ID,
      template_id: env.EMAILJS_TEMPLATE_ID,
      user_id: env.EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        ...params,
      },
    }),
  });
}

export default async function handler(req, res) {
  const env = process.env;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const tomorrow = toDateKey(addDays(new Date(), 1));
  const operationEmail = env.OPERATION_EMAIL || DEFAULT_OPERATION_EMAIL;

  const { data: shipments } = await supabase.from(ownedTables.shipments).select("*");
  const { data: customers } = await supabase.from(ownedTables.customers).select("*");

  let sentEmails = 0;
  let sentWhatsApp = 0;

  for (const row of shipments || []) {
    const shipment = normalizeShipment(row.data || row);

    const events = getReminderEventsForShipment(shipment)
      .filter((e) => toDateKey(e.eventDate) === tomorrow);

    for (const event of events) {
      const params = {
        customer_name: shipment.customer,
        booking_no: shipment.bookingNo,
        route: `${shipment.pol} → ${shipment.pod}`,
        vessel: shipment.vessel,
        date: formatLongDate(event.eventDate),
      };

      // ✅ Email
      await sendEmailJsReminder(operationEmail, params, env);
      sentEmails++;

      // ✅ WhatsApp
      try {
        await sendWhatsApp(env.OPERATION_WHATSAPP, params, env);
        sentWhatsApp++;
      } catch (e) {
        console.error(e.message);
      }
    }
  }

  return res.json({
    ok: true,
    sentEmails,
    sentWhatsApp,
  });
}