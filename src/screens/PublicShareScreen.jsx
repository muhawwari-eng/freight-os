export function PublicShareScreen({ share }) {
  const showPaymentStatus = Boolean(share.paymentStatus);
  const showCustomerAmount = Number(share.customerAmount || 0) > 0;

  return (
    <div className="publicShareShell">
      <section className="publicShareHero">
        <div>
          <p>Freight OS Customer View</p>
          <h1>Shipment {share.id}</h1>
          <span className="badge">{share.status || "Status not set"}</span>
        </div>
        <div className="publicShareRoute">
          <small>Route</small>
          <b>{share.pol || "POL"} - {share.pod || "POD"}</b>
        </div>
      </section>

      <section className="publicShareGrid">
        <div className="panel">
          <h2>Shipment Overview</h2>
          <div className="detailGrid">
            <p><b>Customer:</b> {share.customer || "Not set"}</p>
            <p><b>Booking No:</b> {share.bookingNo || "Not set"}</p>
            <p><b>Cargo:</b> {share.cargoType || "Not set"}</p>
            <p><b>Load:</b> {share.loadDescription || "Not set"}</p>
            <p><b>Cut-Off:</b> {share.cutOff || "Not set"}</p>
            <p><b>ETD / ETA:</b> {share.etd || "Not set"} / {share.eta || "Not set"}</p>
            {showPaymentStatus && <p><b>Payment:</b> {share.paymentStatus}</p>}
            {showCustomerAmount && <p><b>Invoice Amount:</b> {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(share.customerAmount || 0))}</p>}
            <p><b>Updated:</b> {share.sharedAt ? new Date(share.sharedAt).toLocaleString() : "Not set"}</p>
          </div>
        </div>

        <div className="panel">
          <h2>Documents</h2>
          {share.documents?.length ? (
            <div className="stackList">
              {share.documents.map((document) => (
                <div className="miniCard" key={document.id || document.name}>
                  <b>{document.type || "Document"}</b>
                  <p>{document.name}</p>
                  <small>{document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : "Upload date not set"}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <b>No shared documents listed.</b>
              <p>The operations team will send files separately when needed.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
