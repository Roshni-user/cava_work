import { NextResponse } from "next/server";
import { BookingError, listConsultationDates, listConsultationSlots, logBookingError } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date")?.trim() ?? "";

  try {
    if (!date) {
      const dates = await listConsultationDates();
      return NextResponse.json(dates);
    }

    const slots = await listConsultationSlots(date);
    return NextResponse.json(slots);
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    logBookingError(error);
    return NextResponse.json(
      { message: "Available times could not be loaded. Please try again." },
      { status: 500 },
    );
  }
}
