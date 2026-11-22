import { Link } from "react-router-dom";
import useComplaints from "../hooks/useComplaints";
import { useAuth } from "../context/AuthContext";
import { countByStatus, formatDate, shortId } from "../utils/format";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import WhatsAppButton from "../components/WhatsAppButton";

function StaffDashboard() {
  const { user } = useAuth();
  const { complaints, loading, error } = useComplaints();
  const counts = countByStatus(complaints);

  const activeWork = complaints.filter(
    (c) => c.status === "Pending" || c.status === "In Progress"
  );
  const completedWork = complaints.filter(
    (c) => c.status === "Resolved" || c.status === "Failed"
  );

  return (
    <section>
      <PageHeader
        title="Staff dashboard"
        subtitle={`Assigned complaints for ${user?.name || "staff"}${(user?.categories || []).length ? ` · ${user.categories.join(", ")}` : ""}`}
      >
        <Link to="/manage-complaints" className="btn btn-outline">
          Full list
        </Link>
      </PageHeader>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-4">
        <StatCard label="Assigned total" value={counts.total} />
        <StatCard label="In progress" value={counts["In Progress"] + counts.Pending} tone="info" />
        <StatCard label="Succeeded" value={counts.Resolved} tone="success" />
        <StatCard label="Failed" value={counts.Failed} tone="danger" />
      </div>

      {loading ? (
        <Loader text="Loading assigned complaints..." />
      ) : complaints.length === 0 ? (
        <EmptyState
          title="No complaints assigned yet"
          text="Complaints assigned to you by the admin will appear here with user details."
        />
      ) : (
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <h2>Pending resolution ({activeWork.length})</h2>
            </div>

            {activeWork.length === 0 ? (
              <p className="muted">All assigned complaints have been addressed.</p>
            ) : (
              <div className="stack">
                {activeWork.map((c) => (
                  <article className="staff-work-card" key={c._id}>
                    <div className="staff-work-main">
                      <div className="complaint-card-top">
                        <span className="chip">{c.category}</span>
                        <StatusBadge status={c.status} />
                      </div>
                      <h3>
                        <Link to={`/complaint/${c._id}`}>{c.title}</Link>
                      </h3>
                      {c.location && <p className="location-line">Area: {c.location}</p>}
                      <p className="clamp">{c.description}</p>

                      <div className="citizen-info-strip">
                        <div>
                          <span className="muted small">Citizen: </span>
                          <strong>{c.user?.name || "Unknown"}</strong>
                        </div>
                        {c.user?.phone && (
                          <div>
                            <span className="muted small">Phone: </span>
                            <strong>{c.user.phone}</strong>
                          </div>
                        )}
                        {c.user?.email && (
                          <div className="muted small">{c.user.email}</div>
                        )}
                        <div className="muted small">
                          {shortId(c._id)} &middot; {formatDate(c.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="staff-work-actions">
                      <Link to={`/complaint/${c._id}`} className="btn btn-primary btn-sm">
                        Resolve &amp; reply
                      </Link>
                      {c.user?.phone && (
                        <WhatsAppButton
                          size="sm"
                          number={c.user.phone}
                          message={`Hello ${c.user.name}, I am assigned to your complaint ${shortId(c._id)} (${c.title}).`}
                        >
                          WhatsApp user
                        </WhatsAppButton>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {completedWork.length > 0 && (
            <div className="card">
              <div className="card-head">
                <h2>Submitted resolutions ({completedWork.length})</h2>
              </div>
              <ul className="list">
                {completedWork.map((c) => (
                  <li key={c._id}>
                    <Link to={`/complaint/${c._id}`} className="list-row">
                      <div>
                        <strong>{c.title}</strong>
                        <span className="muted small">
                          Citizen: {c.user?.name || "Unknown"} &middot;{" "}
                          {c.review?.outcome === "Failed"
                            ? `Failed: ${c.review?.reason || "No reason"}`
                            : `Answer: ${c.review?.note || "Resolved"}`}
                        </span>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default StaffDashboard;
