import { supabase } from "../supabase";

export const ownedTables = {
  shipments: "freight_shipments_owned",
  customers: "freight_customers_owned",
  suppliers: "freight_suppliers_owned",
  ports: "freight_ports_owned",
  backups: "freight_backups_owned",
};

export function getOwnedItemId(item, fallbackPrefix = "ITEM") {
  return String(item?.id || item?.code || `${fallbackPrefix}-${Date.now()}`);
}

export async function saveOwnedRows(tableName, ownerId, rows, fallbackPrefix) {
  const byId = new Map();

  rows.forEach((row, index) => {
    const baseId = getOwnedItemId(row, fallbackPrefix);
    let itemId = baseId;

    if (byId.has(itemId)) {
      itemId = `${baseId}-${index}-${Date.now()}`;
    }

    byId.set(itemId, {
      owner_id: ownerId,
      item_id: itemId,
      data: { ...row, id: row.id || itemId },
      updated_at: new Date().toISOString(),
    });
  });

  const cleanRows = Array.from(byId.values());

  // Replace current user rows safely.
  // Upsert prevents duplicate key errors when default rows already exist online.
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .eq("owner_id", ownerId);

  if (deleteError) throw deleteError;
  if (cleanRows.length === 0) return;

  const { error: upsertError } = await supabase
    .from(tableName)
    .upsert(cleanRows, { onConflict: "owner_id,item_id" });

  if (upsertError) throw upsertError;
}

export function readOwnedRows(result, normalizer = (x) => x) {
  if (result.error) throw result.error;
  return (result.data || []).map((row) => normalizer({ ...row.data, id: row.data?.id || row.item_id }));
}
