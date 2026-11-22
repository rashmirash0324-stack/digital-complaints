import { Link } from "react-router-dom";
import { formatDate, shortId } from "../utils/format";
import StatusBadge from "./StatusBadge";

function ComplaintCard({ complaint }) {
  return (
    <article className="complaint-card">
      <div className="complaint-card-top">
        <span className="chip">{complaint.category}</span>
        <StatusBadge status={complaint.status} />
      </div>

      <h3>{complaint.title}</h3>
      {complaint.location && <p className="location-line">{complaint.location}</p>}
      <p className="clamp">{complaint.description}</p>

      <div className="complaint-card-bottom">
        <span className="muted small">
          {shortId(complaint._id)} &middot; {formatDate(complaint.createdAt)}
        </span>
        <Link to={`/complaint/${complaint._id}`} className="link-strong">
          View details &rarr;
        </Link>
      </div>
    </article>
  );
}

export default ComplaintCard;
