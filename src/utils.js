export function currency(value) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function time(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function dayLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", { day: "2-digit", month: "short" }).format(new Date(value));
}

export function monthLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", { month: "long", year: "numeric" }).format(new Date(value));
}

export function dateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function durationFrom(startTime) {
  if (!startTime) return "00:00";
  const elapsed = Math.max(0, Date.now() - new Date(startTime).getTime());
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
