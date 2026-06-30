import { createClient } from "@supabase/supabase-js";

const PORTS_TABLE = "freight_ports_owned";

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function getPortCode(port, index) {
  return String(port?.code || port?.id || `PORT-${String(index + 1).padStart(3, "0")}`).trim().toUpperCase();
}

function getLocationType(port) {
  if (port?.locationType) return port.locationType;
  if (port?.type === "Airport") return "Airport";
  if (port?.type === "Destination") return "Destination";
  return "Seaport";
}

function normalizePort(port, index = 0) {
  const code = getPortCode(port, index);
  return {
    id: code,
    code,
    name: String(port?.name || "").trim(),
    country: String(port?.country || "").trim() || "Not set",
    locationType: getLocationType(port),
  };
}

function dedupePorts(rows = []) {
  const byCode = new Map();

  rows.forEach((row, index) => {
    const port = normalizePort(row, index);
    if (!port.code || !port.name) return;
    if (!byCode.has(port.code)) {
      byCode.set(port.code, port);
      return;
    }

    const existing = byCode.get(port.code);
    byCode.set(port.code, {
      ...existing,
      ...Object.fromEntries(Object.entries(port).filter(([, value]) => value !== "" && value !== "Not set")),
      id: existing.id || port.id,
      code: existing.code || port.code,
      name: existing.name || port.name,
      locationType: existing.locationType || port.locationType,
    });
  });

  return Array.from(byCode.values()).sort((a, b) => (
    String(a.locationType).localeCompare(String(b.locationType)) ||
    String(a.country).localeCompare(String(b.country)) ||
    String(a.name).localeCompare(String(b.name))
  ));
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
        .from(PORTS_TABLE)
        .select("item_id,data,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      const ports = dedupePorts((data || []).map((row) => ({
        ...row.data,
        id: row.data?.id || row.item_id,
        code: row.data?.code || row.item_id,
      })));

      return res.status(200).json({ ok: true, ports });
    }

    const ports = dedupePorts(Array.isArray(req.body?.ports) ? req.body.ports : []);
    const now = new Date().toISOString();
    const rows = ports.map((port, index) => {
      const code = getPortCode(port, index);
      return {
        owner_id: user.id,
        item_id: code,
        data: { ...port, id: code, code },
        updated_at: now,
      };
    });

    const { error: deleteError } = await supabase
      .from(PORTS_TABLE)
      .delete()
      .not("item_id", "is", null);
    if (deleteError) throw deleteError;

    if (rows.length) {
      const { error: upsertError } = await supabase
        .from(PORTS_TABLE)
        .upsert(rows, { onConflict: "owner_id,item_id" });
      if (upsertError) throw upsertError;
    }

    return res.status(200).json({ ok: true, ports });
  } catch (error) {
    console.error("shared-ports failed:", error);
    return res.status(error.status || 500).json({
      ok: false,
      error: error.message || "Unknown error",
    });
  }
}
