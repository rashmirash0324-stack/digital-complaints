import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import useComplaints from "../hooks/useComplaints";
import { useAuth } from "../context/AuthContext";
import {
  CATEGORIES,
  STATUSES,
  formatDate,
  getErrorMessage,
  shortId,
} from "../utils/format";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import WhatsAppButton from "../components/WhatsAppButton";

function ManageComplaints() {
  const { complaints, setComplaints, loading, error } = useComplaints();
  const { isAdmin, user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get("/users/staff")
      .then(({ data }) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isAdmin]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesStatus = filter === "All" || complaint.status === filter;
      const matchesCategory = categoryFilter === "All" || complaint.category === categoryFilter;
      const matchesSearch =
        !term ||
        complaint.title.toLowerCase().includes(term) ||
        complaint.category.toLowerCase().includes(term) ||
        (complaint.location || "").toLowerCase().includes(term) ||
        (complaint.user?.name || "").toLowerCase().includes(term) ||
        (complaint.user?.email || "").toLowerCase().includes(term) ||
        (complaint.assignedTo?.name || "").toLowerCase().includes(term);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [complaints, filter, categoryFilter, search]);

  async function assign(id, staffId) {
    setBusyId(id);
    setMessage({ type: "", text: "" });

    try {
      const { data } = await api.put(`/complaints/${id}/assign`, { staffId: staffId || null });
      setComplaints((current) =>
        current.map((item) => (item._id === id ? data.complaint : item))
      );
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err, "Unable to assign complaint.") });
    } finally {
      setBusyId("");
    }
  }

  async function updateStatus(id, status) {
    setBusyId(id);
    setMessage({ type: "", text: "" });

    try {
      const { data } = await api.put(`/complaints/${id}`, { status });
      setComplaints((current) =>
        current.map((item) => (item._id === id ? data.complaint : item))
      );
      setMessage({ type: "success", text: "Status updated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: getErrorMessage(err, "Unable to update complaint status."),
      });
    } finally {
      setBusyId("");
    }
  }

  async function removeComplaint(id) {
    if (!window.confirm("Delete this complaint permanently?")) return;

    setBusyId(id);
    setMessage({ type: "", text: "" });

    try {
      await api.delete(`/complaints/${id}`);
      setComplaints((current) => current.filter((item) => item._id !== id));
      setMessage({ type: "success", text: "Complaint deleted." });
    } catch (err) {
      setMessage({
        type: "error",
        text: getErrorMessage(err, "Unable to delete complaint."),
      });
    } finally {
      setBusyId("");
    }
  }

  return (
    <section>
      <PageHeader
        title={isAdmin ? "Manage complaints" : "My work"}
        subtitle={
          isAdmin
            ? `${complaints.length} complaint${complaints.length === 1 ? "" : "s"} in total`
            : `${complaints.length} complaint${complaints.length === 1 ? "" : "s"} for ${(user?.categories || []).join(", ") || "your categories"}`
        }
      />

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search by title, area, category or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search complaints"
        />

        <select
          className="category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="filters" role="group" aria-label="Filter by status">
          {["All", ...STATUSES].map((status) => (
            <button
              key={status}
              type="button"
              className={filter === status ? "filter active" : "filter"}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message.text && (
        <div className={message.type === "error" ? "alert alert-error" : "alert alert-success"}>
          {message.text}
        </div>
      )}

      {loading ? (
        <Loader text="Loading complaints..." />
      ) : visible.length === 0 && !error ? (
        <EmptyState
          title="No complaints found"
          text={isAdmin ? "Nothing matches the current search or filter." : "Nothing matches the filter, or no complaints are assigned to you yet."}
        />
      ) : (
        <div className="stack">
          {visible.map((complaint) => (
            <article className="card manage-card" key={complaint._id}>
              <div className="manage-main">
                <div className="complaint-card-top">
                  <span className="chip">{complaint.category}</span>
                  <StatusBadge status={complaint.status} />
                </div>

                <h3>
                  <Link to={`/complaint/${complaint._id}`}>{complaint.title}</Link>
                </h3>
                {complaint.location && (
                  <p className="location-line">Area: {complaint.location}</p>
                )}
                <p className="clamp">{complaint.description}</p>

                {(complaint.hasPhoto || complaint.hasReviewPhoto || complaint.review?.outcome) && (
                  <div className="tag-row">
                    {complaint.hasPhoto && <span className="gps-badge">GPS Photo</span>}
                    {complaint.hasReviewPhoto && (
                      <span className="gps-badge">Site Verified</span>
                    )}
                    {complaint.review?.outcome === "Succeeded" && (
                      <span className="badge badge-resolved">Succeeded</span>
                    )}
                    {complaint.review?.outcome === "Failed" && (
                      <span className="badge badge-failed">Failed</span>
                    )}
                  </div>
                )}

                {complaint.review?.reason && (
                  <p className="small muted">
                    <strong>Reason:</strong> {complaint.review.reason}
                  </p>
                )}

                <p className="assigned-line">
                  {complaint.assignedTo ? (
                    <>Assigned to <strong>{complaint.assignedTo.name}</strong></>
                  ) : (
                    <span className="muted">Unassigned</span>
                  )}
                </p>

                <span className="muted small">
                  {complaint.user?.name || "Unknown user"}
                  {complaint.user?.email ? ` (${complaint.user.email})` : ""}
                  {complaint.user?.phone ? ` · ${complaint.user.phone}` : ""} ·{" "}
                  {shortId(complaint._id)} · {formatDate(complaint.createdAt)}
                </span>
              </div>

              <div className="manage-actions">
                {isAdmin && (
                  <>
                    <label htmlFor={`assign-${complaint._id}`}>Assign staff</label>
                    <select
                      id={`assign-${complaint._id}`}
                      value={complaint.assignedTo?._id || ""}
                      disabled={busyId === complaint._id}
                      onChange={(e) => assign(complaint._id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {staffList.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name} ({(member.categories || []).join(", ")})
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {!isAdmin && (
                  <>
                    <label htmlFor={`status-${complaint._id}`}>Status</label>
                    <select
                      id={`status-${complaint._id}`}
                      value={complaint.status}
                      disabled={busyId === complaint._id}
                      onChange={(e) => updateStatus(complaint._id, e.target.value)}
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <Link to={`/complaint/${complaint._id}`} className="btn btn-outline btn-sm">
                  {isAdmin ? "View details" : "Resolve & reply"}
                </Link>

                {complaint.user?.phone && (
                  <WhatsAppButton
                    size="sm"
                    number={complaint.user.phone}
                    message={`Hello ${complaint.user.name}, this is an update on your complaint ${shortId(complaint._id)} (${complaint.title}). Current status: ${complaint.status}.`}
                  >
                    WhatsApp user
                  </WhatsAppButton>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busyId === complaint._id}
                    onClick={() => removeComplaint(complaint._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ManageComplaints;
