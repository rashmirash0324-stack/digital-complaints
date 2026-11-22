import { useRef, useState } from "react";
import {
  compressImage,
  formatCoords,
  getCurrentPosition,
  mapsLink,
} from "../utils/format";

function GpsPhotoPicker({ value, onChange, label = "Photo with GPS location", required = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setBusy(true);

    try {
      const [data, position] = await Promise.all([
        compressImage(file),
        getCurrentPosition(),
      ]);

      onChange({ data, ...position, capturedAt: new Date().toISOString() });
    } catch (err) {
      onChange(null);
      setError(err.message || "Could not add the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshLocation() {
    setError("");
    setBusy(true);
    try {
      const position = await getCurrentPosition();
      onChange({ ...value, ...position, capturedAt: new Date().toISOString() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="field">
      <label>
        {label}
        {required ? "" : " (optional)"}
      </label>

      {value ? (
        <div className="gps-photo">
          <img src={value.data} alt="Selected evidence" />
          <div className="gps-photo-info">
            <span className="gps-badge">GPS tagged</span>
            <a
              href={mapsLink(value.latitude, value.longitude)}
              target="_blank"
              rel="noreferrer"
              className="link-strong"
            >
              {formatCoords(value.latitude, value.longitude)}
            </a>
            {value.accuracy != null && (
              <span className="muted small">
                Accurate to ~{Math.round(value.accuracy)} m
              </span>
            )}
            <div className="gps-photo-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                Retake
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={refreshLocation}
              >
                {busy ? "Locating..." : "Refresh GPS"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => {
                  setError("");
                  onChange(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="gps-drop"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <span className="gps-drop-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
          <strong>{busy ? "Adding photo and location..." : "Upload or capture photo"}</strong>
          <span className="muted small">
            GPS coordinates attach automatically when location access is allowed.
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        hidden
      />

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export default GpsPhotoPicker;
