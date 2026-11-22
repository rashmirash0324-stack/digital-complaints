import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { CATEGORIES, getErrorMessage } from "../utils/format";
import PageHeader from "../components/PageHeader";
import GpsPhotoPicker from "../components/GpsPhotoPicker";

const MAX_DESCRIPTION = 5000;

function SubmitComplaint() {
  const [form, setForm] = useState({
    title: "",
    category: "",
    location: "",
    description: "",
  });
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/complaints", { ...form, photo });
      const id = data.complaint?._id;
      navigate(id ? `/complaint/${id}` : "/my-complaints", {
        state: { submitted: true },
      });
    } catch (err) {
      setError(getErrorMessage(err, "Could not submit complaint."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="narrow">
      <PageHeader
        title="Submit a complaint"
        subtitle="Give us the details and we will look into it."
      />

      <div className="card">
        {error && (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              placeholder="Short summary of the problem"
              maxLength={150}
              value={form.title}
              onChange={update("title")}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={form.category}
              onChange={update("category")}
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="location">Area / Location</label>
            <input
              id="location"
              placeholder="e.g. MG Road, Indiranagar, near the bus stop"
              maxLength={200}
              value={form.location}
              onChange={update("location")}
              required
            />
            <span className="help">Mention the exact area so it can be found quickly.</span>
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={7}
              maxLength={MAX_DESCRIPTION}
              placeholder="What happened? Where? Since when?"
              value={form.description}
              onChange={update("description")}
              required
            />
            <span className="help right">
              {form.description.length}/{MAX_DESCRIPTION}
            </span>
          </div>

          <GpsPhotoPicker
            label="Photo of the problem"
            value={photo}
            onChange={setPhoto}
          />

          <div className="form-actions">
            <Link to="/my-complaints" className="btn btn-ghost">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default SubmitComplaint;
