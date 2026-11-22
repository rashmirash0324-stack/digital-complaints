import { statusKey } from "../utils/format";

function StatusBadge({ status }) {
  return <span className={`badge badge-${statusKey(status)}`}>{status}</span>;
}

export default StatusBadge;
