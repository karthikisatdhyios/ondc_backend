import "./CartButton.css";

export default function CartButton({ count, onClick }) {
  return (
    <button
      type="button"
      className="cartbtn"
      aria-label={`Cart, ${count} items`}
      onClick={onClick}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.8L20 7H6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="20" r="1.4" fill="currentColor" />
        <circle cx="17.5" cy="20" r="1.4" fill="currentColor" />
      </svg>
      {count > 0 && <span className="cartbtn__count">{count}</span>}
    </button>
  );
}
