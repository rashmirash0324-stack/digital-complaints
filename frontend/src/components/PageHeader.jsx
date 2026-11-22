import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  user: "Citizen",
};

function PageHeader({ title, subtitle, children }) {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div className="page-header page-header-banner">
      <div className="page-header-copy">
        <div className="page-header-title-row">
          <h1>{title}</h1>
          {role && (
            <span className={`badge badge-${role} banner-role-badge`}>
              {ROLE_LABELS[role] || "Citizen"}
            </span>
          )}
        </div>
        {subtitle && <p className="page-header-sub">{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}

export default PageHeader;
