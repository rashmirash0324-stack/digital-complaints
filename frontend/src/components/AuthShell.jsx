function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo_full.png" alt="Digital Complaints" className="auth-full-logo" />
        </div>
        <h1>{title}</h1>
        <p className="muted auth-subtitle">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}

export default AuthShell;
