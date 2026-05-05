import { createClient } from "@supabase/supabase-js";

const DEFAULT_OPERATION_EMAIL = "ops@fsclojistik.com";
const REMINDER_EMAIL_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";
const BREADCRUMBS_ENDPOINT = "https://gateway.bcrumbs.net/core/gq";
const SEND_NOTIFICATION_MUTATION = `
  mutation sendNotification($input: SendNotificationInput!) {
    sendNotification(input: $input) {
      messageId
      status
      externalMessageId
      createdAt
    }
  }
`;

const ownedTables = {
  shipments: "freight_shipments_owned",
  customers: "freight_customers_owned",
};

function isTruthyEnv(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function getWhatsAppConfigIssues(env) {
  const issues = [];
  if (!env.BC_API_KEY) issues.push("BC_API_KEY is missing");
  if (!env.BC_WORKSPACE_ID) issues.push("BC_WORKSPACE_ID is missing");
  if (!env.BC_INTEGRATION_ID) issues.push("BC_INTEGRATION_ID is missing");
  if (!(env.WHATSAPP_TEMPLATE_NAME || env.BC_TEMPLATE_NAME)) {
    issues.push("WHATSAPP_TEMPLATE_NAME (or BC_TEMPLATE_NAME) is missing");
  }
  const workspaceId = Number(env.BC_WORKSPACE_ID);
  if (env.BC_WORKSPACE_ID && !Number.isFinite(workspaceId)) {
    issues.push("BC_WORKSPACE_ID must be a number");
  }
  return issues;
}

async function sendWhatsApp(to, params, env) {
  if (
    !to ||
    !env.BC_API_KEY ||
    !env.BC_WORKSPACE_ID ||
    !env.BC_INTEGRATION_ID ||
    !(env.WHATSAPP_TEMPLATE_NAME || env.BC_TEMPLATE_NAME)
  ) {
    return false;
  }

  const cleanTo = String(to).replace(/[^\d]/g, "");
  if (!cleanTo) return false;
  const phone = cleanTo.startsWith("+") ? cleanTo : `+${cleanTo}`;
  const workspaceId = Number(env.BC_WORKSPACE_ID);
  if (!Number.isFinite(workspaceId)) return false;

  const response = await fetch(BREADCRUMBS_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: env.BC_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      operationName: "sendNotification",
      query: SEND_NOTIFICATION_MUTATION,
      variables: {
        input: {
          workspaceId,
          integrationId: env.BC_INTEGRATION_ID,
          phone,
          templateName: env.WHATSAPP_TEMPLATE_NAME || env.BC_TEMPLATE_NAME,
          templateLang:
            env.WHATSAPP_LANGUAGE_CODE || env.BC_TEMPLATE_LANG || "en",
          templateComponents: {
            name: params.customer_name || "",
            fullName: params.customer_name || "",
            phone,
            code: params.booking_no || "",
            city: params.route || "",
            country: "N/A",
            address: params.route || "",
            email: "",
            reminder: params.task_type || "",
            eventDate: params.date || "",
            vessel: params.vessel || "",
          },
          trunk: env.BC_TRUNK || undefined,
          senderId: env.BC_SENDER_ID || undefined,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.errors?.length) {
    const err =
      payload?.errors?.map((item) => item.message).join("; ") ||
      JSON.stringify(payload);
    throw new Error(err || `Bread Crumbs error ${response.status}`);
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
    const whatsappEnabledByFlag = isTruthyEnv(env.ENABLE_WHATSAPP);
    const whatsappConfigIssues = getWhatsAppConfigIssues(env);
    const whatsappEnabled = whatsappEnabledByFlag && !whatsappConfigIssues.length;

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

        if (whatsappEnabled && !shipment.whatsappReminderSent[whatsappKey]) {
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
      whatsapp_enabled: whatsappEnabled,
      whatsapp_enable_flag: env.ENABLE_WHATSAPP || "",
      whatsapp_disabled_reasons: whatsappEnabled
        ? []
        : whatsappEnabledByFlag
          ? whatsappConfigIssues
          : ["ENABLE_WHATSAPP is not set to a truthy value (true/1/yes/on)"],
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