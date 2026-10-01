"use client";

import { useEffect, useState } from "react";

type Slot = {
  start: string;
  end: string;
  label: string;
  state: "available" | "unavailable";
};

type BookingDetails = {
  dateLabel: string;
  timeLabel: string;
  meetUrl: string;
  emailNote: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageFrom(payload: unknown, fallback: string): string {
  const message = isRecord(payload) && typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message || message.length > 200 || /prisma|postgres|stack|econn|database|secret|private key/i.test(message)) {
    return fallback;
  }
  return message;
}

function parseSlots(value: unknown): Slot[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    if (
      typeof item.start !== "string" ||
      typeof item.end !== "string" ||
      typeof item.label !== "string" ||
      (item.state !== "available" && item.state !== "unavailable")
    ) {
      return [];
    }
    const slot: Slot = {
      start: item.start,
      end: item.end,
      label: item.label,
      state: item.state,
    };
    return [slot];
  });
}

function dateLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function ConsultationBooking({
  consultationId,
  onRestart,
}: {
  consultationId: string;
  onRestart: () => void;
}) {
  const [dates, setDates] = useState<string[]>([]);
  const [datesStatus, setDatesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsStatus, setSlotsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<BookingDetails | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/consult/slots", { signal: controller.signal, headers: { accept: "application/json" } })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || !isRecord(payload) || !Array.isArray(payload.dates)) {
          throw new Error(messageFrom(payload, "Available times could not be loaded. Please try again."));
        }
        const nextDates = payload.dates.filter((item): item is string => typeof item === "string");
        setDates(nextDates);
        setSelectedDate(nextDates[0] ?? null);
        setSlotsStatus(nextDates[0] ? "loading" : "idle");
        setDatesStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setDatesStatus("error");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/consult/slots?date=${encodeURIComponent(selectedDate)}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    })
      .then(async (response) => {
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok || !isRecord(payload) || !Array.isArray(payload.slots)) {
          throw new Error(messageFrom(payload, "Available times could not be loaded. Please try again."));
        }

        setSlots(parseSlots(payload.slots));
        setSlotsStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setSlotsStatus("error");
      });

    return () => controller.abort();
  }, [selectedDate]);

  async function confirmBooking() {
    if (!selectedStart) {
      setBookingError("Select a time slot before confirming.");
      return;
    }

    setBooking(true);
    setBookingError(null);

    try {
      const response = await fetch("/api/consult/book", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ consultationId, slotStart: selectedStart }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const bookingPayload = isRecord(payload) ? payload.booking : null;
      const succeeded =
        response.ok &&
        isRecord(payload) &&
        payload.success === true &&
        isRecord(bookingPayload) &&
        typeof bookingPayload.dateLabel === "string" &&
        typeof bookingPayload.timeLabel === "string" &&
        typeof bookingPayload.meetUrl === "string";

      if (!succeeded || !isRecord(bookingPayload)) {
        setBookingError(
          messageFrom(payload, "Unable to complete the booking. Please try another time slot."),
        );
        if (selectedDate) {
          setSelectedDate(selectedDate);
          setSlotsStatus("loading");
          const refresh = await fetch(`/api/consult/slots?date=${encodeURIComponent(selectedDate)}`, {
            headers: { accept: "application/json" },
          });
          const refreshed: unknown = await refresh.json().catch(() => null);
          if (refresh.ok && isRecord(refreshed) && Array.isArray(refreshed.slots)) {
            setSlots(parseSlots(refreshed.slots));
            setSlotsStatus("ready");
            setSelectedStart(null);
          } else {
            setSlotsStatus("error");
          }
        }
        return;
      }

      setConfirmed({
        dateLabel: String(bookingPayload.dateLabel),
        timeLabel: String(bookingPayload.timeLabel),
        meetUrl: String(bookingPayload.meetUrl),
        emailNote:
          isRecord(payload) && payload.emailSent === false
            ? "The confirmation email could not be sent. Use the Meet link below."
            : null,
      });
    } catch {
      setBookingError("Unable to complete the booking. Please try another time slot.");
    } finally {
      setBooking(false);
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-line bg-background p-5 shadow-sm sm:p-7" role="status">
        <h3 className="text-xl font-semibold tracking-tight text-ink">
          Your consultation has been booked successfully.
        </h3>
        <dl className="mt-5 grid gap-3 text-sm">
          <div>
            <dt className="font-medium text-ink">Date</dt>
            <dd className="mt-1 text-muted">{confirmed.dateLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Time</dt>
            <dd className="mt-1 text-muted">{confirmed.timeLabel}</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Google Meet</dt>
            <dd className="mt-1">
              <a
                href={confirmed.meetUrl}
                className="break-all font-medium text-accent underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {confirmed.meetUrl}
              </a>
            </dd>
          </div>
        </dl>
        {confirmed.emailNote ? <p className="mt-4 text-sm leading-6 text-red-800">{confirmed.emailNote}</p> : null}
      </div>
    );
  }

  const availableCount = slots.filter((slot) => slot.state === "available").length;

  return (
    <div className="rounded-2xl border border-line bg-background p-5 shadow-sm sm:p-7" aria-busy={booking}>
      <h3 className="text-xl font-semibold tracking-tight text-ink">Choose a consultation time</h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Weekdays, 10:00 AM to 5:00 PM, in 30-minute slots. Select a date, then one open time.
      </p>

      {datesStatus === "loading" ? (
        <p role="status" className="mt-5 text-sm text-muted">
          Loading available slots
        </p>
      ) : null}
      {datesStatus === "error" ? (
        <p role="alert" className="mt-5 text-sm text-red-800">
          Available times could not be loaded. Please try again.
        </p>
      ) : null}
      {datesStatus === "ready" && dates.length === 0 ? (
        <p role="status" className="mt-5 text-sm text-muted">
          No available slots.
        </p>
      ) : null}

      {dates.length > 0 ? (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Consultation dates">
          {dates.map((date) => {
            const selected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={booking}
                onClick={() => {
                  setSelectedDate(date);
                  setSlots([]);
                  setSelectedStart(null);
                  setBookingError(null);
                  setSlotsStatus("loading");
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-70 ${
                  selected
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-card text-ink hover:border-accent"
                }`}
              >
                {dateLabel(date)}
              </button>
            );
          })}
        </div>
      ) : null}

      {slotsStatus === "loading" ? (
        <p role="status" className="mt-5 text-sm text-muted">
          Loading available slots
        </p>
      ) : null}
      {slotsStatus === "error" ? (
        <p role="alert" className="mt-5 text-sm text-red-800">
          Available times could not be loaded. Please try again.
        </p>
      ) : null}
      {slotsStatus === "ready" && availableCount === 0 ? (
        <p role="status" className="mt-5 text-sm text-muted">
          No available slots for this date.
        </p>
      ) : null}
      {slotsStatus === "ready" && slots.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3" role="listbox" aria-label="Consultation times">
          {slots.map((slot) => {
            const selected = slot.start === selectedStart;
            const unavailable = slot.state === "unavailable";
            return (
              <button
                key={slot.start}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={unavailable}
                disabled={unavailable || booking}
                onClick={() => setSelectedStart(slot.start)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                  selected
                    ? "border-accent bg-accent text-white"
                    : unavailable
                      ? "border-line bg-background text-muted line-through"
                      : "border-line bg-card text-ink hover:border-accent"
                }`}
              >
                <span className="block">{slot.label}</span>
                <span className="mt-1 block text-xs font-normal opacity-80">
                  {unavailable ? "Unavailable" : selected ? "Selected" : "Available"}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {bookingError ? (
        <p role="alert" className="mt-4 text-sm leading-6 text-red-800">
          {bookingError}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={booking || !selectedStart}
          onClick={() => void confirmBooking()}
          className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {booking ? "Booking…" : "Confirm booking"}
        </button>
        <button
          type="button"
          disabled={booking}
          onClick={onRestart}
          className="rounded-full border border-line bg-card px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-accent disabled:opacity-70"
        >
          Edit details
        </button>
      </div>
    </div>
  );
}
