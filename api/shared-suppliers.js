import { createClient } from "@supabase/supabase-js";

const SUPPLIERS_TABLE = "freight_suppliers_owned";

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function getSupplierId(supplier, index) {
  return String(supplier?.id || `SUP-${String(index + 1).padStart(3, "0")}`);
}

function normalizeSupplier(supplier, index = 0) {
  return {
    id: getSupplierId(supplier, index),
    name: String(supplier?.name || "").trim(),
    type: supplier?.type || "Other",
    contact: supplier?.contact || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    country: supplier?.country || "",
    note: supplier?.note || "",
  };
}

function dedupeSuppliers(rows = []) {
  const byName = new Map();

  rows.forEach((row, index) => {
    const supplier = normalizeSupplier(row, index);
    if (!supplier.name) return;
    const key = supplier.name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, supplier);
      return;
    }

    const existing = byName.get(key);
    byName.set(key, {
      ...existing,
      ...Object.fromEntries(Object.entries(supplier).filter(([, value]) => value !== "")),
      id: existing.id || supplier.id,
      name: existing.name || supplier.name,
    });
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function getAuthedClient(req, env) {
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

  const token = getBearerToken(req);
  if (!token) {
    const error = new Error("Authentication required");
    error.status = 401;
    throw error;
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    const authError = new Error("Invalid session");
    authError.status = 401;
    throw authError;
  }

  return { supabase, user: data.user };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { supabase, user } = await getAuthedClient(req, process.env);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from(SUPPLIERS_TABLE)
        .select("item_id,data,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const suppliers = dedupeSuppliers((data || []).map((row) => ({
        ...row.data,
        id: row.data?.id || row.item_id,
      })));

      return res.status(200).json({ ok: true, suppliers });
    }

    const suppliers = dedupeSuppliers(Array.isArray(req.body?.suppliers) ? req.body.suppliers : []);
    const now = new Date().toISOString();
    const rows = suppliers.map((supplier, index) => ({
      owner_id: user.id,
      item_id: getSupplierId(supplier, index),
      data: supplier,
      updated_at: now,
    }));

    const { error: deleteError } = await supabase
      .from(SUPPLIERS_TABLE)
      .delete()
      .not("item_id", "is", null);
    if (deleteError) throw deleteError;

    if (rows.length) {
      const { error: upsertError } = await supabase
        .from(SUPPLIERS_TABLE)
        .upsert(rows, { onConflict: "owner_id,item_id" });
      if (upsertError) throw upsertError;
    }

    return res.status(200).json({ ok: true, suppliers });
  } catch (error) {
    console.error("shared-suppliers failed:", error);
    return res.status(error.status || 500).json({
      ok: false,
      error: error.message || "Unknown error",
    });
  }
}
