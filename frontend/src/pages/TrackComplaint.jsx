import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { formatDateTime, getErrorMessage, shortId } from "../utils/format";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import StatusTracker from "../components/StatusTracker";

function TrackComplaint() {
  const [complaintId, setComplaintId] = useState("");
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setComplaint(null);

    const code = complaintId.trim().replace(/^#/, "");

    if (!/^[a-fA-F0-9]{6}$/.test(code) && !/^[a-fA-F0-9]{24}$/.test(code)) {
      setError("Enter the 6-character ID (e.g. #C8CB65) or the full 24-character complaint ID.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.get(`/complaints/${code}`);
      setComplaint(data);
    } catch (err) {
      setError(getErrorMessage(err, "Complaint not found."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="narrow">
      <PageHeader
        title="Track a complaint"
        subtitle="Enter your short ID (e.g. #C8CB65) or full complaint ID."
      />

      <div className="card">
        <form onSubmit={handleSubmit} className="inline-form">
          <input
            placeholder="e.g. #C8CB65 or full 24-character ID"
            value={complaintId}
            onChange={(e) => setComplaintId(e.target.value)}
            aria-label="Complaint ID"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Searching..." : "Track"}
          </button>
        </form>

        <p className="help">
          Works with the 6-character code shown on your complaint card (like #C8CB65) or the full ID.
        </p>

        {error && <div className="alert alert-error">{error}</div>}
      </div>

      {complaint && (
        <div className="card">
          <div className="detail-top">
            <span className="chip">{complaint.category}</span>
            <StatusBadge status={complaint.status} />
          </div>

          <h2>{complaint.title}</h2>
          {complaint.location && <p className="location-line">Area: {complaint.location}</p>}
          <p className="muted small">
            {shortId(complaint._id)} &middot; Submitted {formatDateTime(complaint.createdAt)}
            {complaint.assignedTo ? ` · Staff: ${complaint.assignedTo.name}` : ""}
          </p>

          <StatusTracker status={complaint.status} reason={complaint.review?.reason} />

          {complaint.review?.note && (
            <div className="review-box" style={{ marginBottom: 16 }}>
              <span className="muted small block">Staff resolution answer</span>
              <p className="description">{complaint.review.note}</p>
            </div>
          )}

          <Link to={`/complaint/${complaint._id}`} className="btn btn-outline">
            View full details
          </Link>
        </div>
      )}
    </section>
  );
}

export default TrackComplaint;
