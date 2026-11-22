import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homePathForRole } from "../utils/format";

const FEATURES = [
  {
    title: "Citizen complaint filing",
    text: "Submit local issues with category, area, and GPS photo evidence.",
    icon: "M12 5v14M5 12h14",
  },
  {
    title: "Admin staff assignment",
    text: "Administrators review incoming complaints and assign field staff.",
    icon: "M3 12h4l3-8 4 16 3-8h4",
  },
  {
    title: "Verified staff resolution",
    text: "Staff resolve issues, reply to users, and report outcomes to admin.",
    icon: "M5 13l4 4L19 7",
  },
];

const STEPS = [
  { title: "User submits", text: "File a complaint with location details and photo." },
  { title: "Admin assigns", text: "Admin reviews and assigns the right field staff." },
  { title: "Staff resolves", text: "Staff sends the resolution answer and outcome report." },
];

function Home() {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = homePathForRole(user?.role);

  return (
    <div className="home">
      <section className="hero">
        <h1>Report civic issues. Track resolution.</h1>
        <p className="hero-text">
          Submit local service complaints online and follow verified staff updates in real time.
        </p>

        <div className="hero-buttons">
          <Link to={isAuthenticated ? dashboardPath : "/register"} className="btn btn-primary btn-lg">
            {isAuthenticated ? "Open dashboard" : "Get started"}
          </Link>
        </div>
      </section>

      <section className="grid grid-3">
        {FEATURES.map((feature) => (
          <div className="card feature-card" key={feature.title}>
            <div className="feature-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={feature.icon} />
              </svg>
            </div>
            <h3>{feature.title}</h3>
            <p className="muted">{feature.text}</p>
          </div>
        ))}
      </section>

      <section className="how">
        <h2>How it works</h2>
        <div className="grid grid-3">
          {STEPS.map((step, index) => (
            <div className="step" key={step.title}>
              <span className="step-number">{index + 1}</span>
              <h3>{step.title}</h3>
              <p className="muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
