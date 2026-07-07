import ProductCarousel from "./ProductCarousel.jsx";
import "./RecipeResult.css";

export default function RecipeResult({ recipe, cart, onToggle }) {
  const { dish, sections = [], missing = [] } = recipe;

  return (
    <div className="recipe">
      <div className="recipe__head">
        <span className="recipe__title">Ingredients for {dish}</span>
        <span className="recipe__sub">
          {sections.length} item{sections.length === 1 ? "" : "s"} added to your cart
        </span>
      </div>

      {sections.map((s) => (
        <ProductCarousel
          key={s.category}
          label={`${s.ingredient} — best pick`}
          products={s.products}
          category={s.category}
          recommendation={s.recommendation}
          cart={cart}
          onToggle={onToggle}
        />
      ))}

      {missing.length > 0 && (
        <p className="recipe__missing">
          Not in our store yet: {missing.join(", ")}.
        </p>
      )}
    </div>
  );
}
