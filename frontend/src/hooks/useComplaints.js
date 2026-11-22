import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { getErrorMessage } from "../utils/format";

export default function useComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get("/complaints");
      setComplaints(Array.isArray(data) ? data : data.complaints || []);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load complaints."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { complaints, setComplaints, loading, error, reload };
}
