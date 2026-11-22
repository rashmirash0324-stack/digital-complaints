import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, homePathForRole } from "../utils/format";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";

function OfficialLogin({ defaultRole = "staff" }) {
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setSelectedRole(defaultRole);
    setError("");
  }, [defaultRole]);

  if (isAuthenticated) {
    const fallback = homePathForRole(user?.role);
    return <Navigate to={location.state?.from?.pathname || fallback} replace />;
  }

  const isAdminTab = selectedRole === "admin";

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        identifier: form.identifier.trim(),
        password: form.password,
      });

      if (!data.token || !data.user) {
        setError("Login response is missing the token or user details.");
        return;
      }

      if (data.user.role !== selectedRole) {
        setError(
          isAdminTab
            ? "This account is not an Admin account. Switch to the Staff tab or Citizen login."
            : "This account is not a Staff account. Switch to the Admin tab or Citizen login."
        );
        return;
      }

      login(data.token, data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Check your User ID and password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={isAdminTab ? "Admin portal login" : "Staff portal login"}
      subtitle={
        isAdminTab
          ? "Sign in with your predefined Admin User ID."
          : "Sign in with your predefined Staff User ID."
      }
      footer={
        <>
          Are you a citizen? <Link to="/login">Citizen login</Link>
        </>
      }
    >
      <div className="role-tabs" role="tablist" aria-label="Official role">
        <button
          type="button"
          role="tab"
          aria-selected={!isAdminTab}
          className={!isAdminTab ? "role-tab role-tab-staff active" : "role-tab"}
          onClick={() => {
            setSelectedRole("staff");
            setError("");
          }}
        >
          Staff
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isAdminTab}
          className={isAdminTab ? "role-tab role-tab-admin active" : "role-tab"}
          onClick={() => {
            setSelectedRole("admin");
            setError("");
          }}
        >
          Admin
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label htmlFor="official-id">
            {isAdminTab ? "Admin User ID" : "Staff User ID"}
          </label>
          <input
            id="official-id"
            type="text"
            autoComplete="username"
            placeholder={isAdminTab ? "e.g. ADMIN01" : "e.g. STAFF01"}
            value={form.identifier}
            onChange={update("identifier")}
            required
          />
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="official-password">Password</label>
            <Link to="/forgot-password" className="small">
              Reset via Email OTP
            </Link>
          </div>
          <PasswordInput
            id="official-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={update("password")}
          />
        </div>

        <button
          type="submit"
          className={`btn btn-block ${isAdminTab ? "btn-primary" : "btn-staff"}`}
          disabled={loading}
        >
          {loading ? "Signing in..." : isAdminTab ? "Admin login" : "Staff login"}
        </button>
      </form>
    </AuthShell>
  );
}

export default OfficialLogin;
