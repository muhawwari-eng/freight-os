import { createClient } from "@supabase/supabase-js";
import {
  calcOceanSell,
  getShipmentDocuments,
  getShipmentLoadDescription,
  getShipmentShareLinks,
  normalizeShipment,
} from "../src/utils/freight.js";

const SHIPMENTS_TABLE = "freight_shipments_owned";

function buildPublicSharePayload(shipment, options = {}, token = "", sharedAt = new Date().toISOString()) {
  const normalized = normalizeShipment(shipment);
  const shareOptions = {
    includePaymentStatus: true,
    includeDocuments: true,
    includeInvoiceAmount: false,
    ...options,
  };

  return {
    version: 2,
    token,
    permissions: shareOptions,
    id: normalized.id,
    customer: normalized.customer,
    pol: normalized.pol,
    pod: normalized.pod,
    bookingNo: normalized.bookingNo,
    cargoType: normalized.cargoType,
    loadDescription: getShipmentLoadDescription(normalized),
    status: normalized.status,
    paymentStatus: shareOptions.includePaymentStatus ? normalized.paymentStatus : "",
    customerAmount: shareOptions.includeInvoiceAmount ? calcOceanSell(normalized) : null,
    cutOff: normalized.cutOff,
    etd: normalized.etd,
    eta: normalized.eta,
    sharedAt,
    documents: shareOptions.includeDocuments
      ? getShipmentDocuments(normalized).map((document) => ({
        id: document.id,
        name: document.name,
        type: document.type,
        uploadedAt: document.uploadedAt,
        customerCanDownload: Boolean(document.customerCanDownload),
        downloadUrl: document.customerCanDownload ? (document.publicUrl || document.dataUrl || "") : "",
      }))
      : [],
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const env = process.env;
    const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !env[key]);
    if (missing.length) {
      return res.status(500).json({ ok: false, error: `Missing environment variables: ${missing.join(", ")}` });
    }

    const token = String(req.query?.token || "").trim();
    if (!token) return res.status(400).json({ ok: false, error: "Share token is required." });

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from(SHIPMENTS_TABLE)
      .select("item_id,data");
    if (error) throw error;

    for (const row of data || []) {
      const shipment = normalizeShipment({ ...row.data, id: row.data?.id || row.item_id });
      const link = getShipmentShareLinks(shipment).find((item) => item.token === token);
      if (!link) continue;

      if (link.disabled) {
        return res.status(410).json({ ok: false, error: "This share link is disabled." });
      }

      return res.status(200).json({
        ok: true,
        share: buildPublicSharePayload(shipment, link.permissions || {}, link.token, link.createdAt),
      });
    }

    return res.status(404).json({ ok: false, error: "Share link was not found." });
  } catch (error) {
    console.error("public-share failed:", error);
    return res.status(500).json({ ok: false, error: error.message || "Unknown error" });
  }
}
