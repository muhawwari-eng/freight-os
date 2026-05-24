import { FormField } from "../components/freightComponents";

export function SettingsScreen({ appSettings, updateSettings }) {
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
            </div>
            <div className="note mt">
              <h3>Reminder Rules</h3>
              <p>Automatic reminders are sent once per day when an admin or operation user opens the app. The system sends Cut-Off, Departure / ETD, and Arrival / ETA reminders due tomorrow to the operation email and to the customer email if saved in Customers.</p>
            </div>
          </section>

  );
}
