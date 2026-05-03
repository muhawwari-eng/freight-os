import { supabase } from "./supabase";

export async function exportBackup() {
  const tables = [
    "shipments",
    "customers",
    "expenses",
    "payments",
    "tasks"
  ];

  let backup = {
    app: "Freight OS",
    version: "1.0",
    created_at: new Date().toISOString(),
    data: {}
  };

  for (let table of tables) {
    const { data, error } = await supabase.from(table).select("*");

    if (error) {
      console.error(`Error fetching ${table}:`, error);
      continue;
    }

    backup.data[table] = data;
  }

  // تحميل الملف
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `freight_backup_${Date.now()}.json`;
  a.click();
}