import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import useComplaints from "../hooks/useComplaints";
import {
  STATUSES,
  countByStatus,
  formatDate,
  formatDateTime,
  getErrorMessage,
  shortId,
  statusKey,
} from "../utils/format";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import Loader from "../components/Loader";

function AdminDashboard() {
  const { complaints, setComplaints, loading, error } = useComplaints();
  const [staffList, setStaffList] = useState([]);
  const [assigningId, setAssigningId] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });

  useEffect(() => {
    api
      .get("/users/staff")
      .then(({ data }) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const counts = countByStatus(complaints);
  const unassigned = complaints.filter(
    (c) => !c.assignedTo && (c.status === "Pending" || c.status === "In Progress")
  );
  const resolutionReports = complaints.filter(
    (c) =>
      c.status === "Resolved" ||
      c.status === "Failed" ||
      c.review?.outcome === "Succeeded" ||
      c.review?.outcome === "Failed"
  );

  async function assignStaff(complaintId, staffId) {
    if (!staffId) return;
    setAssigningId(complaintId);
    setNotice({ type: "", text: "" });
    try {
      const { data } = await api.put(`/complaints/${complaintId}/assign`, { staffId });
      setComplaints((prev) =>
        prev.map((item) => (item._id === complaintId ? data.complaint : item))
      );
      setNotice({ type: "success", text: data.message });
    } catch (err) {
      setNotice({ type: "error", text: getErrorMessage(err, "Could not assign staff.") });
    } finally {
      setAssigningId("");
    }
  }

  return (
    <section>
      <PageHeader
        title="Admin dashboard"
        subtitle="Receive complaints, assign staff, and track resolution outcomes."
      >
        <Link to="/manage-complaints" className="btn btn-primary">
          All complaints
        </Link>
      </PageHeader>

      {error && <div className="alert alert-error">{error}</div>}
      {notice.text && (
        <div className={notice.type === "error" ? "alert alert-error" : "alert alert-success"}>
          {notice.text}
        </div>
      )}

      <div className="grid grid-5">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Needs staff" value={unassigned.length} tone="warning" />
        <StatCard label="In progress" value={counts["In Progress"]} tone="info" />
        <StatCard label="Succeeded" value={counts.Resolved} tone="success" />
        <StatCard label="Failed" value={counts.Failed} tone="danger" />
      </div>

      {/* Incoming queue waiting for Admin to assign Staff */}
      <div className="card section-gap">
        <div className="card-head">
          <h2>Incoming complaints to assign ({unassigned.length})</h2>
          <Link to="/manage-users" className="link-strong">
            Manage staff
          </Link>
        </div>

        {loading ? (
          <Loader />
        ) : unassigned.length === 0 ? (
          <p className="muted">All open complaints have been assigned to staff.</p>
        ) : (
          <div className="stack">
            {unassigned.map((c) => {
              const sortedStaff = [...staffList].sort((a, b) => {
                const aMatch = (a.categories || []).includes(c.category) ? 0 : 1;
                const bMatch = (b.categories || []).includes(c.category) ? 0 : 1;
                return aMatch - bMatch;
              });

              return (
                <div className="inline-assign-row" key={c._id}>
                  <div className="inline-assign-info">
                    <div className="complaint-card-top">
                      <span className="chip">{c.category}</span>
                      <span className="muted small">
                        {shortId(c._id)} &middot; {formatDate(c.createdAt)}
                      </span>
                    </div>
                    <strong>
                      <Link to={`/complaint/${c._id}`}>{c.title}</Link>
                    </strong>
                    <span className="muted small">
                      Citizen: {c.user?.name || "Unknown"}
                      {c.location ? ` · Area: ${c.location}` : ""}
                    </span>
                  </div>

                  <div className="inline-assign-control">
                    <select
                      aria-label={`Assign staff for ${c.title}`}
                      defaultValue=""
                      disabled={assigningId === c._id || staffList.length === 0}
                      onChange={(e) => assignStaff(c._id, e.target.value)}
                    >
                      <option value="" disabled>
                        {staffList.length === 0 ? "Add staff first" : "Assign staff..."}
                      </option>
                      {sortedStaff.map((member) => {
                        const match = (member.categories || []).includes(c.category);
                        return (
                          <option key={member._id} value={member._id}>
                            {member.name}
                            {match ? " (Matches category)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="two-col">
        {/* Resolution Outcomes Report: Succeeded vs Failed with Reason */}
        <div className="card">
          <div className="card-head">
            <h2>Resolution outcomes ({resolutionReports.length})</h2>
            <Link to="/manage-complaints" className="link-strong">
              View all
            </Link>
          </div>

          {loading ? (
            <Loader />
          ) : resolutionReports.length === 0 ? (
            <p className="muted">
              Staff resolution outcomes (Succeeded / Failed with reason) will appear here.
            </p>
          ) : (
            <div className="stack">
              {resolutionReports.slice(0, 8).map((c) => {
                const isFailed = c.status === "Failed" || c.review?.outcome === "Failed";
                return (
                  <Link
                    to={`/complaint/${c._id}`}
                    className={`outcome-card ${isFailed ? "outcome-failed" : "outcome-succeeded"}`}
                    key={c._id}
                  >
                    <div className="complaint-card-top">
                      <strong>{c.title}</strong>
                      <span className={`badge ${isFailed ? "badge-failed" : "badge-resolved"}`}>
                        {isFailed ? "Resolution Failed" : "Resolution Succeeded"}
                      </span>
                    </div>
                    <p className="small">
                      <strong>Reason:</strong>{" "}
                      {c.review?.reason || c.review?.note || "No reason provided."}
                    </p>
                    {c.review?.note && c.review?.note !== c.review?.reason && (
                      <p className="small muted">
                        <strong>Answer to user:</strong> {c.review.note}
                      </p>
                    )}
                    <span className="muted small">
                      Staff: {c.review?.reviewerName || c.assignedTo?.name || "Staff"} &middot;{" "}
                      Citizen: {c.user?.name || "Unknown"} &middot;{" "}
                      {formatDateTime(c.review?.reviewedAt || c.updatedAt)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Status breakdown</h2>

          <div className="bars">
            {STATUSES.map((status) => {
              const value = counts[status] || 0;
              const percent = counts.total ? Math.round((value / counts.total) * 100) : 0;

              return (
                <div className="bar-row" key={status}>
                  <div className="bar-label">
                    <span>{status}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill bar-${statusKey(status)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="action-list">
            <Link to="/manage-users" className="action-item">
              <strong>Users &amp; staff</strong>
              <span className="muted small">Create staff logins and assign categories</span>
            </Link>
            <Link to="/feedback" className="action-item">
              <strong>User feedback</strong>
              <span className="muted small">View ratings and citizen comments</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;
