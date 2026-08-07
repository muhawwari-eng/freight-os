import { FormField } from "../components/freightComponents";

export function SettingsScreen({ appSettings, updateSettings, createBackup, downloadLocalBackup, importLocalBackup }) {
  return (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>⚙️ Settings</h2>
                <p>Manage notification emails and automatic reminder behavior.</p>
              </div>
              <span className="badge">Admin only</span>
            </div>
            <div className="formGrid">
              <FormField label="Operation Email">
                <input
                  type="email"
                  value={appSettings.operationEmail}
                  onChange={(e) => updateSettings("operationEmail", e.target.value)}
                  placeholder="ops@fsclojistik.com"
                />
              </FormField>
              <FormField label="Company Email">
                <input
                  type="email"
                  value={appSettings.companyEmail}
                  onChange={(e) => updateSettings("companyEmail", e.target.value)}
                  placeholder="info@fsclojistik.com"
                />
              </FormField>
              <FormField label="Automatic Email Reminders">
                <select
                  value={appSettings.autoEmailReminders ? "on" : "off"}
                  onChange={(e) => updateSettings("autoEmailReminders", e.target.value === "on")}
                >
                  <option value="on">Enabled - check once daily when the app opens</option>
                  <option value="off">Disabled - use manual button only</option>
                </select>
              </FormField>
              <FormField label="Cut-Off Reminder Days Before">
                <input type="number" min="0" value={appSettings.cutOffReminderDays} onChange={(e) => updateSettings("cutOffReminderDays", Number(e.target.value || 0))} />
              </FormField>
              <FormField label="ETD Reminder Days Before">
                <input type="number" min="0" value={appSettings.etdReminderDays} onChange={(e) => updateSettings("etdReminderDays", Number(e.target.value || 0))} />
              </FormField>
              <FormField label="ETA Reminder Days Before">
                <input type="number" min="0" value={appSettings.etaReminderDays} onChange={(e) => updateSettings("etaReminderDays", Number(e.target.value || 0))} />
              </FormField>
              <FormField label="Invoice Due Reminder Days Before">
                <input type="number" min="0" value={appSettings.invoiceDueReminderDays} onChange={(e) => updateSettings("invoiceDueReminderDays", Number(e.target.value || 0))} />
              </FormField>
              <FormField label="Supabase Storage Bucket">
                <input value={appSettings.storageBucket} onChange={(e) => updateSettings("storageBucket", e.target.value)} placeholder="shipment-documents" />
              </FormField>
            </div>
            <div className="note mt">
              <h3>Reminder Rules</h3>
              <p>Automatic reminders are sent once per day when an admin or operation user opens the app. Each event uses the day offsets above, and shipment files use Supabase Storage when the bucket is available.</p>
            </div>
            <div className="note mt">
              <h3>Data & Backup</h3>
              <p>Use these tools before large imports, account moves, or finance audits.</p>
              <div className="reportUtilityBar mt">
                <button className="saveBtn" type="button" onClick={() => createBackup(true)}>Create Manual Backup</button>
                <button className="ghostBtn" type="button" onClick={downloadLocalBackup}>Download Local Backup</button>
                <label className="ghostBtn reportUpload">
                  Import Local Backup
                  <input type="file" accept="application/json,.json" onChange={importLocalBackup} />
                </label>
              </div>
            </div>
          </section>

  );
}
