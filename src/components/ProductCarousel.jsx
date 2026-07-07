import { useState } from "react";
import ProductCard from "./ProductCard.jsx";

export default function ProductCarousel({ products, category, cart, onToggle, recommendation, label }) {
  const [showOthers, setShowOthers] = useState(false);

  const best =
    products.find((p) => p.id === recommendation?.bestId) || products[0];
  const others = products.filter((p) => p.id !== best.id);

  return (
    <div className="turn-products">
      <span className="turn-products__label">
        {label || `Best ${category} pick for you`}
      </span>

      {recommendation?.reason && (
        <p className="rec-reason">{recommendation.reason}</p>
      )}

      <div className="pcard-row">
        <ProductCard
          product={best}
          selected={cart.has(best.id)}
          onToggle={() => onToggle(best)}
        />
        {showOthers &&
          others.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              selected={cart.has(p.id)}
              onToggle={() => onToggle(p)}
            />
          ))}
      </div>

      {others.length > 0 && (
        <button
          className="rec-more"
          onClick={() => setShowOthers((s) => !s)}
          aria-expanded={showOthers}
        >
          {showOthers
            ? "Hide other options"
            : `See ${others.length} other option${others.length === 1 ? "" : "s"}`}
          <span className={`rec-more__arrow ${showOthers ? "rec-more__arrow--open" : ""}`}>
            ›
          </span>
        </button>
      )}
    </div>
  );
}
