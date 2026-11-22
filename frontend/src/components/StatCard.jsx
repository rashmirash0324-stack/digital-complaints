const ICONS = {
  default: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z",
  warning: "M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  info: "M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  success: "M9 12l2 2 4-4m6 2a10 10 0 1 1-20 0 10 10 0 0 1 20 0z",
  danger: "M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
};

function StatCard({ label, value, tone = "default" }) {
  const path = ICONS[tone] || ICONS.default;

  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-bar" aria-hidden="true" />
        <span className="stat-icon" aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={path} />
          </svg>
        </span>
      </div>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default StatCard;
