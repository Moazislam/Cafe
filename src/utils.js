const CAIRO_TIME_ZONE = "Africa/Cairo";

function cairoParts(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
}

function part(parts, type) {
  return parts.find((entry) => entry.type === type)?.value || "";
}

export function currency(value) {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function ceilToFive(value) {
  return Math.ceil(Number(value || 0) / 5) * 5;
}

export function businessDayKey(date = new Date()) {
  const cairoDate = new Date(date);
  cairoDate.setMinutes(cairoDate.getMinutes() - 5 * 60);
  const parts = cairoParts(cairoDate);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

export function cairoMonthKey(date = new Date()) {
  const parts = cairoParts(date);
  return `${part(parts, "year")}-${part(parts, "month")}-01`;
}

export function time(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", {
    timeZone: CAIRO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dateTimeLocal(value) {
  if (!value) return "";
  const parts = cairoParts(value);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}T${part(parts, "hour")}:${part(parts, "minute")}`;
}

export function dayLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", { timeZone: CAIRO_TIME_ZONE, day: "2-digit", month: "short" }).format(new Date(value));
}

export function monthLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", { timeZone: CAIRO_TIME_ZONE, month: "long", year: "numeric" }).format(new Date(value));
}

export function dateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", {
    timeZone: CAIRO_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function dateTimeSeconds(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-EG", {
    timeZone: CAIRO_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function cairoLocalToUtc(value) {
  if (!value) return "";
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = cairoParts(new Date(timestamp));
    const displayedTimestamp = Date.UTC(
      Number(part(parts, "year")),
      Number(part(parts, "month")) - 1,
      Number(part(parts, "day")),
      Number(part(parts, "hour")),
      Number(part(parts, "minute")),
    );
    timestamp += Date.UTC(year, month - 1, day, hour, minute) - displayedTimestamp;
  }

  return new Date(timestamp).toISOString();
}

export function durationFrom(startTime) {
  if (!startTime) return "00:00";
  const elapsed = Math.max(0, Date.now() - new Date(startTime).getTime());
  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
