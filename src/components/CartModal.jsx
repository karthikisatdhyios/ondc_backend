import "./CartModal.css";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

const finalPrice = (p) =>
  p.discount?.applied && typeof p.discount.discountedPrice === "number"
    ? p.discount.discountedPrice
    : p.price;

export default function CartModal({ items, onClose }) {
  const total = items.reduce((sum, p) => sum + finalPrice(p), 0);

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Your cart</h2>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p className="cart-empty">Your cart is empty.</p>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((p) => (
                <li key={p.id} className="cart-item">
                  <img className="cart-item__img" src={p.image} alt={p.name} loading="lazy" />
                  <div className="cart-item__info">
                    <span className="cart-item__name">{p.name}</span>
                    <span className="cart-item__meta">
                      {p.provider}
                      {p.unit ? ` · ${p.unit}` : ""}
                    </span>
                  </div>
                  <span className="cart-item__price">{inr(finalPrice(p))}</span>
                </li>
              ))}
            </ul>

            <div className="cart-total">
              <span>Total</span>
              <span className="cart-total__amount">{inr(total)}</span>
            </div>

            <p className="cart-hint">
              Tell the agent “book my cart” to pay each merchant automatically.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
