const JERUSALEM_TZ = "Asia/Jerusalem";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type JerusalemParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getJerusalemParts(instant: Date): JerusalemParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: JERUSALEM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value ?? "0";
    return Number(value);
  };

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

/** Calendar date YYYY-MM-DD in Asia/Jerusalem for the given instant. */
export function jerusalemIsoDateFromInstant(instant: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: JERUSALEM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(instant);
}

/** Today's calendar date in Asia/Jerusalem as YYYY-MM-DD. */
export function todayJerusalemIso(instant: Date = new Date()): string {
  return jerusalemIsoDateFromInstant(instant);
}

/**
 * UTC instant for 00:00:00 on the given Jerusalem calendar date (YYYY-MM-DD).
 */
export function startOfDayJerusalem(isoDate: string): Date {
  if (!ISO_DATE_PATTERN.test(isoDate)) {
    throw new Error("Invalid Jerusalem calendar date; expected YYYY-MM-DD");
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  const searchStart = Date.UTC(year, month - 1, day - 1, 20, 0, 0);
  const searchEnd = searchStart + 48 * 60 * 60 * 1000;

  for (let ms = searchStart; ms <= searchEnd; ms += 60_000) {
    const candidate = new Date(ms);
    const parts = getJerusalemParts(candidate);
    if (
      parts.year === year &&
      parts.month === month &&
      parts.day === day &&
      parts.hour === 0 &&
      parts.minute === 0
    ) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve Jerusalem start of day for ${isoDate}`);
}

/** True when `effectiveFrom` is on or after today's Jerusalem calendar date. */
export function isEffectiveFromNotBeforeTodayJerusalem(
  effectiveFrom: Date,
  now: Date = new Date(),
): boolean {
  const todayStart = startOfDayJerusalem(todayJerusalemIso(now));
  return effectiveFrom.getTime() >= todayStart.getTime();
}
