import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { CATEGORIES, formatDate, getErrorMessage, initials } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";
import PasswordInput from "../components/PasswordInput";

function CategoryChecks({ value, onChange, idPrefix }) {
  function toggle(category) {
    onChange(
      value.includes(category) ? value.filter((c) => c !== category) : [...value, category]
    );
  }

  return (
    <div className="check-grid" role="group" aria-label="Categories">
      {CATEGORIES.map((category) => (
        <label key={category} className="check-item" htmlFor={`${idPrefix}-${category}`}>
          <input
            id={`${idPrefix}-${category}`}
            type="checkbox"
            checked={value.includes(category)}
            onChange={() => toggle(category)}
          />
          {category}
        </label>
      ))}
    </div>
  );
}

const EMPTY_STAFF = { userId: "", name: "", email: "", phone: "", password: "", categories: [] };

function AddStaffForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY_STAFF);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (form.categories.length === 0) {
      setError("Choose at least one category for this staff member.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post("/users/staff", form);
      setForm(EMPTY_STAFF);
      onCreated(data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Could not create staff account."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card form staff-form" onSubmit={submit}>
      <h2>Add staff member</h2>
      <p className="muted small">
        Create a predefined Staff User ID and password. Staff sign in with their User ID and can
        reset their password via email OTP.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="staff-userid">Staff User ID (optional — auto-assigned)</label>
          <input
            id="staff-userid"
            placeholder="e.g. STAFF04"
            value={form.userId}
            onChange={(e) =>
              setForm({
                ...form,
                userId: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
              })
            }
          />
        </div>
        <div className="field">
          <label htmlFor="staff-name">Full name</label>
          <input id="staff-name" value={form.name} onChange={update("name")} required />
        </div>
        <div className="field">
          <label htmlFor="staff-email">Email (for OTP reset)</label>
          <input id="staff-email" type="email" value={form.email} onChange={update("email")} required />
        </div>
        <div className="field">
          <label htmlFor="staff-phone">Phone (10 digits)</label>
          <input
            id="staff-phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
            }
            required
          />
        </div>
        <div className="field">
          <label htmlFor="staff-password">Initial password</label>
          <PasswordInput
            id="staff-password"
            autoComplete="new-password"
            minLength={6}
            placeholder="At least 6 characters"
            value={form.password}
            onChange={update("password")}
          />
        </div>
      </div>

      <div className="field">
        <label>Handles these categories</label>
        <CategoryChecks
          idPrefix="new"
          value={form.categories}
          onChange={(categories) => setForm({ ...form, categories })}
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Creating..." : "Create staff"}
        </button>
      </div>
    </form>
  );
}

function RoleEditor({ user, onSaved, onCancel }) {
  const [categories, setCategories] = useState(user.categories || []);
  const [userId, setUserId] = useState(user.userId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(role) {
    setError("");

    if (role === "staff" && categories.length === 0) {
      setError("Choose at least one category.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put(`/users/${user._id}/role`, {
        role,
        categories,
        userId: userId.trim() || undefined,
      });
      onSaved(data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update this user."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="role-editor">
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor={`uid-${user._id}`} className="small">
          Staff User ID
        </label>
        <input
          id={`uid-${user._id}`}
          placeholder="Auto-assigned (e.g. STAFF04)"
          value={userId}
          onChange={(e) =>
            setUserId(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
          }
        />
      </div>
      <CategoryChecks idPrefix={`edit-${user._id}`} value={categories} onChange={setCategories} />
      <div className="role-editor-actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => save("staff")}>
          {user.role === "staff" ? "Save" : "Make staff"}
        </button>
        {user.role === "staff" && (
          <button type="button" className="btn btn-danger btn-sm" disabled={saving} onClick={() => save("user")}>
            Demote to user
          </button>
        )}
        <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const ROLE_LABEL = { admin: "Admin", staff: "Staff", user: "Citizen" };
const ROLE_CLASS = { admin: "badge badge-admin", staff: "badge badge-staff", user: "badge badge-user" };

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/users")
      .then(({ data }) => {
        if (!cancelled) setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Unable to load users."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const staffCount = users.filter((u) => u.role === "staff").length;

  const coverage = useMemo(
    () =>
      CATEGORIES.map((category) => ({
        category,
        staff: users.filter((u) => u.role === "staff" && (u.categories || []).includes(category)),
      })),
    [users]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesSearch =
        !term ||
        (user.userId || "").toLowerCase().includes(term) ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.phone || "").includes(term);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  function replaceUser(updated) {
    setUsers((current) => current.map((u) => (u._id === updated._id ? updated : u)));
    setEditingId("");
    setNotice(
      `${updated.name}${updated.userId ? ` (${updated.userId})` : ""} updated.`
    );
  }

  async function removeStaff(staff) {
    if (!window.confirm(`Remove staff account ${staff.userId || staff.name}? Open complaints will return to Admin's Pending queue.`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      const { data } = await api.delete(`/users/staff/${staff._id}`);
      setUsers((current) => current.filter((u) => u._id !== staff._id));
      setNotice(data.message || "Staff account removed.");
    } catch (err) {
      setError(getErrorMessage(err, "Could not remove staff account."));
    }
  }

  return (
    <section>
      <PageHeader
        title="Staff & user management"
        subtitle={`${users.length} account${users.length === 1 ? "" : "s"} · ${staffCount} staff`}
      >
        <button type="button" className="btn btn-primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Close" : "Add staff"}
        </button>
      </PageHeader>

      {showAdd && (
        <AddStaffForm
          onCreated={(user) => {
            setUsers((current) => [user, ...current]);
            setShowAdd(false);
            setNotice(
              `Staff ${user.userId} created for ${user.name} (${user.categories.join(", ")}).`
            );
          }}
        />
      )}

      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="card coverage-card">
        <h2>Category coverage</h2>
        <ul className="coverage-list">
          {coverage.map(({ category, staff }) => (
            <li key={category}>
              <strong>{category}</strong>
              {staff.length ? (
                <span>
                  {staff.map((s) => `${s.name}${s.userId ? ` (${s.userId})` : ""}`).join(", ")}
                </span>
              ) : (
                <span className="muted">No staff assigned yet.</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search by User ID, name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />

        <div className="filters" role="group" aria-label="Filter by role">
          {["All", "staff", "user", "admin"].map((role) => (
            <button
              key={role}
              type="button"
              className={roleFilter === role ? "filter active" : "filter"}
              onClick={() => setRoleFilter(role)}
            >
              {role === "All" ? "All" : ROLE_LABEL[role]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <Loader text="Loading users..." />
      ) : visible.length === 0 && !error ? (
        <EmptyState title="No users found" text="Nothing matches your search." />
      ) : (
        <div className="card table-card">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>User ID</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Categories</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-cell">
                        <span className={`avatar avatar-${user.role || "user"}`}>
                          {initials(user.name)}
                        </span>
                        <div>
                          <strong>{user.name}</strong>
                          <span className="muted small block">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {user.userId ? (
                        <span className="chip">{user.userId}</span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{user.phone || "—"}</td>
                    <td>
                      <span className={ROLE_CLASS[user.role] || ROLE_CLASS.user}>
                        {ROLE_LABEL[user.role] || "Citizen"}
                      </span>
                    </td>
                    <td>
                      {user.role === "staff" ? (user.categories || []).join(", ") || "—" : "—"}
                      {editingId === user._id && (
                        <RoleEditor
                          user={user}
                          onSaved={replaceUser}
                          onCancel={() => setEditingId("")}
                        />
                      )}
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      {user.role !== "admin" && editingId !== user._id && (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditingId(user._id)}
                          >
                            {user.role === "staff" ? "Edit" : "Make staff"}
                          </button>
                          {user.role === "staff" && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeStaff(user)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default ManageUsers;
