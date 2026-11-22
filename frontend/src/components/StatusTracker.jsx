const STEPS = ["Submitted", "Assigned / In Progress", "Resolved"];

function StatusTracker({ status, reason }) {
  if (status === "Failed") {
    return (
      <div className="tracker-rejected">
        <strong>Resolution failed.</strong>{" "}
        {reason || "Assigned staff could not resolve this complaint."}
      </div>
    );
  }

  if (status === "Rejected") {
    return (
      <div className="tracker-rejected">
        <strong>Complaint rejected.</strong> This complaint was reviewed and could not be
        accepted.
      </div>
    );
  }

  const current = status === "Resolved" ? 2 : status === "In Progress" ? 1 : 0;

  return (
    <ol className="tracker">
      {STEPS.map((step, index) => {
        let state = "upcoming";
        if (index === 0 || index < current || status === "Resolved") state = "done";
        else if (index === current) state = "current";

        return (
          <li key={step} className={`tracker-step ${state}`}>
            <span className="tracker-dot">{state === "done" ? "✓" : index + 1}</span>
            <span className="tracker-label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default StatusTracker;
