import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useComplaints from "../hooks/useComplaints";
import { STATUSES } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ComplaintCard from "../components/ComplaintCard";
import Loader from "../components/Loader";
import EmptyState from "../components/EmptyState";

function MyComplaints() {
  const { complaints, loading, error } = useComplaints();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesStatus = filter === "All" || complaint.status === filter;
      const matchesSearch =
        !term ||
        complaint.title.toLowerCase().includes(term) ||
        complaint.category.toLowerCase().includes(term) ||
        (complaint.location || "").toLowerCase().includes(term) ||
        complaint.description.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [complaints, filter, search]);

  return (
    <section>
      <PageHeader title="My complaints" subtitle="Everything you have submitted so far.">
        <Link to="/submit-complaint" className="btn btn-primary">
          + New complaint
        </Link>
      </PageHeader>

      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search by title, area or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search complaints"
        />

        <div className="filters" role="group" aria-label="Filter by status">
          {["All", ...STATUSES].map((status) => (
            <button
              key={status}
              type="button"
              className={filter === status ? "filter active" : "filter"}
              onClick={() => setFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <Loader text="Loading your complaints..." />
      ) : visible.length === 0 && !error ? (
        <EmptyState
          title={complaints.length === 0 ? "No complaints yet" : "No matching complaints"}
          text={
            complaints.length === 0
              ? "When you submit a complaint it will show up here."
              : "Try a different search or filter."
          }
          action={
            complaints.length === 0 && (
              <Link to="/submit-complaint" className="btn btn-primary">
                Submit your first complaint
              </Link>
            )
          }
        />
      ) : (
        <div className="grid grid-3">
          {visible.map((complaint) => (
            <ComplaintCard key={complaint._id} complaint={complaint} />
          ))}
        </div>
      )}
    </section>
  );
}

export default MyComplaints;
