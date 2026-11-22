import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../utils/format";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = enter email/userId, 2 = verify OTP + new password
  const [identifier, setIdentifier] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  async function requestOtp(e) {
    if (e) e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password/send-otp", {
        identifier: identifier.trim(),
      });
      setMaskedEmail(data.maskedEmail || "");
      setDevOtp(data.devOtp || "");
      setNotice(data.message || "Verification OTP sent to your email.");
      setStep(2);
    } catch (err) {
      setError(getErrorMessage(err, "Could not send verification OTP."));
    } finally {
      setLoading(false);
    }
  }

  async function verifyAndReset(e) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit OTP sent to your email.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password/verify-reset", {
        identifier: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setDone(true);
      setDevOtp("");
      setNotice(data.message || "Password reset successful.");
      timerRef.current = setTimeout(() => navigate("/login", { replace: true }), 1800);
    } catch (err) {
      setError(getErrorMessage(err, "Could not verify OTP or reset password."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="Email OTP verification for Citizen, Staff, and Admin accounts."
      footer={
        <>
          Remembered it? <Link to="/login">Back to login</Link>
        </>
      }
    >
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {devOtp && step === 2 && !done && (
        <div className="alert alert-info" role="status">
          Dev Mode OTP (SMTP not configured): <strong>{devOtp}</strong>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={requestOtp} className="form">
          <div className="field">
            <label htmlFor="identifier">Email or User ID</label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com or ADMIN01 / STAFF01"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <span className="help">
              We will send a 6-digit OTP to the account&apos;s registered email.
            </span>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyAndReset} className="form">
          <div className="field">
            <div className="label-row">
              <label htmlFor="otp">6-digit Email OTP</label>
              <button
                type="button"
                className="link-btn small"
                disabled={loading || done}
                onClick={() => requestOtp()}
              >
                Resend OTP
              </button>
            </div>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
            {maskedEmail && (
              <span className="help">Sent to {maskedEmail} (valid for 10 minutes).</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              minLength={6}
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              minLength={6}
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || done}
          >
            {loading ? "Verifying..." : "Verify & Reset"}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-block"
            disabled={loading || done}
            onClick={() => {
              setStep(1);
              setOtp("");
              setDevOtp("");
              setError("");
              setNotice("");
            }}
          >
            Change email / User ID
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export default ForgotPassword;
