import { FormField } from "../components/freightComponents";

export function ExchangeScreen({ activeFxRate, fxSettings, setFxSettings, updateAutoRate, fxLoading }) {
  return (
          <section className="panel">
            <div className="panelHead">
              <div>
                <h2>Exchange Rate Center</h2>
                <p>Manage TRY/USD rate used to convert local transport costs into USD profit calculations.</p>
              </div>
              <span className="badge">Active Rate: {activeFxRate} TRY/USD</span>
            </div>

            <div className="exchangeGrid">
              <div className="editBox">
                <h3>Manual Rate</h3>
                <FormField label="Manual TRY/USD Rate">
                  <input
                    type="number"
                    step="0.0001"
                    value={fxSettings.manualRate}
                    onChange={(e) => setFxSettings((prev) => ({ ...prev, manualRate: Number(e.target.value), mode: "manual", updatedAt: new Date().toLocaleString() }))}
                  />
                </FormField>
                <button className="saveBtn mt" onClick={() => setFxSettings((prev) => ({ ...prev, mode: "manual", updatedAt: new Date().toLocaleString() }))}>Use Manual Rate</button>
              </div>

              <div className="editBox">
                <h3>Automatic Rate</h3>
                <p>Current automatic rate: <b>{fxSettings.autoRate}</b></p>
                <p>Last update: {fxSettings.updatedAt}</p>
                <div className="actions mt">
                  <button className="saveBtn" onClick={updateAutoRate} disabled={fxLoading}>{fxLoading ? "Updating..." : "Update Automatically"}</button>
                  <button className="ghostBtn" onClick={() => setFxSettings((prev) => ({ ...prev, mode: "auto" }))}>Use Auto Rate</button>
                </div>
              </div>
            </div>

            <div className="note mt">
              <h3>Important FX Rule</h3>
              <p>The active exchange rate is used for new bookings only. Old shipments keep their own rate to protect historical profit accuracy.</p>
            </div>
          </section>

  );
}
