import { useState } from "react";
import { FormField } from "../components/freightComponents";

function formatTrackingDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function pause(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export function ApiScreen({ shipments, canEditOperation, subscribeShipmentTracking, refreshTrackingUpdates }) {
  const [selectedShipmentId, setSelectedShipmentId] = useState("");
  const [trackingNumberDraft, setTrackingNumberDraft] = useState(null);
  const [notifyCustomerEmailDraft, setNotifyCustomerEmailDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingForFirstUpdate, setWaitingForFirstUpdate] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const shipmentId = selectedShipmentId || shipments[0]?.id || "";
  const shipment = shipments.find((item) => item.id === shipmentId);
  const tracking = shipment?.tracking || {};
  const trackingEvents = Array.isArray(tracking.events) ? tracking.events : [];
  const trackingNumber = trackingNumberDraft ?? tracking.trackingNumber ?? "";
  const notifyCustomerEmail = notifyCustomerEmailDraft ?? tracking.notifyCustomerEmail !== false;

  async function waitForFirstTrackingUpdate(shipmentId, previousUpdatedAt) {
    setWaitingForFirstUpdate(true);
    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await pause(15000);
        const refreshedShipments = await refreshTrackingUpdates();
        const refreshed = refreshedShipments.find((item) => item.id === shipmentId);
        if (refreshed?.tracking?.updatedAt && refreshed.tracking.updatedAt !== previousUpdatedAt) {
          setResultMessage("First carrier update received and loaded.");
          return;
        }
      }
      setResultMessage("Tracking is connected. No carrier update received yet; use Refresh Updates later.");
    } catch (error) {
      setErrorMessage(error.message || "Tracking is connected, but updates could not be refreshed.");
    } finally {
      setWaitingForFirstUpdate(false);
    }
  }

  async function startTracking(event) {
    event.preventDefault();
    if (!shipment || !trackingNumber.trim()) {
      setErrorMessage("Select a shipment and enter a container number.");
      return;
    }
    setSubmitting(true);
    setResultMessage("");
    setErrorMessage("");
    try {
      await subscribeShipmentTracking({
        shipmentId: shipment.id,
        trackingNumber: trackingNumber.trim().toUpperCase(),
        notifyCustomerEmail,
      });
      setResultMessage("Tracking connected. Waiting for the first carrier update (usually within 60 seconds)...");
      void waitForFirstTrackingUpdate(shipment.id, tracking.updatedAt || "");
    } catch (error) {
      setErrorMessage(error.message || "Could not start tracking.");
    } finally {
      setSubmitting(false);
    }
  }

  function selectShipment(event) {
    setSelectedShipmentId(event.target.value);
    setTrackingNumberDraft(null);
    setNotifyCustomerEmailDraft(null);
    setResultMessage("");
    setErrorMessage("");
  }

  async function refreshUpdates() {
    setRefreshing(true);
    setErrorMessage("");
    try {
      await refreshTrackingUpdates();
      setResultMessage("Latest online tracking updates loaded.");
    } catch (error) {
      setErrorMessage(error.message || "Could not load tracking updates.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="panel trackingCenter">
      <div className="panelHead">
        <div>
          <h2>API Center - Automatic Tracking</h2>
          <p className="smallText">Connect a shipment with findTEU to receive carrier milestones and customer email updates.</p>
        </div>
        <div className="actions">
          <button className="ghostBtn" type="button" onClick={refreshUpdates} disabled={refreshing}>{refreshing ? "Refreshing..." : "Refresh Updates"}</button>
          <span className={`trackingPill ${tracking.subscribed ? "connected" : ""}`}>{tracking.subscribed ? "Connected" : "Not connected"}</span>
        </div>
      </div>

      <div className="trackingGrid">
        <form className="trackingSetup" onSubmit={startTracking}>
          <h3>Shipment Tracking Setup</h3>
          <FormField label="Shipment">
            <select value={shipmentId} onChange={selectShipment}>
              {shipments.map((item) => (
                <option key={item.id} value={item.id}>{item.id} - {item.customer} - {item.bookingNo || "Not set"}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Container Number">
            <input value={trackingNumber} onChange={(event) => setTrackingNumberDraft(event.target.value)} placeholder="e.g. MSDU7696924" disabled={!canEditOperation} />
          </FormField>
          <label className="trackingToggle">
            <input type="checkbox" checked={notifyCustomerEmail} onChange={(event) => setNotifyCustomerEmailDraft(event.target.checked)} disabled={!canEditOperation} />
            <span>Send customer email when status or ETA changes</span>
          </label>
          {canEditOperation && (
            <button className="saveBtn" type="submit" disabled={submitting || waitingForFirstUpdate || !shipments.length}>
              {submitting ? "Connecting..." : waitingForFirstUpdate ? "Waiting for First Update..." : tracking.subscribed ? "Refresh Tracking Subscription" : "Start Automatic Tracking"}
            </button>
          )}
          {resultMessage && <p className="trackingSuccess">{resultMessage}</p>}
          {errorMessage && <p className="trackingError">{errorMessage}</p>}
        </form>

        <div className="trackingStatus">
          <h3>Tracking Status</h3>
          {!shipment && <p>No shipments available.</p>}
          {shipment && (
            <>
              <div className="detailGrid">
                <p><b>Shipment:</b> {shipment.id}</p>
                <p><b>Tracking No:</b> {tracking.trackingNumber || "Not connected"}</p>
                <p><b>Carrier / SCAC:</b> {tracking.scac || "Not set"}</p>
                <p><b>Latest Status:</b> {tracking.latestStatus || shipment.status || "Not set"}</p>
                <p><b>ETD:</b> {tracking.etd || shipment.etd || "Not set"}</p>
                <p><b>ETA:</b> {tracking.eta || shipment.eta || "Not set"}</p>
                <p><b>Vessel:</b> {tracking.vessel || shipment.vessel || "Not set"}</p>
                <p><b>Last Update:</b> {formatTrackingDate(tracking.updatedAt)}</p>
              </div>
              {tracking.lastError && <p className="trackingError">{tracking.lastError}</p>}
            </>
          )}
        </div>
      </div>

      <div className="trackingEvents">
        <h3>Tracking Milestones</h3>
        {trackingEvents.length === 0 && <p>No automatic tracking updates received yet.</p>}
        {trackingEvents.map((item, index) => (
          <div className="transportLine" key={`${item.eventDate || "event"}-${item.action || "update"}-${index}`}>
            <span>{item.eventDate || "No date"} - {item.action || "Update"} - {item.location || "No location"}</span>
            <b>{item.eventType || ""}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
