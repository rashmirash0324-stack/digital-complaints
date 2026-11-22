import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useComplaints from "../hooks/useComplaints";
import { countByStatus, formatDate, shortId } from "../utils/format";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import Loader from "../components/Loader";

function UserDashboard() {
  const { user } = useAuth();
  const { complaints, loading, error } = useComplaints();
  const counts = countByStatus(complaints);
  const recent = complaints.slice(0, 5);

  return (
    <section>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
        subtitle="File complaints and view resolution answers from staff."
      >
        <Link to="/submit-complaint" className="btn btn-primary">
          New complaint
        </Link>
      </PageHeader>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-5">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Pending" value={counts.Pending} tone="warning" />
        <StatCard label="In progress" value={counts["In Progress"]} tone="info" />
        <StatCard label="Resolved" value={counts.Resolved} tone="success" />
        <StatCard label="Failed" value={counts.Failed} tone="danger" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head">
            <h2>Recent complaints &amp; replies</h2>
            <Link to="/my-complaints" className="link-strong">
              View all
            </Link>
          </div>

          {loading ? (
            <Loader />
          ) : recent.length === 0 ? (
            <p className="muted">You have not submitted any complaints yet.</p>
          ) : (
            <ul className="list">
              {recent.map((complaint) => (
                <li key={complaint._id}>
                  <Link to={`/complaint/${complaint._id}`} className="list-row">
                    <div>
                      <strong>{complaint.title}</strong>
                      <span className="muted small">
                        {shortId(complaint._id)} &middot; {formatDate(complaint.createdAt)}
                        {complaint.assignedTo ? ` · Staff: ${complaint.assignedTo.name}` : " · Awaiting admin assignment"}
                      </span>
                      {complaint.review?.note && (
                        <span className="reply-preview">
                          Staff reply: {complaint.review.note}
                        </span>
                      )}
                    </div>
                    <StatusBadge status={complaint.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Quick actions</h2>
          <div className="action-list">
            <Link to="/submit-complaint" className="action-item">
              <strong>Submit complaint</strong>
              <span className="muted small">Send a new complaint to admin</span>
            </Link>
            <Link to="/track-complaint" className="action-item">
              <strong>Track complaint</strong>
              <span className="muted small">Check live status by ID</span>
            </Link>
            <Link to="/feedback" className="action-item">
              <strong>Give feedback</strong>
              <span className="muted small">Rate and share service feedback</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default UserDashboard;
