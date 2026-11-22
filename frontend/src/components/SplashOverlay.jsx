import { useEffect, useState } from "react";

function SplashOverlay() {
  const [phase, setPhase] = useState("show"); // "show" | "fade" | "done"

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fade"), 2200);
    const doneTimer = setTimeout(() => setPhase("done"), 2650);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={phase === "fade" ? "splash-overlay splash-fade" : "splash-overlay"}
      role="status"
      aria-label="Loading Digital Complaints"
    >
      <div className="splash-stage">
        <div className="splash-logo-assembly">
          <img src="/splash_doc.png" alt="" className="splash-layer layer-doc" />
          <img src="/splash_megaphone.png" alt="" className="splash-layer layer-mega" />
          <img src="/splash_d_arc.png" alt="" className="splash-layer layer-darc" />
          <img src="/splash_pixels.png" alt="" className="splash-layer layer-pixels" />
          <img src="/splash_digital.png" alt="" className="splash-layer layer-digital" />
          <img src="/splash_complaints.png" alt="" className="splash-layer layer-complaints" />
          <img src="/splash_swoosh.png" alt="" className="splash-layer layer-swoosh" />
        </div>
        <p className="splash-tagline">Civic issue reporting &amp; tracking</p>
        <div className="splash-bar">
          <span className="splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}

export default SplashOverlay;
