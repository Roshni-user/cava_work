const SLOT_MINUTES = 30;
const DAY_START_MINUTES = 10 * 60;
const DAY_END_MINUTES = 17 * 60;
const HORIZON_DAYS = 14;

export type SlotState = "available" | "unavailable";

export type ConsultationSlot = {
  start: string;
  end: string;
  label: string;
  state: SlotState;
};

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

export function consultationTimeZone(): string {
  const configured = process.env.CONSULTATION_TIMEZONE?.trim();
  return configured && configured.length > 0 ? configured : "Asia/Kolkata";
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    weekday: value("weekday"),
  };
}

export function dateKeyFromParts(parts: Pick<ZonedParts, "year" | "month" | "day">): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function dateKey(date: Date, timeZone: string): string {
  return dateKeyFromParts(zonedParts(date, timeZone));
}

function offsetMs(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const wall = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  const instant = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  );
  return wall - instant;
}

export function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const corrected = new Date(guess.getTime() - offsetMs(guess, timeZone));
  const second = new Date(guess.getTime() - offsetMs(corrected, timeZone));
  return second;
}

export function isWeekday(weekday: string): boolean {
  return weekday !== "Sat" && weekday !== "Sun";
}

export function parseDateKey(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function slotLabel(start: Date, end: Date, timeZone: string): string {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${format.format(start)}–${format.format(end)}`;
}

export function formatSlotDate(start: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(start);
}

export function slotsForDate(
  dateKeyValue: string,
  timeZone: string,
  now: Date,
  takenStarts: ReadonlySet<number>,
): ConsultationSlot[] | null {
  const parsed = parseDateKey(dateKeyValue);
  if (!parsed) {
    return null;
  }

  const noon = zonedDateTimeToUtc(parsed.year, parsed.month, parsed.day, 12, 0, timeZone);
  const parts = zonedParts(noon, timeZone);
  if (!isWeekday(parts.weekday) || dateKey(noon, timeZone) !== dateKeyValue) {
    return [];
  }

  const today = zonedParts(now, timeZone);
  const todayKey = dateKeyFromParts(today);
  const horizon = addCalendarDays(today.year, today.month, today.day, HORIZON_DAYS);
  const horizonKey = dateKeyFromParts(horizon);
  if (dateKeyValue < todayKey || dateKeyValue > horizonKey) {
    return [];
  }

  const slots: ConsultationSlot[] = [];

  for (let minute = DAY_START_MINUTES; minute + SLOT_MINUTES <= DAY_END_MINUTES; minute += SLOT_MINUTES) {
    const hour = Math.floor(minute / 60);
    const mins = minute % 60;
    const start = zonedDateTimeToUtc(parsed.year, parsed.month, parsed.day, hour, mins, timeZone);
    const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000);
    const past = start.getTime() <= now.getTime();
    const taken = takenStarts.has(start.getTime());

    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: slotLabel(start, end, timeZone),
      state: past || taken ? "unavailable" : "available",
    });
  }

  return slots;
}

export function addCalendarDays(
  year: number,
  month: number,
  day: number,
  days: number,
): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function upcomingDateKeys(timeZone: string, now: Date): string[] {
  const keys: string[] = [];
  const start = zonedParts(now, timeZone);

  for (let offset = 0; offset <= HORIZON_DAYS; offset += 1) {
    const next = addCalendarDays(start.year, start.month, start.day, offset);
    const noon = zonedDateTimeToUtc(next.year, next.month, next.day, 12, 0, timeZone);
    if (!isWeekday(zonedParts(noon, timeZone).weekday)) {
      continue;
    }

    const key = dateKeyFromParts(next);
    const slots = slotsForDate(key, timeZone, now, new Set());
    if (slots?.some((slot) => slot.state === "available")) {
      keys.push(key);
    }
  }

  return keys;
}

export function matchingSlot(
  slotStart: string,
  timeZone: string,
  now: Date,
): { start: Date; end: Date; label: string; dateLabel: string } | null {
  const start = new Date(slotStart);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const key = dateKey(start, timeZone);
  const slots = slotsForDate(key, timeZone, now, new Set());
  const match = slots?.find((slot) => new Date(slot.start).getTime() === start.getTime());
  if (!match || match.state !== "available") {
    return null;
  }

  return {
    start,
    end: new Date(match.end),
    label: match.label,
    dateLabel: formatSlotDate(start, timeZone),
  };
}
