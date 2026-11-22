import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathForRole, initials } from "../utils/format";
import Logo from "./Logo";

function Navbar() {
  const { user, isAdmin, isStaff, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const roleClass = isAdmin ? "role-admin" : isStaff ? "role-staff" : "role-user";
  const linkClass = ({ isActive }) => (isActive ? `nav-link active ${roleClass}` : "nav-link");
  const isLoginPage = location.pathname === "/login";
  const isRegisterPage = location.pathname === "/register";

  return (
    <header className="navbar navbar-navy">
      <div className="navbar-inner">
        <Link
          to={user ? homePathForRole(user.role) : "/"}
          className="brand brand-pill"
          aria-label="Digital Complaints Home"
        >
          <Logo full size={32} />
        </Link>

        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={open ? "nav-links open" : "nav-links"}>
          {!user && (
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
          )}

          {user && !isAdmin && !isStaff && (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/submit-complaint" className={linkClass}>
                Submit
              </NavLink>
              <NavLink to="/my-complaints" className={linkClass}>
                Complaints
              </NavLink>
              <NavLink to="/track-complaint" className={linkClass}>
                Track
              </NavLink>
              <NavLink to="/feedback" className={linkClass}>
                Feedback
              </NavLink>
            </>
          )}

          {isStaff && (
            <>
              <NavLink to="/staff" className={linkClass}>
                Staff Dashboard
              </NavLink>
              <NavLink to="/manage-complaints" className={linkClass}>
                Assigned List
              </NavLink>
            </>
          )}

          {isAdmin && (
            <>
              <NavLink to="/admin" className={linkClass}>
                Admin Dashboard
              </NavLink>
              <NavLink to="/manage-complaints" className={linkClass}>
                Complaints
              </NavLink>
              <NavLink to="/manage-users" className={linkClass}>
                Users &amp; Staff
              </NavLink>
              <NavLink to="/feedback" className={linkClass}>
                Feedback
              </NavLink>
            </>
          )}

          <div className="nav-actions">
            {!user ? (
              isLoginPage ? (
                <Link to="/register" className="btn btn-nav-light btn-sm">
                  Sign up
                </Link>
              ) : isRegisterPage ? (
                <Link to="/login" className="btn btn-nav-outline btn-sm">
                  Login
                </Link>
              ) : (
                <Link to="/login" className="btn btn-nav-light btn-sm">
                  Login
                </Link>
              )
            ) : (
              <>
                <Link to="/profile" className="user-chip user-chip-navy" title="Your profile">
                  <span className={`avatar avatar-${user.role || "user"}`}>
                    {initials(user.name)}
                  </span>
                  <span className="user-chip-name">{user.name}</span>
                </Link>
                <button type="button" onClick={handleLogout} className="btn btn-nav-outline btn-sm">
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
