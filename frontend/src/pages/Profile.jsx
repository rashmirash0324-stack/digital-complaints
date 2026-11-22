import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { countByStatus, formatDate, initials } from "../utils/format";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(user);
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (profile?.role !== "user") return;
    let cancelled = false;

    api
      .get("/complaints")
      .then(({ data }) => {
        if (!cancelled) setComplaints(Array.isArray(data) ? data : data.complaints || []);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [profile?.role]);

  const counts = countByStatus(complaints);
  const role = profile?.role || "user";

  return (
    <section className="narrow">
      <PageHeader title="Your profile" subtitle="Account details and role summary." />

      <div className="card profile-card">
        <span className={`avatar avatar-lg avatar-${role}`}>{initials(profile?.name)}</span>
        <div>
          <h2>{profile?.name}</h2>
          {profile?.userId && (
            <p className="muted small">
              User ID: <strong>{profile.userId}</strong>
            </p>
          )}
          <p className="muted">{profile?.email}</p>
          <p className="muted">
            {profile?.phone ? `Phone: ${profile.phone}` : "No phone number saved"}
          </p>
          <span className={`badge badge-${role}`}>
            {role === "admin" ? "Administrator" : role === "staff" ? "Staff" : "Citizen"}
          </span>
          {role === "staff" && (
            <p className="muted small">
              Handles: {(profile.categories || []).join(", ") || "no categories yet"}
            </p>
          )}
        </div>
      </div>

      {profile?.createdAt && (
        <p className="muted small">Member since {formatDate(profile.createdAt)}</p>
      )}

      {role === "user" && (
        <div className="grid grid-4">
          <StatCard label="Total" value={counts.total} />
          <StatCard label="Pending" value={counts.Pending} tone="warning" />
          <StatCard label="In progress" value={counts["In Progress"]} tone="info" />
          <StatCard label="Resolved" value={counts.Resolved} tone="success" />
        </div>
      )}
    </section>
  );
}

export default Profile;
