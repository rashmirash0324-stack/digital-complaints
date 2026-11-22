import { useEffect, useState } from "react";
import api from "../services/api";
import { formatCoords, formatDateTime, mapsLink } from "../utils/format";

function GpsPhotoView({ complaintId, kind = "photo", caption }) {
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    setError(false);

    api
      .get(`/complaints/${complaintId}/photo/${kind}`)
      .then(({ data }) => {
        if (!cancelled) setPhoto(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [complaintId, kind]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (error) return <p className="muted small">Photo could not be loaded.</p>;
  if (!photo) return <p className="muted small">Loading photo...</p>;

  return (
    <figure className="gps-view">
      <button
        type="button"
        className="gps-view-img"
        onClick={() => setOpen(true)}
        aria-label="Enlarge photo"
      >
        <img src={photo.data} alt={caption || "Complaint photo"} />
      </button>

      <figcaption>
        {caption && <strong className="block">{caption}</strong>}
        <span className="gps-badge">GPS tagged</span>{" "}
        <a
          href={mapsLink(photo.latitude, photo.longitude)}
          target="_blank"
          rel="noreferrer"
          className="link-strong"
        >
          {formatCoords(photo.latitude, photo.longitude)} &middot; Open in Maps
        </a>
        <span className="muted small block">
          Taken {formatDateTime(photo.capturedAt)}
          {photo.accuracy != null ? ` · accurate to ~${Math.round(photo.accuracy)} m` : ""}
        </span>
      </figcaption>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <img src={photo.data} alt={caption || "Complaint photo"} />
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </figure>
  );
}

export default GpsPhotoView;
