import { NextResponse } from "next/server";
import { BookingError, bookConsultation, logBookingError } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    const result = await bookConsultation(body);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }

    logBookingError(error);
    return NextResponse.json(
      { success: false, message: "Unable to complete the booking. Please try another time slot." },
      { status: 500 },
    );
  }
}
