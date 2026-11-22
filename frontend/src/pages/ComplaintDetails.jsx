import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  STATUSES,
  formatDateTime,
  getErrorMessage,
  shortId,
} from "../utils/format";
import StatusBadge from "../components/StatusBadge";
import StatusTracker from "../components/StatusTracker";
import Loader from "../components/Loader";
import GpsPhotoPicker from "../components/GpsPhotoPicker";
import GpsPhotoView from "../components/GpsPhotoView";
import WhatsAppButton from "../components/WhatsAppButton";

function ComplaintDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { isAdmin, isStaff, isOfficial } = useAuth();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  // Resolution form state (for Staff / Admin)
  const [outcome, setOutcome] = useState("Succeeded");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [reviewPhoto, setReviewPhoto] = useState(null);
  const [savingReview, setSavingReview] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);

  const [staffList, setStaffList] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState(
    location.state?.submitted ? "Complaint submitted to admin for staff assignment." : ""
  );

  useEffect(() => {
    let cancelled = false;
    setReviewPhoto(null);
    setCopied(false);
    if (!location.state?.submitted) setNotice("");

    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get(`/complaints/${id}`);
        if (!cancelled) {
          setComplaint(data);
          setOutcome(data.review?.outcome === "Failed" ? "Failed" : "Succeeded");
          setReviewNote(data.review?.note || "");
          setReviewReason(data.review?.reason || "");
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Unable to load this complaint."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, location.state?.submitted]);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get("/users/staff")
      .then(({ data }) => setStaffList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [isAdmin]);

  async function copyFullId() {
    if (!complaint?._id || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(complaint._id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  async function updateStatus(status) {
    setUpdating(true);
    setNotice("");
    setError("");
    try {
      const { data } = await api.put(`/complaints/${id}`, { status });
      setComplaint(data.complaint);
      setNotice("Status updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update status."));
    } finally {
      setUpdating(false);
    }
  }

  async function assignTo(staffId) {
    setAssigning(true);
    setNotice("");
    setError("");
    try {
      const { data } = await api.put(`/complaints/${id}/assign`, { staffId: staffId || null });
      setComplaint(data.complaint);
      setNotice(data.message);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to assign complaint."));
    } finally {
      setAssigning(false);
    }
  }

  async function saveResolution(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (outcome === "Succeeded" && !reviewNote.trim()) {
      setError("Enter the resolution answer to send to the user.");
      return;
    }

    if (outcome === "Failed" && !reviewReason.trim()) {
      setError("Provide an appropriate reason why the resolution failed.");
      return;
    }

    setSavingReview(true);

    try {
      const { data } = await api.put(`/complaints/${id}/review`, {
        outcome,
        note: reviewNote.trim(),
        reason: reviewReason.trim() || reviewNote.trim(),
        photo: reviewPhoto,
      });
      setComplaint(data.complaint);
      setReviewPhoto(null);
      setPhotoVersion((v) => v + 1);
      setNotice(data.message || "Resolution saved.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save resolution."));
    } finally {
      setSavingReview(false);
    }
  }

  const backPath = isAdmin ? "/admin" : isStaff ? "/staff" : "/my-complaints";

  if (loading) return <Loader text="Loading complaint..." />;

  if (error && !complaint) {
    return (
      <section className="narrow">
        <div className="alert alert-error">{error}</div>
        <Link to={backPath} className="btn btn-outline">
          Back
        </Link>
      </section>
    );
  }

  const hasResolution = Boolean(
    complaint.review?.note || complaint.review?.reason || complaint.hasReviewPhoto
  );
  const isFailedOutcome =
    complaint.status === "Failed" || complaint.review?.outcome === "Failed";

  return (
    <section className="narrow">
      <Link to={backPath} className="back-link">
        &larr; Back
      </Link>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card detail">
        <div className="detail-top">
          <span className="chip">{complaint.category}</span>
          <StatusBadge status={complaint.status} />
        </div>

        <h1>{complaint.title}</h1>

        <dl className="meta">
          <div>
            <dt>Complaint ID</dt>
            <dd className="id-row">
              <span>{shortId(complaint._id)}</span>
              <button
                type="button"
                className="copy-id-btn"
                onClick={copyFullId}
                title={`Full tracking ID: ${complaint._id}`}
              >
                {copied ? "Copied" : "Copy ID"}
              </button>
            </dd>
          </div>
          {complaint.location && (
            <div>
              <dt>Location</dt>
              <dd>{complaint.location}</dd>
            </div>
          )}
          <div>
            <dt>Submitted</dt>
            <dd>{formatDateTime(complaint.createdAt)}</dd>
          </div>
          <div>
            <dt>Assigned staff</dt>
            <dd>
              {complaint.assignedTo ? (
                <>
                  {complaint.assignedTo.name}
                  {complaint.assignedTo.phone && (
                    <span className="muted small block">{complaint.assignedTo.phone}</span>
                  )}
                </>
              ) : (
                <span className="muted">Pending admin assignment</span>
              )}
            </dd>
          </div>
          {isOfficial && complaint.user && (
            <div>
              <dt>Citizen details</dt>
              <dd>
                {complaint.user.name}
                <span className="muted small block">{complaint.user.email}</span>
                {complaint.user.phone && (
                  <span className="muted small block">{complaint.user.phone}</span>
                )}
              </dd>
            </div>
          )}
        </dl>

        <h3>Progress</h3>
        <StatusTracker status={complaint.status} reason={complaint.review?.reason} />

        <h3>Complaint details</h3>
        <p className="description">{complaint.description}</p>

        {complaint.hasPhoto && (
          <>
            <h3>Photo evidence</h3>
            <GpsPhotoView
              complaintId={complaint._id}
              kind="photo"
              caption="Submitted by citizen"
            />
          </>
        )}

        {hasResolution && (
          <>
            <h3>Resolution report</h3>
            <div
              className={`review-box ${
                isFailedOutcome ? "review-box-failed" : "review-box-succeeded"
              }`}
            >
              <div className="complaint-card-top">
                <span
                  className={`badge ${
                    isFailedOutcome ? "badge-failed" : "badge-resolved"
                  }`}
                >
                  {isFailedOutcome ? "Resolution Failed" : "Resolution Succeeded"}
                </span>
                <span className="muted small">
                  {formatDateTime(complaint.review?.reviewedAt)}
                </span>
              </div>

              {complaint.review?.note && (
                <div className="resolution-field">
                  <span className="muted small block">Answer to citizen</span>
                  <p className="description">{complaint.review.note}</p>
                </div>
              )}

              {complaint.review?.reason && (isOfficial || isFailedOutcome) && (
                <div className="resolution-field">
                  <span className="muted small block">
                    {isFailedOutcome ? "Failure reason (reported to admin)" : "Admin summary / reason"}
                  </span>
                  <p className="description">{complaint.review.reason}</p>
                </div>
              )}

              {complaint.hasReviewPhoto && (
                <GpsPhotoView
                  key={photoVersion}
                  complaintId={complaint._id}
                  kind="review"
                  caption="Site photo taken by staff"
                />
              )}

              <span className="muted small block">
                Handled by {complaint.review?.reviewerName || "staff"}
              </span>
            </div>
          </>
        )}

        <h3>Contact</h3>
        <div className="contact-row">
          <WhatsAppButton
            message={`Hello, I am contacting you about complaint ${shortId(complaint._id)} (${complaint.title}).`}
          >
            {isOfficial ? "Support line" : "WhatsApp support"}
          </WhatsAppButton>
          {isOfficial && complaint.user?.phone && (
            <WhatsAppButton
              number={complaint.user.phone}
              className="btn-outline-wa"
              message={`Hello ${complaint.user.name}, update on your complaint ${shortId(complaint._id)} (${complaint.title}): ${complaint.status}.`}
            >
              WhatsApp {complaint.user.name.split(" ")[0]}
            </WhatsAppButton>
          )}
        </div>

        {isAdmin && (
          <div className="admin-box">
            <label htmlFor="assignee">Assign to staff</label>
            <select
              id="assignee"
              value={complaint.assignedTo?._id || ""}
              disabled={assigning}
              onChange={(e) => assignTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {staffList.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} ({(member.categories || []).join(", ")})
                </option>
              ))}
            </select>
            {complaint.assignedTo?.phone && (
              <WhatsAppButton
                size="sm"
                number={complaint.assignedTo.phone}
                message={`Hello ${complaint.assignedTo.name}, please resolve complaint ${shortId(complaint._id)} (${complaint.title}) at ${complaint.location || "reported area"}.`}
              >
                WhatsApp staff
              </WhatsAppButton>
            )}
          </div>
        )}

        {isStaff && (
          <form className="admin-box review-form" onSubmit={saveResolution}>
            <h3>Resolve &amp; send response</h3>
            <p className="muted small">
              Mark whether resolution succeeded or failed, send the answer to the citizen, and
              log the reason for admin review.
            </p>

            <div className="field">
              <label>Resolution outcome</label>
              <div className="outcome-toggle" role="radiogroup" aria-label="Resolution outcome">
                <button
                  type="button"
                  role="radio"
                  aria-checked={outcome === "Succeeded"}
                  className={
                    outcome === "Succeeded"
                      ? "outcome-btn outcome-btn-success active"
                      : "outcome-btn"
                  }
                  onClick={() => setOutcome("Succeeded")}
                >
                  Succeeded (Resolved)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={outcome === "Failed"}
                  className={
                    outcome === "Failed"
                      ? "outcome-btn outcome-btn-danger active"
                      : "outcome-btn"
                  }
                  onClick={() => setOutcome("Failed")}
                >
                  Failed (Cannot Resolve)
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="review-note">
                Resolution answer for citizen {outcome === "Succeeded" ? "(required)" : "(optional)"}
              </label>
              <textarea
                id="review-note"
                rows={3}
                maxLength={2000}
                placeholder={
                  outcome === "Succeeded"
                    ? "Explain what was fixed so the citizen knows the issue is resolved"
                    : "Message to inform the citizen about the status"
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                required={outcome === "Succeeded"}
              />
            </div>

            <div className="field">
              <label htmlFor="review-reason">
                Reason for admin {outcome === "Failed" ? "(required)" : "(optional)"}
              </label>
              <textarea
                id="review-reason"
                rows={3}
                maxLength={2000}
                placeholder={
                  outcome === "Failed"
                    ? "Give the exact reason resolution failed (e.g. location inaccessible, out of jurisdiction, requires heavy equipment)"
                    : "Brief verification summary for the admin record"
                }
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                required={outcome === "Failed"}
              />
            </div>

            <GpsPhotoPicker
              label={
                complaint.hasReviewPhoto
                  ? "Replace site photo with GPS location"
                  : "Site verification photo with GPS location"
              }
              value={reviewPhoto}
              onChange={setReviewPhoto}
            />

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={savingReview}>
                {savingReview ? "Submitting..." : "Submit resolution"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default ComplaintDetails;
