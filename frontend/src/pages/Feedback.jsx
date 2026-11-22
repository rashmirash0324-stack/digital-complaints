import { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, getErrorMessage, initials } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

function Stars({ value }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "star on" : "star"}>
          ★
        </span>
      ))}
    </span>
  );
}

function FeedbackForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!rating) {
      setError("Please choose a rating from 1 to 5 stars.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/feedback", { message, rating });
      setSuccess("Thank you! Your feedback has been submitted.");
      setMessage("");
      setRating(0);
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit feedback."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label id="rating-label">Your rating</label>
          <div className="star-input" role="radiogroup" aria-labelledby="rating-label">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className={n <= (hover || rating) ? "star-btn on" : "star-btn"}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="feedback">Your feedback</label>
          <textarea
            id="feedback"
            rows={5}
            maxLength={2000}
            placeholder="Tell us what worked and what could be better"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Sending..." : "Send feedback"}
        </button>
      </form>
    </div>
  );
}

function FeedbackList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get("/feedback")
      .then(({ data }) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "Unable to load feedback."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Loader text="Loading feedback..." />;

  if (error) return <div className="alert alert-error">{error}</div>;

  if (items.length === 0) {
    return <EmptyState title="No feedback yet" text="User feedback will appear here." />;
  }

  return (
    <div className="stack">
      {items.map((item) => (
        <article className="card" key={item._id}>
          <div className="card-head">
            <div className="user-cell">
              <span className="avatar">{initials(item.user?.name)}</span>
              <div>
                <strong>{item.user?.name || "Deleted user"}</strong>
                <span className="muted small block">{formatDate(item.createdAt)}</span>
              </div>
            </div>
            <Stars value={item.rating} />
          </div>
          <p className="description">{item.message}</p>
        </article>
      ))}
    </div>
  );
}

function Feedback() {
  const { isAdmin } = useAuth();

  return (
    <section className="narrow">
      <PageHeader
        title={isAdmin ? "User feedback" : "Share your feedback"}
        subtitle={
          isAdmin
            ? "Ratings and comments sent in by users."
            : "Help us improve the complaint system."
        }
      />
      {isAdmin ? <FeedbackList /> : <FeedbackForm />}
    </section>
  );
}

export default Feedback;
