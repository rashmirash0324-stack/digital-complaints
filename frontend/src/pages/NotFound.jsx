import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="not-found">
      <span className="not-found-code">404</span>
      <h1>Page not found</h1>
      <p className="muted">The page you are looking for does not exist or has moved.</p>

      <Link to="/" className="btn btn-primary">
        Back to home
      </Link>
    </div>
  );
}

export default NotFound;
