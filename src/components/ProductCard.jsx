import "./ProductCard.css";

const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

const fieldLabel = (f) =>
  f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ProductCard({ product, selected, onToggle }) {
  const { name, provider, price, image, unit, ratings, discount } = product;
  const ratingEntries = Object.entries(ratings || {});

  return (
    <div
      className={`pcard ${selected ? "pcard--selected" : ""}`}
      onClick={onToggle}
      role="button"
      aria-pressed={selected}
    >
      {selected && (
        <span className="pcard__tick" aria-hidden="true">
          ✓
        </span>
      )}
      <div className="pcard__media">
        <img src={image} alt={name} loading="lazy" />
      </div>

      <div className="pcard__body">
        <div className="pcard__head">
          <h4 className="pcard__name">{name}</h4>
          <span className="pcard__provider">
            {provider}
            {unit ? ` · ${unit}` : ""}
          </span>
        </div>

        {ratingEntries.length > 0 && (
          <ul className="pcard__ratings">
            {ratingEntries.map(([field, score]) => (
              <li key={field} className="pcard__rating">
                <span className="pcard__rating-label">{fieldLabel(field)}</span>
                <span className="pcard__rating-score">{score}/5</span>
              </li>
            ))}
          </ul>
        )}

        <div className="pcard__price">
          {discount?.applied ? (
            <>
              <span className="pcard__price-now">{inr(discount.discountedPrice)}</span>
              <span className="pcard__price-was">{inr(price)}</span>
              <span className="pcard__badge">
                {discount.discountPercent}% off with {discount.cardName}
                {discount.capped ? " (capped)" : ""}
              </span>
            </>
          ) : (
            <>
              <span className="pcard__price-now">{inr(price)}</span>
              <span className="pcard__badge pcard__badge--none">
                No discount for your cards
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
