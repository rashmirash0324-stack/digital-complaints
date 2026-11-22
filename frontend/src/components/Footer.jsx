import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { WHATSAPP_DISPLAY, homePathForRole } from "../utils/format";
import Logo from "./Logo";
import WhatsAppButton from "./WhatsAppButton";

function Footer() {
  const { user, isAuthenticated, isOfficial, isAdmin } = useAuth();

  return (
    <footer className="footer">
      <div className="footer-grid footer-grid-4">
        <div className="footer-brand">
          <Link
            to={isAuthenticated ? homePathForRole(user?.role) : "/"}
            className="brand"
            aria-label="Digital Complaints Home"
          >
            <Logo full size={36} />
          </Link>
          <p>Civic complaint filing, admin assignment, and verified staff resolution.</p>
        </div>

        <div className="footer-col">
          <h4>Citizen Portal</h4>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            {isAuthenticated ? (
              <>
                <li>
                  <Link to={homePathForRole(user?.role)}>Dashboard</Link>
                </li>
                <li>
                  <Link to={isOfficial ? "/manage-complaints" : "/my-complaints"}>
                    Complaints
                  </Link>
                </li>
                {isAdmin && (
                  <li>
                    <Link to="/manage-users">Staff Management</Link>
                  </li>
                )}
                {!isOfficial && (
                  <li>
                    <Link to="/track-complaint">Track Status</Link>
                  </li>
                )}
              </>
            ) : (
              <>
                <li>
                  <Link to="/login">Citizen Login</Link>
                </li>
                <li>
                  <Link to="/register">Create Account</Link>
                </li>
                <li>
                  <Link to="/forgot-password">Email OTP Reset</Link>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="footer-col">
          <h4>Staff &amp; Admin</h4>
          <ul>
            <li>
              <Link to="/staff-login">Staff Login</Link>
            </li>
            <li>
              <Link to="/admin-login">Admin Login</Link>
            </li>
            <li>
              <Link to="/forgot-password">Reset Password (OTP)</Link>
            </li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Support</h4>
          <p className="footer-support-note">Need help with a complaint or account?</p>
          <p className="footer-phone">Helpline: {WHATSAPP_DISPLAY}</p>
          <WhatsAppButton size="sm" message="Hello, I need help with Digital Complaints.">
            WhatsApp Support
          </WhatsAppButton>
        </div>
      </div>

      <div className="footer-bottom">
        <span>&copy; {new Date().getFullYear()} Digital Complaint Management System</span>
        <span>Public Civic Services Portal</span>
      </div>
    </footer>
  );
}

export default Footer;
