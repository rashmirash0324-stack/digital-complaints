import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage, homePathForRole } from "../utils/format";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";

function Login() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const fallback = homePathForRole(user?.role);
    return <Navigate to={location.state?.from?.pathname || fallback} replace />;
  }

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

      login(data.token, data.user);
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Check your credentials."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Citizen login"
      subtitle="Sign in with your email to submit and track complaints."
      footer={
        <>
          New citizen? <Link to="/register">Create account</Link>
        </>
      }
    >
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label htmlFor="identifier">Email</label>
          <input
            id="identifier"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.identifier}
            onChange={update("identifier")}
            required
          />
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password" className="small">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={update("password")}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </AuthShell>
  );
}

export default Login;
