import { useEffect, useState } from "react";
import { CARDS } from "../data/cards.js";
import CardAuthorization from "./CardAuthorization.jsx";
import "./UserAccount.css";

export default function UserAccount({ selected, onToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    fetch("/api/payment-status")
      .then((r) => r.json())
      .then(setPayment)
      .catch(() => {});
  }, []);

  return (
    <div className="account">
      <button
        className="account__icon"
        aria-label="User menu"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill="currentColor" />
          <path
            d="M4 20c0-4 3.6-6 8-6s8 2 8 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>

      {menuOpen && (
        <>
          <div className="account__backdrop" onClick={() => setMenuOpen(false)} />
          <div className="account__menu">
            <button
              className="account__menu-item"
              onClick={() => {
                setMenuOpen(false);
                setModalOpen(true);
              }}
            >
              ur available cards
            </button>
            <button
              className="account__menu-item"
              onClick={() => {
                setMenuOpen(false);
                setAuthOpen(true);
              }}
            >
              {payment?.authorized
                ? `Card •••• ${payment.card?.last4 || ""} authorized`
                : "Authorize card for payments"}
            </button>
            <button className="account__menu-item account__menu-item--muted">
              Settings
            </button>
          </div>
        </>
      )}

      {authOpen && (
        <CardAuthorization
          onClose={() => setAuthOpen(false)}
          onAuthorized={(data) => {
            setPayment({ configured: true, authorized: true, card: data });
            setAuthOpen(false);
          }}
        />
      )}

      {modalOpen && (
        <div className="modal" onClick={() => setModalOpen(false)}>
          <div className="modal__card" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Select the cards you have</h2>
              <button className="modal__close" onClick={() => setModalOpen(false)}>
                ×
              </button>
            </div>
            <ul className="modal__list">
              {CARDS.map((card) => {
                const isSelected = selected.includes(card.id);
                return (
                  <li
                    key={card.id}
                    className={`card-row ${isSelected ? "card-row--on" : ""}`}
                    onClick={() => onToggle(card.id)}
                  >
                    <span className="card-row__check">{isSelected ? "✓" : ""}</span>
                    <span className="card-row__name">{card.name}</span>
                    <span className="card-row__issuer">{card.issuer}</span>
                  </li>
                );
              })}
            </ul>
            <button className="modal__done" onClick={() => setModalOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
