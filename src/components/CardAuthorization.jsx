import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import "./CardAuthorization.css";

const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

function SetupForm({ customerId, onAuthorized }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message);
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, paymentMethodId: setupIntent.payment_method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save card");
      onAuthorized(data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="auth-form">
      <PaymentElement />
      {error && <p className="auth-error">{error}</p>}
      <button className="modal__done" type="submit" disabled={!stripe || busy}>
        {busy ? "Authorizing…" : "Authorize card"}
      </button>
    </form>
  );
}

export default function CardAuthorization({ onClose, onAuthorized }) {
  const [clientSecret, setClientSecret] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/setup-intent", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start card setup");
        setClientSecret(data.clientSecret);
        setCustomerId(data.customerId);
      } catch (err) {
        setError(err.message);
      }
    })();
  }, []);

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Authorize a card for automated payments</h2>
          <button className="modal__close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="auth-note">
          This card is saved with Stripe for off-session payments so the agent can
          book your cart and pay each merchant exactly.
        </p>
        {!stripePromise && (
          <p className="auth-error">
            Add VITE_STRIPE_PUBLISHABLE_KEY to .env to enable card authorization.
          </p>
        )}
        {error && <p className="auth-error">{error}</p>}
        {stripePromise && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SetupForm customerId={customerId} onAuthorized={onAuthorized} />
          </Elements>
        )}
        {stripePromise && !clientSecret && !error && <p className="auth-note">Loading…</p>}
      </div>
    </div>
  );
}
