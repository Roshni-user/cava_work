import { NextResponse } from "next/server";
import {
  ConsultationValidationError,
  createConsultation,
  logConsultationError,
  parseConsultation,
  publicConsultationError,
} from "@/lib/consultations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Request body must be valid JSON.",
      },
      { status: 400 },
    );
  }

  try {
    const input = parseConsultation(body);
    const consultationId = await createConsultation(input);

    return NextResponse.json(
      {
        success: true,
        message: "Consultation request received.",
        consultationId,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ConsultationValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          errors: error.fields,
        },
        { status: error.status },
      );
    }

    logConsultationError(error);

    return NextResponse.json(
      {
        success: false,
        message: publicConsultationError(error),
      },
      { status: 500 },
    );
  }
}
