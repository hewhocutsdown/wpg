// Availability/recurrence logic. Pure functions, no DOM access.

const DOW_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, n) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + n);
  return d;
}

function monthDayString(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/** nth (1-based) occurrence of `dayAbbr` in the given year/month (0-based month). */
function nthWeekdayOfMonth(year, month, nth, dayAbbr) {
  const targetDow = DOW_ABBR.indexOf(dayAbbr);
  const first = new Date(year, month, 1);
  const offset = (targetDow - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  const result = new Date(year, month, day);
  return result.getMonth() === month ? result : null; // nth doesn't exist this month
}

/** Does `entry` occur/apply on the given calendar day? Single source of truth
 *  for all four availability kinds, used by both the "today" filter and the
 *  week/month rolling-window checks below. */
function isAvailableOn(entry, date) {
  const day = startOfDay(date);
  const a = entry.availability;
  if (!a) return false;

  switch (a.kind) {
    case "always":
      return true;

    case "recurring": {
      const r = a.recurrence;
      if (r.validFrom && day < startOfDay(new Date(r.validFrom))) return false;
      if (r.validTo && day > startOfDay(new Date(r.validTo))) return false;
      if (r.frequency === "weekly") {
        return r.daysOfWeek.includes(DOW_ABBR[day.getDay()]);
      }
      if (r.frequency === "monthly") {
        const nthDate = nthWeekdayOfMonth(day.getFullYear(), day.getMonth(), r.nth, r.dayOfWeek);
        return !!nthDate && startOfDay(nthDate).getTime() === day.getTime();
      }
      return false;
    }

    case "seasonal": {
      const md = monthDayString(day);
      const { startMonthDay, endMonthDay } = a.season;
      return md >= startMonthDay && md <= endMonthDay;
    }

    case "scheduled":
      return a.occurrences.some((o) => startOfDay(new Date(o.start)).getTime() === day.getTime());

    default:
      return false;
  }
}

/** Next date (>= fromDate) this entry is available/happening.
 *  Returns { date, label, ongoing } or null if there's no future occurrence. */
function nextOccurrence(entry, fromDate) {
  const from = startOfDay(fromDate);
  const a = entry.availability;
  if (!a) return null;

  if (a.kind === "always") {
    return { date: from, label: a.hours || "Open now", ongoing: true };
  }

  if (a.kind === "seasonal") {
    if (isAvailableOn(entry, from)) {
      return { date: from, label: a.hours || "In season", ongoing: true };
    }
    for (let y = from.getFullYear(); y <= from.getFullYear() + 1; y++) {
      const candidate = new Date(`${y}-${a.season.startMonthDay}`);
      if (candidate >= from) return { date: candidate, label: a.hours || "Season starts", ongoing: false };
    }
    return null;
  }

  if (a.kind === "scheduled") {
    const upcoming = a.occurrences
      .map((o) => ({ date: new Date(o.start), label: o.label || entry.name }))
      .filter((o) => o.date >= from)
      .sort((x, y) => x.date - y.date);
    return upcoming[0] || null;
  }

  if (a.kind === "recurring") {
    for (let i = 0; i < 366; i++) {
      const candidate = addDays(from, i);
      if (isAvailableOn(entry, candidate)) {
        return { date: candidate, label: a.hours || "Available", ongoing: i === 0 };
      }
    }
    return null;
  }

  return null;
}

/** scope: "today" | "week" | "month" | "upcoming" | null (null = no filter). */
function matchesTimeScope(entry, scope, today) {
  if (!scope) return true;
  const from = startOfDay(today);

  if (scope === "upcoming") return nextOccurrence(entry, from) !== null;

  const windowDays = scope === "today" ? 1 : scope === "week" ? 7 : scope === "month" ? 30 : null;
  if (!windowDays) return true;

  for (let i = 0; i < windowDays; i++) {
    if (isAvailableOn(entry, addDays(from, i))) return true;
  }
  return false;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Human-readable availability string for cards/popups. */
function describeAvailability(entry) {
  const a = entry.availability;
  if (!a) return "";
  if (a.hours) return a.hours;

  switch (a.kind) {
    case "always":
      return "Open";
    case "recurring": {
      const r = a.recurrence;
      if (r.frequency === "weekly") {
        const time = r.timeRange ? ` ${r.timeRange.start}–${r.timeRange.end}` : "";
        return `Every ${r.daysOfWeek.join("/")}${time}`;
      }
      if (r.frequency === "monthly") return `${ordinal(r.nth)} ${r.dayOfWeek} of the month`;
      return "";
    }
    case "seasonal":
      return `${a.season.startMonthDay} – ${a.season.endMonthDay}`;
    case "scheduled": {
      const next = nextOccurrence(entry, new Date());
      return next ? next.label : "No upcoming dates";
    }
    default:
      return "";
  }
}
