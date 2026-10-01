import { NextResponse } from "next/server";
import { listExhibitorPreviews } from "@/lib/exhibitor-catalogue";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const exhibitors = await listExhibitorPreviews();

    return NextResponse.json({ exhibitors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Exhibitor catalogue query failed.";
    console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]"));

    return NextResponse.json(
      { message: "Exhibitor catalogue is unavailable." },
      { status: 500 },
    );
  }
}
