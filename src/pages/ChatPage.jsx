import { useEffect, useRef, useState } from "react";
import UserAccount from "../components/UserAccount.jsx";
import ProductCarousel from "../components/ProductCarousel.jsx";
import RecipeResult from "../components/RecipeResult.jsx";
import CartButton from "../components/CartButton.jsx";
import CartModal from "../components/CartModal.jsx";
import BookingReceipt from "../components/BookingReceipt.jsx";
import "./ChatPage.css";

const SUGGESTIONS = [
  "Show me laptops",
  "Budget smartphones",
  "Buy ingredients for paneer butter masala",
  "Tomato 1kg",
  "Book my cart",
];

export default function ChatPage() {
  const [selectedCards, setSelectedCards] = useState([]);
  const [cart, setCart] = useState(() => new Map());
  const [cartOpen, setCartOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  function toggleCard(id) {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleCart(product) {
    setCart((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, product);
      return next;
    });
  }

  function addToCart(product) {
    setCart((prev) => {
      if (prev.has(product.id)) return prev;
      const next = new Map(prev);
      next.set(product.id, product);
      return next;
    });
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, loading]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newTurns = [...turns, { role: "user", kind: "text", text }];
    setTurns(newTurns);
    setInput("");
    setLoading(true);

    const history = newTurns
      .filter((t) => t.kind === "text")
      .map((t) => ({ role: t.role, content: t.text }));

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          userCards: selectedCards,
          cart: Array.from(cart.values()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (data.type === "products") {
        setTurns((t) => [
          ...t,
          {
            role: "assistant",
            kind: "products",
            products: data.products,
            category: data.category,
            recommendation: data.recommendation,
          },
        ]);
        const best =
          data.products.find((p) => p.id === data.recommendation?.bestId) ||
          data.products[0];
        if (best) addToCart(best);
      } else if (data.type === "recipe") {
        setTurns((t) => [...t, { role: "assistant", kind: "recipe", recipe: data }]);
        for (const s of data.sections || []) {
          const best =
            s.products.find((p) => p.id === s.recommendation?.bestId) || s.products[0];
          if (best) addToCart(best);
        }
      } else if (data.type === "booking") {
        setTurns((t) => [...t, { role: "assistant", kind: "booking", booking: data }]);
        const allPaid =
          data.merchants?.length &&
          data.merchants.every((m) => m.status === "succeeded");
        if (allPaid) {
          setCart(new Map());
          setCartOpen(false);
        }
      } else {
        setTurns((t) => [...t, { role: "assistant", kind: "text", text: data.reply }]);
      }
    } catch (err) {
      setTurns((t) => [
        ...t,
        { role: "assistant", kind: "text", text: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat">
      <header className="chat__header">
        <span className="chat__brand">Dhiyos</span>
        <div className="chat__header-right">
          <CartButton count={cart.size} onClick={() => setCartOpen(true)} />
          <UserAccount selected={selectedCards} onToggle={toggleCard} />
        </div>
      </header>

      {cartOpen && (
        <CartModal items={Array.from(cart.values())} onClose={() => setCartOpen(false)} />
      )}

      <main className="chat__messages" ref={scrollRef}>
        {turns.length === 0 && (
          <div className="chat__suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="chat__suggestion"
                onClick={() => {
                  setInput(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) =>
          t.kind === "products" ? (
            <ProductCarousel
              key={i}
              products={t.products}
              category={t.category}
              recommendation={t.recommendation}
              cart={cart}
              onToggle={toggleCart}
            />
          ) : t.kind === "recipe" ? (
            <RecipeResult key={i} recipe={t.recipe} cart={cart} onToggle={toggleCart} />
          ) : t.kind === "booking" ? (
            <BookingReceipt key={i} booking={t.booking} />
          ) : (
            <div key={i} className={`bubble bubble--${t.role}`}>
              {t.text}
            </div>
          )
        )}

        {loading && <div className="bubble bubble--assistant bubble--typing">…</div>}
      </main>

      <form className="chat__bar" onSubmit={send}>
        <input
          className="chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask for a product, e.g. 'show me laptops'"
          autoFocus
        />
        <button className="chat__send" type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
