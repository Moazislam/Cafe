const labels = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
  CONFIRMED: "Confirmed",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }) {
  return <span className={`status-badge status-${String(status).toLowerCase()}`}>{labels[status] || status}</span>;
}
