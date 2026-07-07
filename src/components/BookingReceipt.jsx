import "./BookingReceipt.css";

function money(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amount);
  } catch {
    return `${(currency || "").toUpperCase()} ${amount}`;
  }
}

export default function BookingReceipt({ booking }) {
  const { orderId, total, currency, merchants, networkOrders = [] } = booking;
  const allPaid = merchants.every((m) => m.status === "succeeded");
  const confirmedNetworkOrders = networkOrders.filter((n) => n.networkOrderId);

  return (
    <div className="receipt">
      <div className="receipt__head">
        <span className="receipt__title">
          {allPaid ? "Order booked" : "Order processed"}
        </span>
        <span className="receipt__total">{money(total, currency)}</span>
      </div>
      <div className="receipt__order">Order {orderId}</div>

      <ul className="receipt__merchants">
        {merchants.map((m) => (
          <li key={m.merchant} className="receipt__item">
            <div className="receipt__row">
              <span className="receipt__merchant">{m.merchant}</span>
              <span className="receipt__amount">{money(m.amount, currency)}</span>
              <span
                className={`receipt__status receipt__status--${
                  m.status === "succeeded" ? "ok" : m.status === "failed" ? "fail" : "pending"
                }`}
              >
                {m.status}
              </span>
            </div>
            {m.receiptUrl && (
              <a
                className="receipt__link"
                href={m.receiptUrl}
                target="_blank"
                rel="noreferrer"
              >
                View Stripe receipt ↗
              </a>
            )}
          </li>
        ))}
      </ul>

      {confirmedNetworkOrders.length > 0 && (
        <div className="receipt__network">
          <span className="receipt__network-label">ONDC network orders</span>
          <ul className="receipt__network-list">
            {confirmedNetworkOrders.map((n, i) => (
              <li key={`${n.provider}-${i}`}>
                {n.provider}: {n.networkOrderId}
                {n.state ? ` (${n.state})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="receipt__ap2">
        Placed over the ONDC network (Beckn confirm) and secured by AP2 — each
        merchant was charged its exact displayed amount off your authorized card,
        backed by signed Intent, Cart and Payment mandates.
      </p>
    </div>
  );
}
