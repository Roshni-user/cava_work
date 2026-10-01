import { BookingStatus, Prisma } from "@/generated/prisma/client";
import {
  CalendarError,
  createConsultationEvent,
  deleteConsultationEvent,
  overlappingBusy,
  overlapsBusy,
} from "@/lib/booking/calendar";
import { EmailError, sendBookingConfirmation } from "@/lib/booking/email";
import {
  addCalendarDays,
  consultationTimeZone,
  dateKey,
  matchingSlot,
  parseDateKey,
  slotsForDate,
  upcomingDateKeys,
  zonedDateTimeToUtc,
  type ConsultationSlot,
} from "@/lib/booking/schedule";
import { prisma } from "@/lib/prisma";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BookingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export type BookingResult = {
  emailSent: boolean;
  message: string;
  booking: {
    dateLabel: string;
    timeLabel: string;
    meetUrl: string;
  };
};

function dayRange(date: string, timeZone: string): { start: Date; end: Date } | null {
  const parsed = parseDateKey(date);
  if (!parsed) {
    return null;
  }

  const start = zonedDateTimeToUtc(parsed.year, parsed.month, parsed.day, 0, 0, timeZone);
  const next = addCalendarDays(parsed.year, parsed.month, parsed.day, 1);
  const end = zonedDateTimeToUtc(next.year, next.month, next.day, 0, 0, timeZone);
  return { start, end };
}

async function takenStarts(rangeStart: Date, rangeEnd: Date): Promise<Set<number>> {
  const rows = await prisma.consultation.findMany({
    where: {
      bookingStatus: BookingStatus.BOOKED,
      slotStart: { gte: rangeStart, lt: rangeEnd },
    },
    select: { slotStart: true },
  });
  const taken = new Set<number>();

  for (const row of rows) {
    if (row.slotStart) {
      taken.add(row.slotStart.getTime());
    }
  }

  return taken;
}

export async function listConsultationDates(now = new Date()): Promise<{
  timeZone: string;
  dates: string[];
}> {
  return {
    timeZone: consultationTimeZone(),
    dates: upcomingDateKeys(consultationTimeZone(), now),
  };
}

export async function listConsultationSlots(
  date: string,
  now = new Date(),
): Promise<{ timeZone: string; date: string; slots: ConsultationSlot[] }> {
  const timeZone = consultationTimeZone();
  if (!parseDateKey(date)) {
    throw new BookingError("Choose a valid consultation date.", 400);
  }

  const range = dayRange(date, timeZone);
  if (!range) {
    throw new BookingError("Choose a valid consultation date.", 400);
  }

  const taken = await takenStarts(range.start, range.end);
  const slots = slotsForDate(date, timeZone, now, taken);
  if (!slots) {
    throw new BookingError("Choose a valid consultation date.", 400);
  }

  let busy: Array<{ start: number; end: number }> | null = null;
  try {
    busy = await overlappingBusy(range.start, range.end);
  } catch (error) {
    if (error instanceof CalendarError) {
      throw new BookingError("Available times could not be loaded. Please try again.", 503);
    }
    throw error;
  }

  const ranges = busy ?? [];
  const withCalendar = busy
    ? slots.map((slot) => {
        if (slot.state === "unavailable") {
          return slot;
        }
        const start = new Date(slot.start).getTime();
        const end = new Date(slot.end).getTime();
        return overlapsBusy(start, end, ranges) ? { ...slot, state: "unavailable" as const } : slot;
      })
    : slots;

  return {
    timeZone,
    date,
    slots: withCalendar,
  };
}

async function releaseClaim(consultationId: string): Promise<void> {
  await prisma.consultation.update({
    where: { id: consultationId },
    data: {
      slotStart: null,
      slotEnd: null,
      googleEventId: null,
      meetUrl: null,
      bookingStatus: BookingStatus.PENDING,
      bookedAt: null,
    },
  });
}

export async function bookConsultation(body: unknown, now = new Date()): Promise<BookingResult> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new BookingError("Request body must be a JSON object.", 400);
  }

  const consultationId =
    "consultationId" in body && typeof body.consultationId === "string" ? body.consultationId.trim() : "";
  const slotStart =
    "slotStart" in body && typeof body.slotStart === "string" ? body.slotStart.trim() : "";

  if (!UUID_PATTERN.test(consultationId)) {
    throw new BookingError("This consultation could not be found. Submit the form again.", 404);
  }
  if (!slotStart) {
    throw new BookingError("Select a time slot before confirming.", 400);
  }

  const timeZone = consultationTimeZone();
  const slot = matchingSlot(slotStart, timeZone, now);
  if (!slot) {
    throw new BookingError("Unable to complete the booking. Please try another time slot.", 409);
  }

  const day = dateKey(slot.start, timeZone);
  const range = dayRange(day, timeZone);
  if (!range) {
    throw new BookingError("Unable to complete the booking. Please try another time slot.", 409);
  }

  try {
    const busy = await overlappingBusy(range.start, range.end);
    if (busy && overlapsBusy(slot.start.getTime(), slot.end.getTime(), busy)) {
      throw new BookingError("Unable to complete the booking. Please try another time slot.", 409);
    }
  } catch (error) {
    if (error instanceof BookingError) {
      throw error;
    }
    if (error instanceof CalendarError) {
      throw new BookingError(error.message, error.status);
    }
    throw error;
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
  });

  if (!consultation) {
    throw new BookingError("This consultation could not be found. Submit the form again.", 404);
  }
  if (consultation.bookingStatus === BookingStatus.BOOKED) {
    throw new BookingError("This consultation is already booked.", 409);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const taken = await tx.consultation.findFirst({
        where: {
          bookingStatus: BookingStatus.BOOKED,
          slotStart: slot.start,
          id: { not: consultationId },
        },
        select: { id: true },
      });

      if (taken) {
        throw new BookingError("Unable to complete the booking. Please try another time slot.", 409);
      }

      const claimed = await tx.consultation.updateMany({
        where: {
          id: consultationId,
          bookingStatus: BookingStatus.PENDING,
        },
        data: {
          slotStart: slot.start,
          slotEnd: slot.end,
          bookingStatus: BookingStatus.BOOKED,
          bookedAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw new BookingError("Unable to complete the booking. Please try another time slot.", 409);
      }
    });
  } catch (error) {
    if (error instanceof BookingError) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BookingError("Unable to complete the booking. Please try another time slot.", 409);
    }
    throw error;
  }

  let eventId = "";

  try {
    const event = await createConsultationEvent({
      consultationId,
      name: consultation.name,
      email: consultation.email,
      phone: consultation.phone,
      companyName: consultation.companyName,
      message: consultation.message,
      start: slot.start,
      end: slot.end,
      timeZone,
    });
    eventId = event.eventId;

    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        googleEventId: event.eventId,
        meetUrl: event.meetUrl,
      },
    });

    let emailSent = true;
    try {
      await sendBookingConfirmation({
        name: consultation.name,
        email: consultation.email,
        companyName: consultation.companyName,
        dateLabel: slot.dateLabel,
        timeLabel: slot.label,
        meetUrl: event.meetUrl,
      });
    } catch (error) {
      if (!(error instanceof EmailError)) {
        console.error("Confirmation email failed.");
      }
      emailSent = false;
    }

    return {
      emailSent,
      message: emailSent
        ? "Your consultation has been booked successfully."
        : "Your consultation has been booked successfully. The confirmation email could not be sent.",
      booking: {
        dateLabel: slot.dateLabel,
        timeLabel: slot.label,
        meetUrl: event.meetUrl,
      },
    };
  } catch (error) {
    if (eventId) {
      await deleteConsultationEvent(eventId);
    }
    await releaseClaim(consultationId).catch(() => undefined);

    if (error instanceof CalendarError || error instanceof BookingError) {
      throw new BookingError(
        error instanceof CalendarError ? error.message : error.message,
        error.status,
      );
    }

    throw new BookingError("Unable to complete the booking. Please try another time slot.", 502);
  }
}

export function logBookingError(error: unknown): void {
  const message = error instanceof Error ? error.message : "Unexpected booking error.";
  console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));
}
